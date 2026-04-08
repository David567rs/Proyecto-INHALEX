import { LegalPageShell } from "@/components/common/legal-page-shell"
import { fetchCompanyContentServer } from "@/lib/company/company-content-server"

export default async function PrivacyPolicyPage() {
  const companyContent = await fetchCompanyContentServer()

  return (
    <LegalPageShell
      badge="Aviso legal"
      title={companyContent.privacyPolicy.title}
      description="Informacion oficial de privacidad para usuarios, clientes y visitantes que interactuan con el ecosistema digital de INHALEX."
      content={companyContent.privacyPolicy.content}
      secondaryTitle="Terminos y condiciones"
      secondaryHref="/terminos"
      secondaryLabel="Ver terminos"
    />
  )
}
