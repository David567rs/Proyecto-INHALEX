"use client"

import { useState } from "react"
import Link from "next/link"
import { Download, Check, WifiOff, Smartphone, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePwa } from "./pwa-provider"

export function InstallSettings() {
  const { ready, installed, canInstall, offline, error, install, send } = usePwa()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [confirmClear, setConfirmClear] = useState(false)
  const run = async (type: "SAVE_PUBLIC_CONTENT" | "CLEAR_PUBLIC_CONTENT") => {
    setBusy(true); setMessage("")
    try {
      const result = await send(type)
      setMessage(type === "SAVE_PUBLIC_CONTENT" ? `Listo: ${result.count || 0} aromas y la información de ayuda quedaron guardados en este dispositivo.` : "Se eliminó el catálogo y la ayuda guardados. INHALEX sigue instalado.")
      setConfirmClear(false)
    } catch (failure) { setMessage(failure instanceof Error ? failure.message : "No se pudo completar la operación.") }
    finally { setBusy(false) }
  }
  return <div className="grid gap-6 lg:grid-cols-2">
    <section className="rounded-[2rem] border border-border bg-card p-7 shadow-sm">
      <Smartphone className="mb-5 h-7 w-7 text-primary" /><h2 className="text-xl font-semibold">INHALEX, a un toque</h2>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">Agrega INHALEX a tu computadora o pantalla de inicio para abrirlo como una aplicación.</p>
      {installed ? <p className="mt-5 flex items-center gap-2 font-medium text-primary"><Check className="h-4 w-4" />Ya estás usando INHALEX como aplicación</p>
        : canInstall ? <Button className="mt-5 rounded-full" onClick={() => void install().catch(() => setMessage("No se pudo abrir la instalación. Intenta desde el menú de tu navegador."))}><Download className="mr-2 h-4 w-4" />Instalar INHALEX</Button>
          : <p className="mt-5 rounded-xl bg-secondary p-4 text-sm leading-7">En Chrome o Edge, abre el menú del navegador y busca la opción para instalar esta página. En Safari, usa Compartir y “Agregar a inicio” o “Agregar al Dock”, según tu dispositivo. Si no aparece, puedes seguir usando la web.</p>}
    </section>
    <section className="rounded-[2rem] border border-border bg-card p-7 shadow-sm">
      <WifiOff className="mb-5 h-7 w-7 text-primary" /><h2 className="text-xl font-semibold">Tus aromas, sin conexión</h2>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">Al entrar al inicio con internet, INHALEX prepara automáticamente las vistas públicas, el catálogo y la ayuda con su diseño original. Este botón permite actualizar la copia. Los pedidos y tu cuenta necesitan conexión.</p>
      <Button className="mt-5 rounded-full" disabled={!ready || offline || busy} onClick={() => void run("SAVE_PUBLIC_CONTENT")}>{busy ? "Un momento…" : "Guardar catálogo y ayuda"}</Button>
      <p className="mt-4 text-xs leading-6 text-muted-foreground">La copia se guarda solo en este navegador. El dispositivo puede liberar este espacio. Se incluyen las imágenes ligeras disponibles; los videos no se descargan.</p>
      <Link className="mt-3 inline-block text-sm font-semibold text-primary underline underline-offset-4" href="/productos">Ver mi catálogo guardado</Link>
      <div className="mt-5 border-t border-border pt-4">{confirmClear ? <div><p className="text-sm">¿Eliminar la información pública guardada en este navegador?</p><div className="mt-3 flex gap-3"><Button variant="outline" size="sm" disabled={busy} onClick={() => void run("CLEAR_PUBLIC_CONTENT")}>Eliminar copia</Button><Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirmClear(false)}>Cancelar</Button></div></div> : <button className="flex items-center gap-2 text-xs text-muted-foreground" disabled={!ready || busy} onClick={() => setConfirmClear(true)}><Trash2 className="h-3 w-3" />Eliminar información guardada</button>}</div>
    </section>
    <p className="text-sm leading-6 lg:col-span-2" role="status" aria-live="polite">{message || error || (!ready ? "Preparando el modo sin conexión…" : "La base de INHALEX está lista para funcionar sin conexión.")}</p>
  </div>
}
