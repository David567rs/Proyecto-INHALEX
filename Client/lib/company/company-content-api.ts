import { publicApiRequest } from "@/lib/api/client"
import type { CompanyContent } from "./company-content.types"

export function fetchCompanyContent(): Promise<CompanyContent> {
  return publicApiRequest<CompanyContent>("/company-content", {
    method: "GET",
  })
}
