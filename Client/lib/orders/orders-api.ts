import { apiRequest } from "@/lib/api/client"

export type OrderIssueSeverity = "info" | "warning" | "error"
export type OrderItemFulfillment = "available" | "adjusted" | "backorder" | "manual"
export type OrderStatus =
  | "draft"
  | "pending_review"
  | "confirmed"
  | "cancelled"
  | "completed"

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
  token?: string,
): Promise<ConfirmedOrder> {
  return apiRequest<ConfirmedOrder>("/orders/confirm", {
    method: "POST",
    body: payload,
    token,
  })
}
