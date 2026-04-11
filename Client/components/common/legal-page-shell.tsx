import Link from "next/link"
import { ArrowRight, FileText, ShieldCheck } from "lucide-react"
import { MarkdownContent } from "@/components/common/markdown-content"
import { Footer } from "@/components/layout/footer"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { CONTACT_EMAIL, CONTACT_EMAIL_HREF } from "@/lib/company/contact-info"

interface LegalPageShellProps {
  badge: string
  title: string
  description: string
  content: string
  secondaryTitle: string
  secondaryHref: string
  secondaryLabel: string
}

export function LegalPageShell({
  badge,
  title,
  description,
  content,
  secondaryTitle,
  secondaryHref,
  secondaryLabel,
}: LegalPageShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[linear-gradient(180deg,rgba(247,250,247,0.98),rgba(255,255,255,1))]">
      <Header />

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border pt-28 pb-14 lg:pt-36 lg:pb-18">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[8%] top-8 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute right-[10%] bottom-0 h-72 w-72 rounded-full bg-emerald-200/28 blur-3xl" />
          </div>

          <div className="container relative z-10 mx-auto px-4">
            <div className="mx-auto max-w-5xl">
              <div className="page-fade-up">
                <span className="public-section-badge">{badge}</span>
                <h1 className="public-display-heading mt-5 max-w-4xl text-4xl leading-[0.98] text-foreground sm:text-5xl lg:text-6xl">
                  {title}
                </h1>
                <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
                  {description}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-10 lg:py-14">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.18fr_0.82fr]">
            <article className="page-fade-up page-fade-up-delay-1 public-soft-surface rounded-[2rem] p-6 lg:p-8">
              <MarkdownContent content={content} />
            </article>

            <aside className="space-y-5">
              <section className="page-fade-up page-fade-up-delay-2 public-soft-surface rounded-[2rem] p-6">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-primary/10 p-2 text-primary">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-foreground/72">
                      Consulta relacionada
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-foreground">{secondaryTitle}</h2>
                  </div>
                </div>

                <p className="mt-4 text-[0.98rem] leading-7 text-muted-foreground">
                  Si quieres revisar el otro documento legal o complementar tu consulta, lo
                  tienes disponible aqui con la misma estructura de lectura.
                </p>

                <Button asChild className="mt-6 rounded-full px-5 shadow-[0_18px_34px_-26px_rgba(16,112,58,0.4)]">
                  <Link href={secondaryHref}>
                    {secondaryLabel}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </section>

              <section className="page-fade-up page-fade-up-delay-3 public-soft-surface rounded-[2rem] p-6">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-primary/10 p-2 text-primary">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-foreground/72">
                      Soporte
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-foreground">
                      Necesitas aclarar algo mas?
                    </h2>
                  </div>
                </div>

                <p className="mt-4 text-[0.98rem] leading-7 text-muted-foreground">
                  Para dudas especificas sobre pedidos, datos personales o condiciones de uso,
                  puedes escribirnos directamente y te ayudamos a ubicar la informacion.
                </p>

                <a
                  href={CONTACT_EMAIL_HREF}
                  className="mt-5 inline-flex rounded-full border border-emerald-100/80 bg-white px-4 py-2 text-sm font-medium text-primary transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_16px_28px_-24px_rgba(16,112,58,0.3)]"
                >
                  {CONTACT_EMAIL}
                </a>
              </section>
            </aside>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
