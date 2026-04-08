import Link from "next/link"
import { ArrowRight, HelpCircle, Mail, ShieldCheck } from "lucide-react"
import { Footer } from "@/components/layout/footer"
import { Header } from "@/components/layout/header"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { CONTACT_EMAIL, CONTACT_EMAIL_HREF } from "@/lib/company/contact-info"

const faqItems = [
  {
    question: "Como elijo la linea adecuada?",
    answer:
      "Puedes empezar por la seccion de lineas. Cada una agrupa aromas con una intencion mas clara, por ejemplo descanso, frescura botanica o alivio respiratorio.",
  },
  {
    question: "Las imagenes del catalogo corresponden a aromas reales?",
    answer:
      "Si. En las vistas publicas organizamos cada aroma con su imagen de referencia para que la navegacion sea mas clara y consistente dentro del catalogo.",
  },
  {
    question: "Los productos sustituyen atencion medica?",
    answer:
      "No. INHALEX se presenta como una experiencia de bienestar y acompanamiento aromatico. Si tienes una condicion medica, lo adecuado es buscar orientacion profesional.",
  },
  {
    question: "Donde veo politicas de privacidad y terminos?",
    answer:
      "En el footer y en el bloque de ayuda tienes acceso directo a Politicas y Terminos para consultar privacidad, uso del sitio y condiciones generales.",
  },
  {
    question: "Puedo contactar a alguien antes de comprar?",
    answer:
      "Si. Existe una pagina de Contacto para escribir por correo o llamar, ideal si quieres orientacion antes de elegir una linea o aroma.",
  },
  {
    question: "Que pasa si no encuentro la respuesta aqui?",
    answer:
      "Puedes escribirnos directamente a nuestro correo de contacto y atenderemos tu consulta con la mayor claridad posible.",
  },
]

export default function FaqPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[linear-gradient(180deg,rgba(247,250,247,0.98),rgba(255,255,255,1))]">
      <Header />

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border pt-28 pb-16 lg:pt-36 lg:pb-20">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[8%] top-8 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute right-[10%] bottom-0 h-72 w-72 rounded-full bg-emerald-200/28 blur-3xl" />
          </div>

          <div className="container relative z-10 mx-auto px-4">
            <div className="mx-auto max-w-5xl">
              <div className="page-fade-up text-center">
                <span className="public-section-badge">Preguntas frecuentes</span>
                <h1 className="mt-5 font-serif text-4xl font-bold leading-[0.98] text-foreground sm:text-5xl lg:text-6xl">
                  Respuestas claras para navegar con mas confianza.
                </h1>
                <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
                  Reunimos las dudas mas comunes sobre lineas, aromas, navegacion y apoyo
                  general para que la experiencia se sienta mas simple y acompaniada.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-10 lg:py-14">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="page-fade-up page-fade-up-delay-1 public-soft-surface rounded-[2rem] p-4 sm:p-5 lg:p-6">
              <Accordion type="single" collapsible className="space-y-3">
                {faqItems.map((item, index) => (
                  <AccordionItem
                    key={item.question}
                    value={`item-${index}`}
                    className="overflow-hidden rounded-[1.4rem] border border-emerald-100/80 bg-white/88 px-4 sm:px-5"
                  >
                    <AccordionTrigger className="py-5 text-base font-semibold text-foreground hover:no-underline">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="pb-5 text-[0.98rem] leading-7 text-muted-foreground">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            <aside className="space-y-5">
              <section className="page-fade-up page-fade-up-delay-2 public-soft-surface rounded-[2rem] p-6">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-primary/10 p-2 text-primary">
                    <HelpCircle className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-foreground/72">
                      Ruta sugerida
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-foreground">
                      Explora primero por lineas
                    </h2>
                  </div>
                </div>

                <p className="mt-4 text-[0.98rem] leading-7 text-muted-foreground">
                  Si quieres entender mejor el catalogo, las lineas te ayudan a entrar por
                  contexto y no solo por nombre de aroma.
                </p>

                <Button asChild className="mt-6 rounded-full px-5 shadow-[0_18px_34px_-26px_rgba(16,112,58,0.4)]">
                  <Link href="/">
                    Ver lineas desde inicio
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </section>

              <section className="page-fade-up page-fade-up-delay-3 public-soft-surface rounded-[2rem] p-6">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-primary/10 p-2 text-primary">
                    <Mail className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-foreground/72">
                      Soporte directo
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-foreground">
                      No encontraste tu respuesta?
                    </h2>
                  </div>
                </div>

                <p className="mt-4 text-[0.98rem] leading-7 text-muted-foreground">
                  Puedes escribirnos y te ayudamos a resolver tu consulta con una respuesta mas puntual.
                </p>

                <a
                  href={CONTACT_EMAIL_HREF}
                  className="mt-5 inline-flex rounded-full border border-emerald-100/80 bg-white px-4 py-2 text-sm font-medium text-primary transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_16px_28px_-24px_rgba(16,112,58,0.3)]"
                >
                  {CONTACT_EMAIL}
                </a>

                <Button asChild variant="outline" className="mt-5 w-full rounded-[1.2rem] border-emerald-100/80 bg-white/84">
                  <Link href="/contacto">Ir a Contacto</Link>
                </Button>
              </section>

              <section className="page-fade-up page-fade-up-delay-4 public-soft-surface rounded-[2rem] p-6">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-primary/10 p-2 text-primary">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-foreground/72">
                      Informacion legal
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-foreground">
                      Consulta nuestros documentos base
                    </h2>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button asChild variant="outline" className="rounded-full border-emerald-100/80 bg-white/84">
                    <Link href="/politicas">Politicas</Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-full border-emerald-100/80 bg-white/84">
                    <Link href="/terminos">Terminos</Link>
                  </Button>
                </div>
              </section>
            </aside>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
