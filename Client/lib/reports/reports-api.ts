import { apiRequest } from "@/lib/api/client"

export type CustomerReportType =
  | "order"
  | "product"
  | "delivery"
  | "account"
  | "other"

export type CustomerReportStatus = "new" | "in_review" | "resolved" | "closed"
export type CustomerReportPriority = "normal" | "high"

export interface CustomerReport {
  id: string
  userId: string
  userEmail: string
  userName: string
  type: CustomerReportType
  title: string
  message: string
  orderReference?: string
  productId?: string
  status: CustomerReportStatus
  priority: CustomerReportPriority
  adminNote?: string
  handledById?: string
  handledByEmail?: string
  resolvedAt?: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateCustomerReportInput {
  type: CustomerReportType
  title: string
  message: string
  orderReference?: string
  productId?: string
  priority?: CustomerReportPriority
}

export function listCustomerReports(token: string): Promise<CustomerReport[]> {
  return apiRequest<CustomerReport[]>("/reports/me", {
    method: "GET",
    token,
  })
}

export function createCustomerReport(
  payload: CreateCustomerReportInput,
  token: string,
): Promise<CustomerReport> {
  return apiRequest<CustomerReport>("/reports", {
    method: "POST",
    body: payload,
    token,
  })
}
