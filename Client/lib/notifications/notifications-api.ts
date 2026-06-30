import { apiRequest } from "@/lib/api/client"

export type CustomerNotificationType =
  | "order"
  | "review"
  | "promotion"
  | "system"
  | "report"

export type CustomerNotificationSeverity = "info" | "success" | "warning"

export interface CustomerNotification {
  id: string
  userId?: string
  userEmail: string
  title: string
  message: string
  type: CustomerNotificationType
  severity: CustomerNotificationSeverity
  metadata?: Record<string, unknown>
  readAt?: string | null
  createdAt?: string
}

export interface CustomerNotificationsResponse {
  items: CustomerNotification[]
  unread: number
}

export function listCustomerNotifications(
  token: string,
): Promise<CustomerNotificationsResponse> {
  return apiRequest<CustomerNotificationsResponse>("/notifications/me", {
    method: "GET",
    token,
  })
}

export function markCustomerNotificationRead(
  notificationId: string,
  token: string,
): Promise<CustomerNotification> {
  return apiRequest<CustomerNotification>(
    `/notifications/me/${notificationId}/read`,
    {
      method: "PATCH",
      token,
    },
  )
}

export function markAllCustomerNotificationsRead(
  token: string,
): Promise<{ updated: number }> {
  return apiRequest<{ updated: number }>("/notifications/me/read-all", {
    method: "PATCH",
    token,
  })
}
