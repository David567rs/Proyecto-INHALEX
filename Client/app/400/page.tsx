import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"

export default function Error400Page() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <section className="relative overflow-hidden pt-28 pb-16 lg:pt-36 lg:pb-24 bg-secondary/30 border-b border-border motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-6 duration-700">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -left-1/3 top-0 h-[140%] w-[160%] bg-primary/15 rotate-[-10deg] origin-top-left" />
            <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/90 to-background/70" />
            <div className="absolute top-16 right-24 h-20 w-20 rounded-full bg-primary/20 blur-xl" />
            <div className="absolute bottom-16 left-20 h-24 w-24 rounded-full bg-accent/20 blur-xl" />
            <div className="absolute top-24 left-1/2 h-3 w-12 rounded-full bg-primary/40" />
            <div className="absolute top-36 left-1/3 h-3 w-10 rounded-full bg-primary/30" />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <span className="inline-block px-4 py-1.5 bg-primary/10 rounded-full text-sm font-medium text-primary mb-4">
                Error 400
              </span>
              <div className="relative mb-6">
                <p className="text-lg text-foreground/70 font-semibold uppercase tracking-[0.25em]">
                  Ups
                </p>
                <p className="text-[120px] sm:text-[160px] lg:text-[200px] leading-none font-black text-foreground/90">
                  400
                </p>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-foreground mb-4 text-balance">
                Solicitud inv&aacute;lida
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed text-pretty">
                Parece que hubo un problema con la informaci&oacute;n enviada. Puedes intentarlo de nuevo.
              </p>
            </div>
          </div>
        </section>

        <section className="py-12 lg:py-16 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-5 duration-700 delay-150">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="bg-card border border-border/60 rounded-2xl p-6 lg:p-8 shadow-sm text-center">
                <h2 className="text-2xl font-semibold text-foreground mb-3">
                  &iquest;Necesitas ayuda?
                </h2>
                <p className="text-muted-foreground mb-6">
                  Revisa los datos e intenta de nuevo. Tambi&eacute;n puedes volver al inicio o escribirnos.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Button asChild className="px-6">
                    <Link href="/">Ir al inicio</Link>
                  </Button>
                  <Button asChild variant="outline" className="px-6 bg-transparent">
                    <Link href="/productos">Ver productos</Link>
                  </Button>
                  <Button asChild variant="outline" className="px-6 bg-transparent">
                    <Link href="/contacto">Contacto</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
