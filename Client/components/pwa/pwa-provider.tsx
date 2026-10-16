"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react"
import { Download, RefreshCw, WifiOff } from "lucide-react"

interface InstallPrompt extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}
interface PwaContextValue {
  ready: boolean
  installed: boolean
  canInstall: boolean
  error: string
  offline: boolean
  install: () => Promise<void>
  send: (type: "SAVE_PUBLIC_CONTENT" | "CLEAR_PUBLIC_CONTENT") => Promise<{ count?: number; savedAt?: string }>
}
const PwaContext = createContext<PwaContextValue | null>(null)
const noSubscription = () => () => undefined
const clientSnapshot = () => true
const serverSnapshot = () => false
const offlineSnapshot = () => !navigator.onLine
function subscribeConnection(callback: () => void) {
  window.addEventListener("online", callback)
  window.addEventListener("offline", callback)
  return () => { window.removeEventListener("online", callback); window.removeEventListener("offline", callback) }
}
function installedSnapshot() {
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
}
function subscribeDisplay(callback: () => void) {
  const media = window.matchMedia("(display-mode: standalone)")
  media.addEventListener("change", callback)
  return () => media.removeEventListener("change", callback)
}

export function PwaProvider({ children }: { children: ReactNode }) {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [ready, setReady] = useState(false)
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null)
  const hydrated = useSyncExternalStore(noSubscription, clientSnapshot, serverSnapshot)
  const standalone = useSyncExternalStore(subscribeDisplay, installedSnapshot, serverSnapshot)
  const [didInstall, setDidInstall] = useState(false)
  const installed = standalone || didInstall
  const offline = useSyncExternalStore(subscribeConnection, offlineSnapshot, serverSnapshot)
  const [stale, setStale] = useState<string | null>(null)
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null)
  const [error, setError] = useState("")
  const applyingUpdate = useRef(false)
  const environmentError = hydrated && (!("serviceWorker" in navigator) || !window.isSecureContext)
    ? "La instalación y el modo sin conexión necesitan un navegador compatible y una conexión segura."
    : process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_PWA_DEV_ENABLED !== "true"
      ? "El modo instalable se activa al ejecutar la versión de producción de INHALEX." : ""

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) {
      return
    }
    if (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_PWA_DEV_ENABLED !== "true") {
      return
    }
    let disposed = false
    let current: ServiceWorkerRegistration | null = null
    const beforeInstall = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt) }
    const appInstalled = () => { setDidInstall(true); setPrompt(null) }
    const message = (event: MessageEvent) => {
      if (event.source !== navigator.serviceWorker.controller) return
      if (event.data?.type === "PWA_PUBLIC_STALE") setStale(event.data.savedAt || "")
    }
    const controllerChanged = () => {
      setReady(Boolean(navigator.serviceWorker.controller))
      if (applyingUpdate.current) { applyingUpdate.current = false; window.location.reload() }
    }
    const updateFound = () => {
      const worker = current?.installing
      if (!worker) return
      worker.addEventListener("statechange", () => {
        if (!disposed && worker.state === "installed" && navigator.serviceWorker.controller) setWaiting(current?.waiting || worker)
      })
    }
    const checkUpdate = () => { if (document.visibilityState === "visible" && navigator.onLine) void current?.update().catch(() => undefined) }
    window.addEventListener("beforeinstallprompt", beforeInstall)
    window.addEventListener("appinstalled", appInstalled)
    navigator.serviceWorker.addEventListener("message", message)
    navigator.serviceWorker.addEventListener("controllerchange", controllerChanged)
    document.addEventListener("visibilitychange", checkUpdate)
    void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).then(async result => {
      if (disposed) return
      current = result
      setRegistration(result)
      setWaiting(result.waiting)
      result.addEventListener("updatefound", updateFound)
      await navigator.serviceWorker.ready
      if (!disposed) setReady(Boolean(navigator.serviceWorker.controller))
    }).catch(() => { if (!disposed) setError("No se pudo preparar el modo sin conexión. Recarga cuando tengas conexión.") })
    return () => {
      disposed = true
      current?.removeEventListener("updatefound", updateFound)
      window.removeEventListener("beforeinstallprompt", beforeInstall)
      window.removeEventListener("appinstalled", appInstalled)
      navigator.serviceWorker.removeEventListener("message", message)
      navigator.serviceWorker.removeEventListener("controllerchange", controllerChanged)
      document.removeEventListener("visibilitychange", checkUpdate)
    }
  }, [])

  const install = useCallback(async () => {
    if (!prompt) return
    try { await prompt.prompt(); await prompt.userChoice } finally { setPrompt(null) }
  }, [prompt])

  const send = useCallback((type: "SAVE_PUBLIC_CONTENT" | "CLEAR_PUBLIC_CONTENT") => new Promise<{ count?: number; savedAt?: string }>((resolve, reject) => {
    const worker = navigator.serviceWorker?.controller || registration?.active
    if (!worker) { reject(new Error("Espera a que termine de prepararse INHALEX y vuelve a intentarlo.")); return }
    const channel = new MessageChannel()
    const timeout = window.setTimeout(() => { channel.port1.close(); reject(new Error("La descarga está tardando demasiado. Intenta de nuevo cuando tengas una conexión estable.")) }, 60000)
    channel.port1.onmessage = event => {
      clearTimeout(timeout); channel.port1.close()
      if (event.data?.ok) resolve(event.data)
      else reject(new Error(event.data?.error || "No se pudo completar la operación."))
    }
    worker.postMessage({ type }, [channel.port2])
  }), [registration])

  return <PwaContext.Provider value={{ ready, installed, canInstall: Boolean(prompt), error: error || environmentError, offline, install, send }}>
    {children}
    {(offline || stale !== null || waiting) && <aside className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-xl rounded-2xl border border-emerald-200 bg-white p-4 text-sm text-emerald-950 shadow-xl" aria-label="Estado de INHALEX" aria-live="polite">
      {waiting ? <>
        <p className="flex items-center gap-2 font-semibold"><Download className="h-4 w-4" />Hay una nueva versión de INHALEX</p>
        <p className="mt-1 text-xs leading-5">Termina cualquier formulario o pedido antes de actualizar. Se recargarán las pestañas que acepten la actualización.</p>
        <button className="mt-3 rounded-full bg-emerald-800 px-4 py-2 text-xs font-semibold text-white" onClick={() => { applyingUpdate.current = true; waiting.postMessage({ type: "SKIP_WAITING" }) }}>Actualizar ahora</button>
      </> : <>
        <p className="flex items-center gap-2 font-semibold"><WifiOff className="h-4 w-4" />{offline ? "Estás sin conexión" : "Estás viendo información guardada"}</p>
        <p className="mt-1 text-xs leading-5">Confirma precios y disponibilidad al reconectar.{stale ? ` Copia del ${new Date(stale).toLocaleString("es-MX")}.` : ""}</p>
        <div className="mt-3 flex flex-wrap gap-3"><a className="font-semibold underline underline-offset-4" href="/offline.html">Abrir catálogo guardado</a>{!offline && <button className="flex items-center gap-1" onClick={() => window.location.reload()}><RefreshCw className="h-3 w-3" />Reconectar</button>}</div>
      </>}
    </aside>}
  </PwaContext.Provider>
}

export function usePwa() {
  const context = useContext(PwaContext)
  if (!context) throw new Error("usePwa requires PwaProvider")
  return context
}
