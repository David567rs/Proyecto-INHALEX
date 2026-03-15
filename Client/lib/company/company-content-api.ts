import { apiRequest } from "@/lib/api/client"
import type { CompanyContent } from "./company-content.types"

export function fetchCompanyContent(): Promise<CompanyContent> {
  return apiRequest<CompanyContent>("/company-content", {
    method: "GET",
  })
}
