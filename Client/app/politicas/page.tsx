import { Footer } from "@/components/layout/footer"
import { Header } from "@/components/layout/header"
import { MarkdownContent } from "@/components/common/markdown-content"
import { fetchCompanyContentServer } from "@/lib/company/company-content-server"

export default async function PrivacyPolicyPage() {
  const companyContent = await fetchCompanyContentServer()

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <section className="pt-28 pb-12 lg:pt-36 lg:pb-16 bg-secondary/30 border-b border-border motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-6 duration-700">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <span className="inline-block px-4 py-1.5 bg-primary/10 rounded-full text-sm font-medium text-primary mb-4">
                Aviso legal
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-foreground mb-4 text-balance">
                {companyContent.privacyPolicy.title}
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed text-pretty">
                Informacion oficial publicada por INHALEX para usuarios y clientes.
              </p>
            </div>
          </div>
        </section>

        <section className="py-12 lg:py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <article className="bg-card border border-border/60 rounded-2xl p-6 lg:p-8 shadow-sm">
                <MarkdownContent content={companyContent.privacyPolicy.content} />
              </article>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
