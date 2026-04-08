import Link from "next/link"
import { ArrowRight, Clock3, Mail, MapPin, MessageCircleMore, Phone } from "lucide-react"
import { Footer } from "@/components/layout/footer"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import {
  CONTACT_ADDRESS,
  CONTACT_CITY,
  CONTACT_EMAIL,
  CONTACT_EMAIL_HREF,
  CONTACT_HOURS,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_HREF,
} from "@/lib/company/contact-info"

const supportTopics = [
  {
    title: "Acompaniamiento de compra",
    description: "Te orientamos para ubicar la linea o el aroma que mejor conecta con lo que buscas.",
  },
  {
    title: "Dudas sobre pedidos",
    description: "Podemos ayudarte a aclarar disponibilidad, presentaciones y detalles previos a compra.",
  },
  {
    title: "Informacion general",
    description: "Si necesitas datos de la marca, politicas o informacion institucional, aqui tienes un punto directo.",
  },
]

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[linear-gradient(180deg,rgba(247,250,247,0.98),rgba(255,255,255,1))]">
      <Header />

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border pt-28 pb-16 lg:pt-36 lg:pb-20">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[7%] top-8 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute right-[10%] top-14 h-64 w-64 rounded-full bg-emerald-200/30 blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.36),transparent_42%)]" />
          </div>

          <div className="container relative z-10 mx-auto px-4">
            <div className="mx-auto max-w-6xl">
              <div className="page-fade-up max-w-3xl">
                <span className="public-section-badge">Contacto</span>
                <h1 className="mt-5 font-serif text-4xl font-bold leading-[0.98] text-foreground sm:text-5xl lg:text-6xl">
                  Una entrada clara para hablar con INHALEX.
                </h1>
                <p className="mt-5 text-lg leading-8 text-muted-foreground">
                  Si quieres resolver dudas, recibir orientacion o ubicar informacion oficial,
                  aqui tienes los canales principales del proyecto en un formato limpio y directo.
                </p>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <div className="page-fade-up page-fade-up-delay-1 public-soft-surface rounded-[1.8rem] p-5">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-foreground/72">
                    Correo principal
                  </p>
                  <p className="mt-3 text-lg font-semibold text-foreground">{CONTACT_EMAIL}</p>
                </div>
                <div className="page-fade-up page-fade-up-delay-2 public-soft-surface rounded-[1.8rem] p-5">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-foreground/72">
                    Telefono
                  </p>
                  <p className="mt-3 text-lg font-semibold text-foreground">{CONTACT_PHONE_DISPLAY}</p>
                </div>
                <div className="page-fade-up page-fade-up-delay-3 public-soft-surface rounded-[1.8rem] p-5">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-foreground/72">
                    Horario de atencion
                  </p>
                  <p className="mt-3 text-lg font-semibold text-foreground">{CONTACT_HOURS}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-10 lg:py-14">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.02fr_0.98fr]">
            <div className="page-fade-up page-fade-up-delay-1 public-soft-surface rounded-[2rem] p-6 lg:p-8">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-primary/10 p-2 text-primary">
                  <MessageCircleMore className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-foreground/72">
                    Canales directos
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-foreground">
                    Escoge la via que te resulte mas comoda
                  </h2>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <a
                  href={CONTACT_EMAIL_HREF}
                  className="group flex items-start gap-4 rounded-[1.4rem] border border-emerald-100/80 bg-white/88 px-5 py-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_20px_36px_-28px_rgba(15,84,43,0.18)]"
                >
                  <span className="rounded-full bg-primary/10 p-3 text-primary">
                    <Mail className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-base font-semibold text-foreground">Escribenos por correo</span>
                    <span className="mt-1 block text-sm leading-7 text-muted-foreground">
                      Ideal para consultas mas detalladas, informacion institucional o seguimiento
                      de dudas concretas.
                    </span>
                    <span className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary">
                      {CONTACT_EMAIL}
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                    </span>
                  </span>
                </a>

                <a
                  href={CONTACT_PHONE_HREF}
                  className="group flex items-start gap-4 rounded-[1.4rem] border border-emerald-100/80 bg-white/88 px-5 py-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_20px_36px_-28px_rgba(15,84,43,0.18)]"
                >
                  <span className="rounded-full bg-primary/10 p-3 text-primary">
                    <Phone className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-base font-semibold text-foreground">Llamada o seguimiento rapido</span>
                    <span className="mt-1 block text-sm leading-7 text-muted-foreground">
                      Muy util si quieres resolver algo puntual antes de continuar con tu compra.
                    </span>
                    <span className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary">
                      {CONTACT_PHONE_DISPLAY}
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                    </span>
                  </span>
                </a>
              </div>
            </div>

            <div className="space-y-5">
              <section className="page-fade-up page-fade-up-delay-2 public-soft-surface rounded-[2rem] p-6">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-primary/10 p-2 text-primary">
                    <MapPin className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-foreground/72">
                      Ubicacion base
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-foreground">{CONTACT_CITY}</h2>
                  </div>
                </div>
                <p className="mt-4 text-[0.98rem] leading-7 text-muted-foreground">
                  {CONTACT_ADDRESS}
                </p>
              </section>

              <section className="page-fade-up page-fade-up-delay-3 public-soft-surface rounded-[2rem] p-6">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-primary/10 p-2 text-primary">
                    <Clock3 className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-foreground/72">
                      Tiempo de respuesta
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-foreground">
                      Atencion con enfoque claro y humano
                    </h2>
                  </div>
                </div>
                <p className="mt-4 text-[0.98rem] leading-7 text-muted-foreground">
                  Nuestro objetivo es responder con informacion clara, sin friccion y con una
                  orientacion sencilla para que no tengas que adivinar el siguiente paso.
                </p>
                <p className="mt-4 rounded-[1.2rem] border border-emerald-100/80 bg-white px-4 py-3 text-sm font-medium text-foreground/80">
                  Horario sugerido: {CONTACT_HOURS}
                </p>
              </section>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-10 lg:pb-14">
          <div className="mx-auto max-w-6xl">
            <div className="page-fade-up page-fade-up-delay-2 mb-8 max-w-2xl">
              <span className="public-section-badge">Te ayudamos con</span>
              <h2 className="mt-4 text-3xl font-serif font-bold text-foreground sm:text-4xl">
                Motivos comunes para escribirnos
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {supportTopics.map((topic, index) => (
                <article
                  key={topic.title}
                  className="page-fade-up public-card-lift public-soft-surface rounded-[1.8rem] p-6"
                  style={{ animationDelay: `${180 + index * 80}ms` }}
                >
                  <h3 className="text-xl font-semibold text-foreground">{topic.title}</h3>
                  <p className="mt-3 text-[0.98rem] leading-7 text-muted-foreground">
                    {topic.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-16 lg:pb-24">
          <div className="page-fade-up page-fade-up-delay-3 mx-auto grid max-w-6xl gap-5 lg:grid-cols-2">
            <div className="public-soft-surface rounded-[2rem] p-6 lg:p-7">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-foreground/72">
                Antes de escribir
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-foreground">
                Quizas ya tenemos la respuesta lista
              </h2>
              <p className="mt-3 text-[0.98rem] leading-7 text-muted-foreground">
                Si prefieres una ruta mas rapida, revisa primero la seccion de preguntas frecuentes.
              </p>
              <Button asChild variant="outline" className="mt-6 rounded-full border-emerald-100/80 bg-white/84">
                <Link href="/faq">Ir a FAQ</Link>
              </Button>
            </div>

            <div className="public-soft-surface rounded-[2rem] p-6 lg:p-7">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-foreground/72">
                Documentacion legal
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-foreground">
                Politicas y terminos siempre a mano
              </h2>
              <p className="mt-3 text-[0.98rem] leading-7 text-muted-foreground">
                Para temas de privacidad, uso del sitio y condiciones generales, tienes acceso
                directo a los documentos legales del proyecto.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild variant="outline" className="rounded-full border-emerald-100/80 bg-white/84">
                  <Link href="/politicas">Politicas</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full border-emerald-100/80 bg-white/84">
                  <Link href="/terminos">Terminos</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
