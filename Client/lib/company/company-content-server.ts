import "server-only"

import { DEFAULT_COMPANY_CONTENT } from "./default-company-content"
import type { CompanyContent } from "./company-content.types"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api"

export async function fetchCompanyContentServer(): Promise<CompanyContent> {
  try {
    const response = await fetch(`${API_BASE_URL}/company-content`, {
      cache: "no-store",
    })

    if (!response.ok) {
      return DEFAULT_COMPANY_CONTENT
    }

    const payload = (await response.json()) as CompanyContent
    return payload
  } catch {
    return DEFAULT_COMPANY_CONTENT
  }
}
