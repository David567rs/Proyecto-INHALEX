import "server-only"

import type { CompanyContent } from "./company-content.types"

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:3200/api").replace(/\/+$/, "")

export async function fetchCompanyContentServer(): Promise<CompanyContent> {
  const response = await fetch(`${API_BASE_URL}/company-content`, {
    next: { revalidate: 300 },
    credentials: "omit",
  })

  if (!response.ok) {
    // Keep the last successful ISR page instead of publishing placeholder legal
    // content as a new public/offline copy when the API is unavailable.
    throw new Error("No se pudo actualizar la información pública de INHALEX")
  }

  return (await response.json()) as CompanyContent
}
