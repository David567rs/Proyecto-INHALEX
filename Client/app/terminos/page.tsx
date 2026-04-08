import { LegalPageShell } from "@/components/common/legal-page-shell"
import { fetchCompanyContentServer } from "@/lib/company/company-content-server"

export default async function TermsPage() {
  const companyContent = await fetchCompanyContentServer()

  return (
    <LegalPageShell
      badge="Condiciones de uso"
      title={companyContent.termsAndConditions.title}
      description="Marco general para navegar, registrarte y comprar dentro de la experiencia digital de INHALEX, con una lectura mas clara y agradable."
      content={companyContent.termsAndConditions.content}
      secondaryTitle="Politica de privacidad"
      secondaryHref="/politicas"
      secondaryLabel="Ver politica"
    />
  )
}
