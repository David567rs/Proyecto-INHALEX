"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Loader2, Mic, Square, X } from "lucide-react"
import {
  createProductVoiceSearch,
  getVoiceRecognitionConstructor,
  INITIAL_VOICE_SEARCH_STATE,
  type VoiceRecognitionBrowser,
  type VoiceSearchState,
} from "@/lib/voice/product-voice-search"

export function VoiceProductSearch({
  onQuery,
  onClose,
}: {
  onQuery: (query: string) => void
  onClose: () => void
}) {
  const [state, setState] = useState<VoiceSearchState>(
    INITIAL_VOICE_SEARCH_STATE,
  )
  const controllerRef = useRef<ReturnType<
    typeof createProductVoiceSearch
  > | null>(null)
  const helpId = useId()
  const active = ["starting", "listening", "processing"].includes(state.status)

  useEffect(() => {
    const handleHidden = () => {
      if (document.hidden) controllerRef.current?.cancel()
    }
    document.addEventListener("visibilitychange", handleHidden)
    return () => {
      document.removeEventListener("visibilitychange", handleHidden)
      controllerRef.current?.dispose()
      controllerRef.current = null
    }
  }, [])

  const start = () => {
    controllerRef.current?.dispose()
    const controller = createProductVoiceSearch({ onState: setState, onQuery })
    controllerRef.current = controller
    controller.start(
      getVoiceRecognitionConstructor(
        window as Window & VoiceRecognitionBrowser,
      ),
      window.isSecureContext,
    )
  }

  return (
    <section
      aria-label="Buscar un aroma por voz"
      className="border-b border-emerald-100 bg-emerald-50/65 px-4 py-3"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold text-emerald-900">Buscar por voz</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar búsqueda por voz"
          className="-mr-1 rounded-md p-1 text-muted-foreground hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <p id={helpId} className="mt-1 text-xs leading-5 text-emerald-950/75">
        Al activar el micrófono, tu navegador puede enviar el audio a su
        servicio de reconocimiento en línea. INHALEX no guarda la grabación ni
        un historial de lo que dictas. También puedes escribir tu búsqueda.
      </p>
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="mt-2 text-xs leading-5 text-foreground"
      >
        {state.message}
      </p>
      <button
        type="button"
        aria-describedby={helpId}
        aria-label={
          active
            ? "Detener búsqueda por voz"
            : "Activar micrófono para buscar un aroma"
        }
        onClick={() => (active ? controllerRef.current?.cancel() : start())}
        className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {active ? (
          state.status === "processing" ? (
            <Loader2
              className="h-4 w-4 motion-safe:animate-spin"
              aria-hidden="true"
            />
          ) : (
            <Square className="h-3.5 w-3.5" aria-hidden="true" />
          )
        ) : (
          <Mic className="h-4 w-4" aria-hidden="true" />
        )}
        {active ? "Detener" : "Activar micrófono"}
      </button>
    </section>
  )
}
