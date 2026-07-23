import { apiRequest } from "@/lib/api/client"

export type OrderIssueSeverity = "info" | "warning" | "error"
export type OrderItemFulfillment = "available" | "adjusted" | "backorder" | "manual"
export type OrderStatus =
  | "draft"
  | "pending_review"
  | "confirmed"
  | "cancelled"
  | "completed"

export type CustomerReceiptStatus =
  | "not_required"
  | "pending"
  | "confirmed"
  | "issue_reported"

export interface DraftOrderPreviewItem {
  productId: string
  productName: string
  productSlug: string
  image: string
  category: string
  presentation: string
  origin: string
  unitPrice: number
  currency: string
  requestedQuantity: number
  quantity: number
  subtotal: number
  fulfillment: OrderItemFulfillment
  stockAvailable?: number | null
  reservedQuantity: number
  backorderQuantity: number
  inventoryTracked: boolean
  allowBackorder: boolean
  message?: string
}

export interface DraftOrderIssue {
  code: string
  severity: OrderIssueSeverity
  productId?: string
  productName?: string
  title: string
  description: string
}

export interface DraftOrderPreview {
  items: DraftOrderPreviewItem[]
  issues: DraftOrderIssue[]
  subtotal: number
  totalItems: number
  currency: string
  canCreateDraft: boolean
  canConfirmOrder: boolean
  needsManualReview: boolean
  signature: string
}

export interface CreateDraftOrderInput {
  items: Array<{
    productId: string
    quantity: number
  }>
  customerName: string
  customerEmail: string
  customerPhone: string
  notes?: string
  shippingAddressId?: string
}

export interface CreatedDraftOrder extends DraftOrderPreview {
  orderId: string
  reference: string
  status: OrderStatus
  createdAt?: string
}

export interface ConfirmOrderInput extends CreateDraftOrderInput {
  previewSignature: string
}

export interface ConfirmedOrder extends DraftOrderPreview {
  orderId: string
  reference: string
  status: OrderStatus
  createdAt?: string
}

export interface CustomerReceiptOrder {
  id: string
  reference: string
  status: OrderStatus
  customerReceiptStatus: CustomerReceiptStatus
  totalItems: number
  subtotal: number
  currency: string
  completedAt?: string
  customerReceiptRequestedAt?: string
  customerReceiptConfirmedAt?: string
  customerReceiptIssueReportedAt?: string
  customerReceiptIssueNote?: string
  customerReceiptReportId?: string
  items: DraftOrderPreviewItem[]
}

export function previewOrderDraft(payload: {
  items: Array<{ productId: string; quantity: number }>
}): Promise<DraftOrderPreview> {
  return apiRequest<DraftOrderPreview>("/orders/draft/preview", {
    method: "POST",
    body: payload,
  })
}

export function createDraftOrder(
  payload: CreateDraftOrderInput,
): Promise<CreatedDraftOrder> {
  return apiRequest<CreatedDraftOrder>("/orders/draft", {
    method: "POST",
    body: payload,
  })
}

export function confirmOrder(
  payload: ConfirmOrderInput,
  idempotencyKey: string,
  token?: string,
): Promise<ConfirmedOrder> {
  return apiRequest<ConfirmedOrder>("/orders/confirm", {
    method: "POST",
    body: payload,
    token,
    headers: {
      "Idempotency-Key": idempotencyKey,
    },
  })
}

export function listReceiptConfirmationOrders(
  token: string,
): Promise<CustomerReceiptOrder[]> {
  return apiRequest<CustomerReceiptOrder[]>("/orders/me/receipt-confirmations", {
    method: "GET",
    token,
  })
}

export function confirmOrderReceipt(
  orderId: string,
  token: string,
): Promise<CustomerReceiptOrder> {
  return apiRequest<CustomerReceiptOrder>(`/orders/${orderId}/receipt/confirm`, {
    method: "PATCH",
    token,
  })
}

export function reportOrderReceiptIssue(
  orderId: string,
  payload: { note?: string },
  token: string,
): Promise<CustomerReceiptOrder> {
  return apiRequest<CustomerReceiptOrder>(`/orders/${orderId}/receipt/report`, {
    method: "PATCH",
    body: payload,
    token,
  })
}
