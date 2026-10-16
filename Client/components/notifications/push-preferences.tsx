"use client"

import { useEffect, useRef, useState } from "react"
import { Bell, BellOff, Loader2 } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { getAccessToken, getPendingLogout } from "@/lib/auth/token-storage"
import {
  deleteWebPushSubscription,
  disablePushForCurrentBrowser,
  getWebPushConfiguration,
  getWebPushStatus,
  saveWebPushSubscription,
  setBrowserPushConsent,
  webPushApplicationKey,
  withBrowserPushLock,
  type WebPushConfiguration,
} from "@/lib/notifications/web-push-api"

type PushState = "loading" | "unsupported" | "disabled" | "blocked" | "ready" | "subscribed" | "error"

export function PushPreferences() {
  const { user, isAuthenticated } = useAuth()
  const [state, setState] = useState<PushState>("loading")
  const [configuration, setConfiguration] = useState<WebPushConfiguration | null>(null)
  const [busy, setBusy] = useState(false)
  const [hasBrowserSubscription, setHasBrowserSubscription] = useState(false)
  const [message, setMessage] = useState("")
  const [reload, setReload] = useState(0)
  const lifecycle = useRef(0)

  useEffect(() => {
    const version = ++lifecycle.current
    const isCurrent = () => lifecycle.current === version
    async function inspect() {
      if (!isAuthenticated) return
      if (!window.isSecureContext || !("Notification" in window) || !("PushManager" in window) || !("serviceWorker" in navigator)) {
        if (isCurrent()) setState("unsupported")
        return
      }
      try {
        const registration = await navigator.serviceWorker.getRegistration("/")
        const subscription = await registration?.pushManager.getSubscription()
        if (isCurrent()) setHasBrowserSubscription(Boolean(subscription))
        const config = await getWebPushConfiguration()
        if (!isCurrent()) return
        setBusy(false)
        setMessage("")
        setConfiguration(config)
        if (!config.enabled || !config.publicKey) { setState("disabled"); return }
        if (Notification.permission === "denied") { setState("blocked"); return }
        const status = subscription ? await getWebPushStatus(subscription.endpoint, getAccessToken()) : null
        if (isCurrent()) setState(status?.subscribed ? "subscribed" : "ready")
      } catch {
        if (isCurrent()) {
          setState("error")
          setMessage("No pudimos consultar tus preferencias. Revisa la conexión e intenta de nuevo.")
        }
      }
    }
    void inspect()
    return () => { lifecycle.current += 1 }
  }, [isAuthenticated, user?._id, reload])

  async function enable() {
    if (!configuration?.publicKey || busy || !isAuthenticated) return
    const version = lifecycle.current
    const token = getAccessToken()
    const isCurrent = () => lifecycle.current === version && getAccessToken() === token && !getPendingLogout()
    setBusy(true)
    setMessage("")
    try {
      // Called directly from the button gesture, before any unrelated asynchronous work.
      const permission = await Notification.requestPermission()
      if (!isCurrent()) return
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "ready")
        setMessage(permission === "default" ? "Puedes activar los avisos cuando lo decidas." : "")
        return
      }
      await withBrowserPushLock(async () => {
        if (!isCurrent()) return
        await setBrowserPushConsent(false)
        if (!isCurrent()) return
        const registration = await navigator.serviceWorker.getRegistration("/")
        if (!registration?.active) throw new Error("La aplicación aún se está preparando. Recarga e intenta de nuevo.")
        let subscription = await registration.pushManager.getSubscription()
        if (!isCurrent()) return
        if (subscription) {
          const configuredKey = webPushApplicationKey(configuration.publicKey!)
          const currentKey = subscription.options.applicationServerKey
          const currentBytes = currentKey ? new Uint8Array(currentKey) : null
          if (!currentBytes || currentBytes.length !== configuredKey.length || currentBytes.some((byte, index) => byte !== configuredKey[index])) {
            await subscription.unsubscribe()
            subscription = null
          }
        }
        if (!isCurrent()) return
        subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: webPushApplicationKey(configuration.publicKey!) })
        try {
          if (!isCurrent()) throw new Error("La sesión cambió. Activa los avisos desde tu cuenta actual.")
          await saveWebPushSubscription(subscription, token)
          if (!isCurrent()) throw new Error("La sesión cambió. Activa los avisos desde tu cuenta actual.")
          await setBrowserPushConsent(true, isCurrent)
          if (!isCurrent()) throw new Error("La sesión cambió. Activa los avisos desde tu cuenta actual.")
          setState("subscribed")
          setHasBrowserSubscription(true)
          setMessage("Recibirás avisos generales de tu cuenta en este dispositivo.")
        } catch (error) {
          // A server failure must not leave a new or rebound browser subscription active.
          await setBrowserPushConsent(false).catch(() => undefined)
          await subscription.unsubscribe().catch(() => false)
          await deleteWebPushSubscription(subscription.endpoint, token).catch(() => undefined)
          if (isCurrent()) setHasBrowserSubscription(false)
          throw error
        }
      })
    } catch (error) {
      if (isCurrent()) {
        setState("ready")
        setMessage(error instanceof Error ? error.message : "No se pudieron activar los avisos.")
      }
    } finally {
      if (lifecycle.current === version) setBusy(false)
    }
  }

  async function disable() {
    const version = lifecycle.current
    setBusy(true)
    setMessage("")
    try {
      const result = await disablePushForCurrentBrowser(getAccessToken())
      if (lifecycle.current !== version) return
      setHasBrowserSubscription(false)
      setState(!configuration?.enabled ? "disabled" : Notification.permission === "denied" ? "blocked" : "ready")
      setMessage(result.serverCleanupPending
        ? "Avisos desactivados en este navegador. El servidor eliminará el registro caducado cuando detecte la baja."
        : "Avisos desactivados en este navegador.")
    } catch (error) {
      if (lifecycle.current === version) setMessage(error instanceof Error ? error.message : "No se pudieron desactivar los avisos.")
    } finally {
      if (lifecycle.current === version) setBusy(false)
    }
  }

  if (!isAuthenticated) return null
  return (
    <section aria-labelledby="push-preferences-title" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <Bell aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 space-y-3">
          <h2 id="push-preferences-title" className="font-semibold text-foreground">Avisos en este dispositivo</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">Recibe una notificación cuando haya novedades en tu cuenta. Los avisos no muestran productos, direcciones ni otros datos personales en la pantalla de bloqueo.</p>
          <div role="status" aria-live="polite" className="text-sm text-muted-foreground">
            {state === "loading" && "Consultando tus preferencias…"}
            {state === "unsupported" && "Este navegador no ofrece notificaciones web aquí. En iPhone o iPad, agrega primero INHALEX a la pantalla de inicio; también puedes consultar siempre los avisos dentro de tu cuenta."}
            {state === "disabled" && "Los avisos del navegador estarán disponibles cuando se habilite el servicio. Tus notificaciones dentro de la cuenta siguen disponibles."}
            {state === "blocked" && "Los permisos están bloqueados. Puedes cambiarlos en la configuración de este sitio en tu navegador y volver a consultar."}
            {state === "subscribed" && "Activadas para esta cuenta y este navegador."}
            {state === "ready" && "Se activan sólo si lo solicitas. Puedes desactivarlas aquí cuando quieras."}
            {message && <p className="mt-2">{message}</p>}
          </div>
          {state === "ready" && <Button type="button" disabled={busy} onClick={() => void enable()}>{busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Bell aria-hidden="true" />}{busy ? "Guardando…" : "Activar avisos para mi cuenta"}</Button>}
          {hasBrowserSubscription && <Button type="button" variant="outline" disabled={busy} onClick={() => void disable()}>{busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : <BellOff aria-hidden="true" />}{busy ? "Guardando…" : "Desactivar avisos en este navegador"}</Button>}
          {(state === "error" || state === "blocked") && <Button type="button" variant="outline" onClick={() => setReload((value) => value + 1)}>Volver a consultar</Button>}
        </div>
      </div>
    </section>
  )
}
