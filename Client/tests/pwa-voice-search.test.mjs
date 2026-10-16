import assert from "node:assert/strict"
import { test } from "node:test"
import {
  createProductVoiceSearch,
  getVoiceRecognitionConstructor,
  getVoiceSearchErrorMessage,
  normalizeVoiceProductQuery,
  VOICE_SEARCH_MAX_DURATION_MS,
} from "../lib/voice/product-voice-search.ts"

function fixture() {
  const states = []
  const queries = []
  const instances = []
  class Recognition {
    starts = 0
    stops = 0
    aborts = 0
    constructor() {
      instances.push(this)
    }
    start() {
      this.starts += 1
    }
    stop() {
      this.stops += 1
    }
    abort() {
      this.aborts += 1
    }
  }
  const controller = createProductVoiceSearch({
    onState: (state) => states.push(state),
    onQuery: (query) => queries.push(query),
  })
  return { controller, Recognition, states, queries, instances }
}

function result(transcript, isFinal = true) {
  return { resultIndex: 0, results: [{ isFinal, 0: { transcript } }] }
}

test("spoken commands become a query without removing accents or parts of names", () => {
  assert.equal(
    normalizeVoiceProductQuery("  ¡Busca un aroma de Lavanda! "),
    "Lavanda",
  )
  assert.equal(
    normalizeVoiceProductQuery("Muéstrame aroma de Eucalipto y Limón."),
    "Eucalipto y Limón",
  )
  assert.equal(
    normalizeVoiceProductQuery("Por favor, busca Menta, por favor."),
    "Menta",
  )
  assert.equal(normalizeVoiceProductQuery("Aroma de Mar"), "Aroma de Mar")
  assert.equal(
    normalizeVoiceProductQuery("busca Aromas del Bosque"),
    "Aromas del Bosque",
  )
  assert.equal(
    normalizeVoiceProductQuery("Rosa    de Castilla"),
    "Rosa de Castilla",
  )
  assert.equal(normalizeVoiceProductQuery("busca"), "busca")
  assert.equal(normalizeVoiceProductQuery("..."), "")
  assert.equal(normalizeVoiceProductQuery("a".repeat(300)).length, 200)
})

test("feature detection accepts standard and prefixed engines and unsupported browsers", () => {
  const { Recognition } = fixture()
  assert.equal(
    getVoiceRecognitionConstructor({ SpeechRecognition: Recognition }),
    Recognition,
  )
  assert.equal(
    getVoiceRecognitionConstructor({ webkitSpeechRecognition: Recognition }),
    Recognition,
  )
  assert.equal(getVoiceRecognitionConstructor({}), undefined)
})

test("microphone stays inactive until start and only a final result changes the query", () => {
  const { controller, Recognition, states, queries, instances } = fixture()
  assert.equal(instances.length, 0)
  controller.start(Recognition)
  const mic = instances[0]
  assert.equal(mic.starts, 1)
  assert.equal(mic.lang, "es-MX")
  assert.equal(mic.continuous, false)
  assert.equal(mic.interimResults, false)
  assert.equal(mic.maxAlternatives, 1)
  assert.equal(states.at(-1).status, "starting")
  mic.onstart()
  assert.equal(states.at(-1).status, "listening")
  mic.onresult(result("busca Lavanda", false))
  assert.deepEqual(queries, [])
  mic.onspeechend()
  assert.equal(states.at(-1).status, "processing")
  assert.equal(mic.stops, 1)
  const staleResult = mic.onresult
  mic.onresult(result("busca Lavanda"))
  assert.deepEqual(queries, ["Lavanda"])
  assert.equal(states.at(-1).status, "success")
  assert.equal(mic.aborts, 1)
  assert.equal(mic.onresult, null)
  staleResult(result("Menta"))
  assert.deepEqual(queries, ["Lavanda"])
  controller.dispose()
})

test("cancel and disposal abort capture and ignore late results after panel close", () => {
  const { controller, Recognition, states, queries, instances } = fixture()
  controller.start(Recognition)
  const first = instances[0]
  const lateResult = first.onresult
  controller.cancel()
  assert.equal(first.aborts, 1)
  assert.equal(states.at(-1).status, "idle")
  lateResult(result("Lavanda"))
  controller.start(Recognition)
  const second = instances[1]
  const lateError = second.onerror
  const stateCount = states.length
  controller.dispose()
  assert.equal(second.aborts, 1)
  lateError({ error: "network" })
  controller.start(Recognition)
  assert.equal(states.length, stateCount)
  assert.equal(instances.length, 2)
  assert.deepEqual(queries, [])
})

test("permission, network, device and no-speech failures release the mic and allow retry", () => {
  const { controller, Recognition, states, queries, instances } = fixture()
  for (const code of [
    "not-allowed",
    "service-not-allowed",
    "network",
    "audio-capture",
    "no-speech",
    "language-not-supported",
    "aborted",
  ]) {
    controller.start(Recognition)
    const mic = instances.at(-1)
    const lateEnd = mic.onend
    mic.onerror({ error: code })
    assert.equal(states.at(-1).status, "error")
    assert.equal(states.at(-1).message, getVoiceSearchErrorMessage(code))
    assert.equal(mic.aborts, 1)
    lateEnd()
    assert.equal(states.at(-1).message, getVoiceSearchErrorMessage(code))
  }
  assert.deepEqual(queries, [])
  controller.dispose()
})

test("unsupported and insecure contexts do not create a microphone session", () => {
  const { controller, Recognition, states, instances } = fixture()
  controller.start(undefined)
  assert.equal(states.at(-1).message, getVoiceSearchErrorMessage("unsupported"))
  controller.start(Recognition, false)
  assert.equal(states.at(-1).message, getVoiceSearchErrorMessage("insecure"))
  assert.equal(instances.length, 0)
  controller.dispose()
})

test("an engine that ends without a result does not pretend a successful search", () => {
  const { controller, Recognition, states, queries, instances } = fixture()
  controller.start(Recognition)
  instances[0].onend()
  assert.equal(states.at(-1).message, getVoiceSearchErrorMessage("no-speech"))
  assert.deepEqual(queries, [])
  controller.dispose()
})

test("capture and pending permission are bounded to fifteen seconds", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] })
  const { controller, Recognition, states, instances } = fixture()
  controller.start(Recognition)
  context.mock.timers.tick(VOICE_SEARCH_MAX_DURATION_MS - 1)
  assert.equal(instances[0].aborts, 0)
  context.mock.timers.tick(1)
  assert.equal(instances[0].aborts, 1)
  assert.equal(states.at(-1).message, getVoiceSearchErrorMessage("timeout"))
  controller.dispose()
})

test("a synchronous permission exception preserves manual search and releases resources", () => {
  const { controller, Recognition, states, instances } = fixture()
  class DeniedRecognition extends Recognition {
    start() {
      throw new DOMException("denied", "NotAllowedError")
    }
  }
  controller.start(DeniedRecognition)
  assert.equal(instances[0].aborts, 1)
  assert.equal(states.at(-1).message, getVoiceSearchErrorMessage("not-allowed"))
  controller.dispose()
})
