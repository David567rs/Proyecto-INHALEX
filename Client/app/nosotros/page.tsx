import { BadgeCheck, HeartPulse, Leaf, ShieldCheck, Sparkles } from "lucide-react"
import { MarkdownContent } from "@/components/common/markdown-content"
import { Footer } from "@/components/layout/footer"
import { Header } from "@/components/layout/header"
import { fetchCompanyContentServer } from "@/lib/company/company-content-server"

const VALUE_ICONS = [Sparkles, ShieldCheck, HeartPulse, BadgeCheck, Leaf]

export default async function AboutPage() {
  const companyContent = await fetchCompanyContentServer()
  const values = companyContent.about.values

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <section className="page-fade-up relative overflow-hidden border-b border-border bg-secondary/30 pt-28 pb-16 lg:pt-36 lg:pb-20">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-10 right-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-5xl mx-auto">
              <span className="inline-block px-4 py-1.5 bg-primary/10 rounded-full text-sm font-medium text-primary mb-4">
                Sobre INHALEX
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-foreground mb-4 text-balance">
                Mision, vision y valores
              </h1>
              <p className="text-lg text-muted-foreground max-w-3xl leading-relaxed text-pretty">
                Esta informacion es administrable desde el panel de administracion para mantener
                siempre actualizada la comunicacion oficial de la empresa.
              </p>
            </div>
          </div>
        </section>

        <section className="page-fade-up page-fade-up-delay-1 bg-secondary/20 py-16 lg:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
              <article className="bg-card rounded-3xl border border-border/60 p-6 lg:p-8 shadow-lg">
                <div className="inline-flex px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  Mision
                </div>
                <MarkdownContent className="mt-5" content={companyContent.about.mission} />
              </article>

              <article className="bg-card rounded-3xl border border-border/60 p-6 lg:p-8 shadow-lg">
                <div className="inline-flex px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  Vision
                </div>
                <MarkdownContent className="mt-5" content={companyContent.about.vision} />
              </article>
            </div>
          </div>
        </section>

        <section className="page-fade-up page-fade-up-delay-2 py-16 lg:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-10">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-sm font-medium text-primary">
                  <Leaf className="h-4 w-4" />
                  Valores de la empresa
                </span>
                <h2 className="mt-4 text-3xl sm:text-4xl font-serif font-bold text-foreground">
                  Principios que guian nuestro trabajo
                </h2>
              </div>

              {values.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/20 px-6 py-8 text-center text-muted-foreground">
                  Aun no hay valores configurados.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {values.map((value, index) => {
                    const Icon = VALUE_ICONS[index % VALUE_ICONS.length]
                    return (
                      <article
                        key={`${value}-${index}`}
                        className="page-fade-up public-card-lift group rounded-2xl border border-border/60 bg-card p-5 shadow-sm hover:border-primary/30 hover:shadow-lg"
                        style={{ animationDelay: `${180 + index * 70}ms` }}
                      >
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                          <Icon className="w-6 h-6 text-primary group-hover:text-primary-foreground" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-foreground">{value}</h3>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
