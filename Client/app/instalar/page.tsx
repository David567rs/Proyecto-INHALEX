import type { Metadata } from "next"
import { InstallSettings } from "@/components/pwa/install-settings"

export const metadata: Metadata = { title: "Instalar INHALEX · Tu catálogo sin conexión" }

export default function InstallPage() {
  return <main className="flex-1 px-4 pb-20 pt-32 lg:pt-40">
    <div className="mx-auto max-w-5xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">INHALEX CONTIGO</p>
      <h1 className="mt-5 max-w-2xl text-4xl font-medium tracking-tight sm:text-5xl">Un espacio para tus aromas.<br /><span className="text-primary">Siempre a mano.</span></h1>
      <p className="mb-10 mt-5 max-w-2xl text-base leading-8 text-muted-foreground">Instala INHALEX y prepara tu catálogo para esos momentos en los que no tienes internet.</p>
      <InstallSettings />
    </div>
  </main>
}
