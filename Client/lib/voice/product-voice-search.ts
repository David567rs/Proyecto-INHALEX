export type VoiceSearchStatus =
  | "idle"
  | "starting"
  | "listening"
  | "processing"
  | "success"
  | "error"

export interface VoiceSearchState {
  status: VoiceSearchStatus
  message: string
}

interface VoiceRecognitionResult {
  isFinal: boolean
  readonly [index: number]: { transcript: string }
}

interface VoiceRecognitionResultEvent {
  resultIndex: number
  results: ArrayLike<VoiceRecognitionResult>
}

// SpeechRecognition is still absent from the standard TypeScript DOM types.
// Keep the adapter narrow rather than assuming experimental browser features.
export interface VoiceRecognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onstart: (() => void) | null
  onspeechend: (() => void) | null
  onresult: ((event: VoiceRecognitionResultEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onnomatch: (() => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

export interface VoiceRecognitionConstructor {
  new (): VoiceRecognition
}

export interface VoiceRecognitionBrowser {
  SpeechRecognition?: VoiceRecognitionConstructor
  webkitSpeechRecognition?: VoiceRecognitionConstructor
}

export const VOICE_SEARCH_MAX_DURATION_MS = 15_000

export const INITIAL_VOICE_SEARCH_STATE: VoiceSearchState = {
  status: "idle",
  message: "Di el nombre de un aroma, por ejemplo: ‘busca lavanda’.",
}

export function getVoiceRecognitionConstructor(
  browser: VoiceRecognitionBrowser,
): VoiceRecognitionConstructor | undefined {
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition
}

export function normalizeVoiceProductQuery(transcript: string): string {
  const original = transcript
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[¿¡“”"\s]+|[.!?¿¡“”"\s]+$/g, "")
    .trim()

  // Remove wrappers only after an explicit command. A product whose actual
  // name starts with “Aroma de…” remains searchable when spoken on its own.
  const withoutCommand = original.replace(
    /^(?:por favor[, ]+)?(?:busca(?:r|me)?|búscame|mu[eé]strame|mostrar(?:me)?)\s+/iu,
    "",
  )
  if (withoutCommand === original) return original.slice(0, 200)

  const query = withoutCommand
    .replace(/^(?:(?:el|un|los|unos)\s+)?aromas?\s+de\s+/iu, "")
    .replace(/[, ]+por favor$/iu, "")
    .trim()

  return (query || original).slice(0, 200)
}

export function getVoiceSearchErrorMessage(code: string): string {
  switch (code) {
    case "unsupported":
      return "Este navegador no permite buscar por voz. Puedes escribir el aroma en el buscador."
    case "insecure":
      return "El micrófono requiere una conexión segura. Puedes seguir buscando por escrito."
    case "not-allowed":
    case "service-not-allowed":
      return "El navegador no permitió usar el micrófono o el reconocimiento de voz. Revisa los permisos del sitio o escribe el aroma."
    case "audio-capture":
      return "No pudimos acceder al micrófono. Comprueba que esté conectado y disponible, o busca por escrito."
    case "network":
      return "No pudimos conectar con el servicio de voz. Revisa tu conexión o escribe el aroma."
    case "no-speech":
      return "No entendimos ningún aroma. Inténtalo otra vez o escribe su nombre."
    case "timeout":
      return "Se terminó el tiempo de escucha. El micrófono se detuvo; puedes intentarlo otra vez."
    case "language-not-supported":
      return "Este navegador no tiene disponible el reconocimiento en español. Puedes buscar por escrito."
    case "aborted":
      return "La búsqueda por voz se detuvo. Puedes intentarlo otra vez o escribir el aroma."
    default:
      return "No pudimos iniciar la búsqueda por voz. Inténtalo otra vez o busca por escrito."
  }
}

function startErrorCode(error: unknown): string {
  if (!(error instanceof Error)) return "unknown"
  if (error.name === "NotAllowedError" || error.name === "SecurityError") {
    return "not-allowed"
  }
  if (error.name === "NotFoundError" || error.name === "NotReadableError") {
    return "audio-capture"
  }
  return "unknown"
}

export function createProductVoiceSearch(options: {
  onState: (state: VoiceSearchState) => void
  onQuery: (query: string) => void
}) {
  let active: VoiceRecognition | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  let disposed = false

  const release = () => {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
    const recognition = active
    active = null
    if (!recognition) return
    recognition.onstart = null
    recognition.onspeechend = null
    recognition.onresult = null
    recognition.onerror = null
    recognition.onnomatch = null
    recognition.onend = null
    try {
      recognition.abort()
    } catch {
      // Some engines throw when recognition already ended. Handlers are gone.
    }
  }

  const fail = (code: string) => {
    release()
    if (!disposed) {
      options.onState({
        status: "error",
        message: getVoiceSearchErrorMessage(code),
      })
    }
  }

  return {
    start(Recognition: VoiceRecognitionConstructor | undefined, secure = true) {
      if (disposed || active) return
      if (!secure) return fail("insecure")
      if (!Recognition) return fail("unsupported")

      try {
        const recognition = new Recognition()
        active = recognition
        recognition.lang = "es-MX"
        recognition.continuous = false
        recognition.interimResults = false
        recognition.maxAlternatives = 1
        const isCurrent = () => !disposed && active === recognition
        let processing = false

        recognition.onstart = () => {
          if (isCurrent() && !processing) {
            options.onState({
              status: "listening",
              message: "Te escucho. Di el nombre del aroma.",
            })
          }
        }
        recognition.onspeechend = () => {
          if (!isCurrent() || processing) return
          processing = true
          options.onState({
            status: "processing",
            message: "Buscando lo que dijiste…",
          })
          try {
            recognition.stop()
          } catch {
            fail("unknown")
          }
        }
        recognition.onresult = (event) => {
          if (!isCurrent()) return
          for (
            let index = event.resultIndex;
            index < event.results.length;
            index += 1
          ) {
            const result = event.results[index]
            if (!result?.isFinal) continue
            const query = normalizeVoiceProductQuery(
              result[0]?.transcript ?? "",
            )
            if (!query) return fail("no-speech")
            release()
            options.onState({
              status: "success",
              message:
                "Listo. Revisa los resultados o ajusta la búsqueda por escrito.",
            })
            options.onQuery(query)
            return
          }
        }
        recognition.onerror = (event) => {
          if (isCurrent()) fail(event.error)
        }
        recognition.onnomatch = recognition.onend = () => {
          if (isCurrent()) fail("no-speech")
        }

        options.onState({
          status: "starting",
          message: "Esperando acceso al micrófono…",
        })
        timer = setTimeout(() => {
          if (isCurrent()) fail("timeout")
        }, VOICE_SEARCH_MAX_DURATION_MS)
        recognition.start()
      } catch (error) {
        fail(startErrorCode(error))
      }
    },
    cancel() {
      release()
      if (!disposed) options.onState(INITIAL_VOICE_SEARCH_STATE)
    },
    dispose() {
      disposed = true
      release()
    },
  }
}
