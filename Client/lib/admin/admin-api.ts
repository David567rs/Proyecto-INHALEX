import { apiRequest } from "@/lib/api/client"
import type { AuthUser } from "@/lib/auth/types"
import type {
  CompanyContent,
  UpdateCompanyContentInput,
} from "@/lib/company/company-content.types"
import type {
  DraftOrderIssue,
  DraftOrderPreviewItem,
  OrderStatus,
} from "@/lib/orders/orders-api"

export function listAdminUsers(token: string): Promise<AuthUser[]> {
  return apiRequest<AuthUser[]>("/admin/users", {
    method: "GET",
    token,
  })
}

interface UpdateAdminUserInput {
  role?: AuthUser["role"]
  status?: AuthUser["status"]
}

export function updateAdminUser(
  userId: string,
  payload: UpdateAdminUserInput,
  token: string,
): Promise<AuthUser> {
  return apiRequest<AuthUser>(`/admin/users/${userId}`, {
    method: "PATCH",
    body: payload,
    token,
  })
}

export interface AdminProduct {
  _id: string
  name: string
  slug: string
  category: string
  price: number
  currency: string
  presentation?: string
  status: "draft" | "active" | "archived"
  inStock: boolean
  stockAvailable?: number
  stockReserved?: number
  stockMin?: number
  allowBackorder?: boolean
  sortOrder?: number
  createdAt?: string
  updatedAt?: string
}

export interface AdminProductCategory {
  _id: string
  slug: string
  name: string
  description?: string
  isActive: boolean
  sortOrder: number
  productCount: number
  createdAt?: string
  updatedAt?: string
}

interface AdminProductsResponse {
  items: AdminProduct[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface SeedProductsResult {
  created: number
  updated: number
  total: number
}

export interface ListAdminProductsQuery {
  search?: string
  category?: string
  status?: AdminProduct["status"]
  inStock?: boolean
  page?: number
  limit?: number
}

export function listAdminProducts(
  token: string,
  query: ListAdminProductsQuery = {},
): Promise<AdminProductsResponse> {
  const params = new URLSearchParams()

  if (query.search) params.set("search", query.search)
  if (query.category) params.set("category", query.category)
  if (query.status) params.set("status", query.status)
  if (query.inStock !== undefined) params.set("inStock", String(query.inStock))
  if (query.page) params.set("page", String(query.page))
  if (query.limit) params.set("limit", String(query.limit))

  const queryString = params.toString()
  const path = queryString ? `/admin/products?${queryString}` : "/admin/products"

  return apiRequest<AdminProductsResponse>(path, {
    method: "GET",
    token,
  })
}

async function downloadAdminFile(
  path: string,
  token: string,
  fallbackFileName: string,
): Promise<{ blob: Blob; fileName: string }> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? ""
    const payload = contentType.includes("application/json")
      ? await response.json()
      : await response.text()

    if (payload && typeof payload === "object" && "message" in payload) {
      const message = (payload as { message?: string | string[] }).message
      if (Array.isArray(message)) throw new Error(message.join(", "))
      if (typeof message === "string") throw new Error(message)
    }

    throw new Error("No se pudo descargar el archivo")
  }

  const blob = await response.blob()
  const contentDisposition = response.headers.get("content-disposition") ?? ""
  const fileNameMatch = contentDisposition.match(/filename=\"?([^\";]+)\"?/i)
  const fileName = fileNameMatch?.[1] ?? fallbackFileName

  return { blob, fileName }
}

export async function exportAdminProductsCsv(
  token: string,
  query: ListAdminProductsQuery = {},
): Promise<{ blob: Blob; fileName: string }> {
  const params = new URLSearchParams()

  if (query.search) params.set("search", query.search)
  if (query.category) params.set("category", query.category)
  if (query.status) params.set("status", query.status)
  if (query.inStock !== undefined) params.set("inStock", String(query.inStock))

  const queryString = params.toString()
  const path = queryString ? `/admin/products/csv?${queryString}` : "/admin/products/csv"

  return downloadAdminFile(path, token, "productos.csv")
}

export async function exportAdminProductsTemplateCsv(
  token: string,
): Promise<{ blob: Blob; fileName: string }> {
  return downloadAdminFile("/admin/products/csv/template", token, "plantilla_productos.csv")
}

export interface AdminProductsCsvImportRow {
  id?: string
  slug?: string
  nombre?: string
  categoria?: string
  precio?: string
  moneda?: string
  presentacion?: string
  presentation_ml?: string
  estado?: string
  disponible?: string
  orden?: string
}

export interface AdminProductsCsvImportResult {
  totalRows: number
  updated: number
  skipped: number
  failed: number
  errors: Array<{
    row: number
    idOrSlug: string
    message: string
  }>
}

export function importAdminProductsCsv(
  rows: AdminProductsCsvImportRow[],
  token: string,
): Promise<AdminProductsCsvImportResult> {
  return apiRequest<AdminProductsCsvImportResult>("/admin/products/csv/import", {
    method: "POST",
    body: { rows },
    token,
  })
}

export function seedAdminProducts(token: string): Promise<SeedProductsResult> {
  return apiRequest<SeedProductsResult>("/admin/products/seed-defaults", {
    method: "POST",
    token,
  })
}

export interface UpdateAdminProductInput {
  category?: string
  price?: number
  status?: AdminProduct["status"]
  inStock?: boolean
  stockMin?: number
  allowBackorder?: boolean
  sortOrder?: number
}

export type InventoryMovementType =
  | "initialize"
  | "restock"
  | "deduct"
  | "set_available"
  | "reserve"
  | "release"
  | "commit_reserved"

export interface AdminInventorySummary {
  totalTrackedProducts: number
  totalPendingInitialization: number
  totalAvailableUnits: number
  totalReservedUnits: number
  lowStockProducts: number
  outOfStockProducts: number
  backorderEnabledProducts: number
}

export interface AdminInventoryMovement {
  id: string
  productId: string
  productName: string
  type: InventoryMovementType
  quantity: number
  previousAvailable?: number
  nextAvailable: number
  previousReserved: number
  nextReserved: number
  note?: string
  actorId?: string
  actorEmail?: string
  orderId?: string
  orderReference?: string
  createdAt?: string
}

export interface AdjustAdminInventoryInput {
  type: InventoryMovementType
  quantity: number
  note?: string
}

export function updateAdminProduct(
  productId: string,
  payload: UpdateAdminProductInput,
  token: string,
): Promise<AdminProduct> {
  return apiRequest<AdminProduct>(`/admin/products/${productId}`, {
    method: "PATCH",
    body: payload,
    token,
  })
}

export function getAdminInventorySummary(
  token: string,
): Promise<AdminInventorySummary> {
  return apiRequest<AdminInventorySummary>("/admin/products/inventory/summary", {
    method: "GET",
    token,
  })
}

export function listAdminInventoryMovements(
  productId: string,
  token: string,
  limit = 12,
): Promise<{ items: AdminInventoryMovement[]; total: number; limit: number }> {
  return apiRequest<{ items: AdminInventoryMovement[]; total: number; limit: number }>(
    `/admin/products/${productId}/inventory/movements?limit=${limit}`,
    {
      method: "GET",
      token,
    },
  )
}

export function adjustAdminInventory(
  productId: string,
  payload: AdjustAdminInventoryInput,
  token: string,
): Promise<{ product: AdminProduct; movement: AdminInventoryMovement }> {
  return apiRequest<{ product: AdminProduct; movement: AdminInventoryMovement }>(
    `/admin/products/${productId}/inventory/adjust`,
    {
      method: "POST",
      body: payload,
      token,
    },
  )
}

export type AdminOrderStatus = OrderStatus

export interface AdminOrderStatusNote {
  status: AdminOrderStatus
  note: string
  actorId?: string
  actorEmail?: string
  createdAt: string
}

export interface AdminOrderListItem {
  id: string
  reference: string
  status: AdminOrderStatus
  customerName: string
  customerEmail: string
  customerPhone: string
  totalItems: number
  subtotal: number
  currency: string
  needsManualReview: boolean
  createdAt?: string
  confirmedAt?: string
  cancelledAt?: string
  completedAt?: string
}

export interface AdminOrderDetail extends AdminOrderListItem {
  channel: string
  customerNotes?: string
  customerUserId?: string
  customerUserEmail?: string
  items: DraftOrderPreviewItem[]
  issues: DraftOrderIssue[]
  statusNotes: AdminOrderStatusNote[]
  lastValidatedAt?: string
}

interface AdminOrdersResponse {
  items: AdminOrderListItem[]
  total: number
  page: number
  limit: number
  totalPages: number
  summary: Record<AdminOrderStatus, number> & {
    manualReview: number
  }
}

export interface ListAdminOrdersQuery {
  search?: string
  status?: AdminOrderStatus
  page?: number
  limit?: number
}

export interface UpdateAdminOrderStatusInput {
  status: AdminOrderStatus
  note?: string
}

export function listAdminOrders(
  token: string,
  query: ListAdminOrdersQuery = {},
): Promise<AdminOrdersResponse> {
  const params = new URLSearchParams()

  if (query.search) params.set("search", query.search)
  if (query.status) params.set("status", query.status)
  if (query.page) params.set("page", String(query.page))
  if (query.limit) params.set("limit", String(query.limit))

  const queryString = params.toString()
  const path = queryString ? `/admin/orders?${queryString}` : "/admin/orders"

  return apiRequest<AdminOrdersResponse>(path, {
    method: "GET",
    token,
  })
}

export function getAdminOrder(
  orderId: string,
  token: string,
): Promise<AdminOrderDetail> {
  return apiRequest<AdminOrderDetail>(`/admin/orders/${orderId}`, {
    method: "GET",
    token,
  })
}

export function updateAdminOrderStatus(
  orderId: string,
  payload: UpdateAdminOrderStatusInput,
  token: string,
): Promise<AdminOrderDetail> {
  return apiRequest<AdminOrderDetail>(`/admin/orders/${orderId}/status`, {
    method: "PATCH",
    body: payload,
    token,
  })
}

export interface CreateAdminProductCategoryInput {
  name: string
  slug?: string
  description?: string
  isActive?: boolean
  sortOrder?: number
}

export interface UpdateAdminProductCategoryInput {
  name?: string
  slug?: string
  description?: string
  isActive?: boolean
  sortOrder?: number
}

export function listAdminProductCategories(
  token: string,
): Promise<AdminProductCategory[]> {
  return apiRequest<AdminProductCategory[]>("/admin/products/categories", {
    method: "GET",
    token,
  })
}

export function createAdminProductCategory(
  payload: CreateAdminProductCategoryInput,
  token: string,
): Promise<AdminProductCategory> {
  return apiRequest<AdminProductCategory>("/admin/products/categories", {
    method: "POST",
    body: payload,
    token,
  })
}

export function updateAdminProductCategory(
  categoryId: string,
  payload: UpdateAdminProductCategoryInput,
  token: string,
): Promise<AdminProductCategory> {
  return apiRequest<AdminProductCategory>(`/admin/products/categories/${categoryId}`, {
    method: "PATCH",
    body: payload,
    token,
  })
}

export function getAdminCompanyContent(token: string): Promise<CompanyContent> {
  return apiRequest<CompanyContent>("/admin/company-content", {
    method: "GET",
    token,
  })
}

export function updateAdminCompanyContent(
  payload: UpdateCompanyContentInput,
  token: string,
): Promise<CompanyContent> {
  return apiRequest<CompanyContent>("/admin/company-content", {
    method: "PATCH",
    body: payload,
    token,
  })
}

export interface AdminAuditLog {
  _id: string
  actorUserId?: string
  actorEmail?: string
  actorRole?: string
  method: string
  action: "read" | "create" | "update" | "delete" | "other"
  collection: string
  route: string
  resourceId?: string
  statusCode: number
  success: boolean
  errorMessage?: string
  responseTimeMs?: number
  ip?: string
  userAgent?: string
  createdAt?: string
  updatedAt?: string
}

interface AdminAuditLogsResponse {
  items: AdminAuditLog[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ListAdminAuditLogsQuery {
  search?: string
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
  action?: AdminAuditLog["action"]
  collection?: string
  success?: boolean
  important?: boolean
  page?: number
  limit?: number
}

export function listAdminAuditLogs(
  token: string,
  query: ListAdminAuditLogsQuery = {},
): Promise<AdminAuditLogsResponse> {
  const params = new URLSearchParams()

  if (query.search) params.set("search", query.search)
  if (query.method) params.set("method", query.method)
  if (query.action) params.set("action", query.action)
  if (query.collection) params.set("collection", query.collection)
  if (query.success !== undefined) params.set("success", String(query.success))
  if (query.important !== undefined) params.set("important", String(query.important))
  if (query.page) params.set("page", String(query.page))
  if (query.limit) params.set("limit", String(query.limit))

  const queryString = params.toString()
  const path = queryString ? `/admin/audit/logs?${queryString}` : "/admin/audit/logs"

  return apiRequest<AdminAuditLogsResponse>(path, {
    method: "GET",
    token,
  })
}

export interface AdminMonitoringOverview {
  generatedAt: string
  windowMinutes: number
  bucketMinutes: number
  database: {
    name: string
    collections: number
    objects: number
    dataSizeBytes: number
    storageSizeBytes: number
    indexSizeBytes: number
    indexes: number
    avgObjSizeBytes: number
    activeConnections: number
    availableConnections: number
    uptimeSeconds: number
    engine: string
    cacheUsedBytes: number
    cacheDirtyBytes: number
    cacheMaxBytes: number
    operations: {
      insert: number
      query: number
      update: number
      delete: number
      getmore: number
      command: number
    }
    capabilities: {
      dbStats: boolean
      collStats: boolean
      serverStatus: boolean
    }
    notes: string[]
  }
  collections: Array<{
    name: string
    documents: number
    avgObjSizeBytes: number
    dataSizeBytes: number
    storageSizeBytes: number
    totalIndexSizeBytes: number
    indexes: number
    sizeSharePercent: number
    documentSharePercent: number
    totalRequests: number
    reads: number
    writes: number
    failedRequests: number
    avgResponseTimeMs: number
    lastActivityAt?: string
    activityLevel: "hot" | "warm" | "idle"
  }>
  traffic: {
    totalRequests: number
    failedRequests: number
    successRate: number
    avgResponseTimeMs: number
    timeline: Array<{
      bucketStart: string
      totalRequests: number
      failedRequests: number
      avgResponseTimeMs: number
    }>
    methods: Array<{
      key: string
      value: number
    }>
    actions: Array<{
      key: string
      value: number
    }>
    topRoutes: Array<{
      route: string
      totalRequests: number
      failedRequests: number
      avgResponseTimeMs: number
      lastSeenAt?: string
    }>
  }
  users: {
    total: number
    admins: number
    inactive: number
    activeLast5Minutes: number
    activeLast60Minutes: number
    recentlyRegistered: number
    spotlightUsers: Array<{
      userId: string
      name: string
      email: string
      role: AuthUser["role"]
      status: AuthUser["status"]
      lastSeenAt?: string
      lastLoginAt?: string
      createdAt?: string
      requestsLastWindow: number
      failedRequests: number
      avgResponseTimeMs: number
      lastRoute?: string
      activityLevel: "online" | "recent" | "idle"
    }>
  }
  runtime: {
    hostname: string
    pid: number
    nodeVersion: string
    platform: string
    cpuCount: number
    processUptimeSeconds: number
    processCpuPercent: number
    processMemoryBytes: {
      rss: number
      heapTotal: number
      heapUsed: number
      external: number
      arrayBuffers: number
    }
    systemMemoryBytes: {
      total: number
      free: number
      used: number
    }
  }
}

export interface GetAdminMonitoringQuery {
  windowMinutes?: number
  topCollections?: number
}

export function getAdminMonitoringOverview(
  token: string,
  query: GetAdminMonitoringQuery = {},
): Promise<AdminMonitoringOverview> {
  const params = new URLSearchParams()

  if (query.windowMinutes) params.set("windowMinutes", String(query.windowMinutes))
  if (query.topCollections) params.set("topCollections", String(query.topCollections))

  const queryString = params.toString()
  const path = queryString ? `/admin/audit/monitoring?${queryString}` : "/admin/audit/monitoring"

  return apiRequest<AdminMonitoringOverview>(path, {
    method: "GET",
    token,
  })
}

export interface AdminBackupCollectionInfo {
  name: string
  count: number
}

export type AdminBackupStorageProvider = "local" | "cloudinary" | "r2"
export type AdminBackupStatus = "ready" | "failed" | "purged"
export type AdminBackupTrigger = "manual" | "automatic"
export type AdminBackupScope = "database" | "selectedCollections"

export interface AdminBackupSettings {
  automaticEnabled: boolean
  rpoMinutes: number
  rtoMinutes: number
  backupScope: AdminBackupScope
  selectedCollections: string[]
  preferredStorage: AdminBackupStorageProvider
  localDownloadsEnabled: boolean
  keepLocalMirror: boolean
  retentionDays: number
  cloudFolder: string
  cloudinaryConfigured: boolean
  r2Configured: boolean
  nextRunAt?: string
  lastSuccessfulRunAt?: string
  lastAttemptAt?: string
  lastFailureAt?: string
  lastError?: string
  updatedAt?: string
}

export interface UpdateAdminBackupSettingsInput {
  automaticEnabled?: boolean
  rpoMinutes?: number
  rtoMinutes?: number
  backupScope?: AdminBackupScope
  selectedCollections?: string[]
  preferredStorage?: AdminBackupStorageProvider
  localDownloadsEnabled?: boolean
  keepLocalMirror?: boolean
  retentionDays?: number
  cloudFolder?: string
}

export interface AdminBackupStatusSummary {
  automaticEnabled: boolean
  preferredStorage: AdminBackupStorageProvider
  cloudinaryConfigured: boolean
  r2Configured: boolean
  nextRunAt?: string
  lastSuccessfulRunAt?: string
  lastFailureAt?: string
  lastError?: string
  totalReady: number
  totalFailed: number
  totalPurged: number
}

export interface AdminDatabaseBackup {
  id: string
  kind: "database"
  trigger: AdminBackupTrigger
  status: AdminBackupStatus
  createdAt: string
  backupPath: string
  totalCollections: number
  totalDocuments: number
  storageProvider: AdminBackupStorageProvider
  localAvailable: boolean
  remoteAvailable: boolean
  remoteUrl?: string
  remoteIdentifier?: string
  notes?: string
  errorMessage?: string
  bundleFileName?: string
  bundleFilePath?: string
  bundleSizeBytes?: number
  collections: Array<{
    collection: string
    count: number
  }>
}

export interface AdminCollectionBackup {
  id: string
  kind: "collection"
  trigger: AdminBackupTrigger
  status: AdminBackupStatus
  createdAt: string
  backupPath: string
  collection: string
  count: number
  fileName: string
  sizeBytes: number
  storageProvider: AdminBackupStorageProvider
  localAvailable: boolean
  remoteAvailable: boolean
  remoteUrl?: string
  remoteIdentifier?: string
  notes?: string
  errorMessage?: string
}

export type AdminBackupItem = AdminDatabaseBackup | AdminCollectionBackup
export type AdminBackupImportMode = "replace" | "append"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api"

export function listAdminBackupCollections(
  token: string,
): Promise<{ items: AdminBackupCollectionInfo[] }> {
  return apiRequest<{ items: AdminBackupCollectionInfo[] }>("/admin/backups/collections", {
    method: "GET",
    token,
  })
}

export function getAdminBackupSettings(token: string): Promise<AdminBackupSettings> {
  return apiRequest<AdminBackupSettings>("/admin/backups/settings", {
    method: "GET",
    token,
  })
}

export function updateAdminBackupSettings(
  payload: UpdateAdminBackupSettingsInput,
  token: string,
): Promise<AdminBackupSettings> {
  return apiRequest<AdminBackupSettings>("/admin/backups/settings", {
    method: "PATCH",
    body: payload,
    token,
  })
}

export function getAdminBackupStatus(token: string): Promise<AdminBackupStatusSummary> {
  return apiRequest<AdminBackupStatusSummary>("/admin/backups/status", {
    method: "GET",
    token,
  })
}

export function createAdminDatabaseBackup(
  token: string,
): Promise<AdminDatabaseBackup> {
  return apiRequest<AdminDatabaseBackup>("/admin/backups/database", {
    method: "POST",
    token,
  })
}

export function createAdminCollectionBackup(
  collection: string,
  token: string,
): Promise<AdminCollectionBackup> {
  return apiRequest<AdminCollectionBackup>("/admin/backups/collection", {
    method: "POST",
    token,
    body: { collection },
  })
}

export function runAdminBackupPolicy(
  token: string,
): Promise<{ scope: AdminBackupScope; created: AdminBackupItem[] }> {
  return apiRequest<{ scope: AdminBackupScope; created: AdminBackupItem[] }>(
    "/admin/backups/run-policy",
    {
      method: "POST",
      token,
    },
  )
}

export function listAdminBackups(
  token: string,
  limit = 20,
): Promise<{ items: AdminBackupItem[] }> {
  const query = new URLSearchParams()
  query.set("limit", String(limit))

  return apiRequest<{ items: AdminBackupItem[] }>(`/admin/backups?${query.toString()}`, {
    method: "GET",
    token,
  })
}

export interface AdminImportBackupResult {
  backupId: string
  kind: AdminBackupItem["kind"]
  mode: AdminBackupImportMode
  importedAt: string
  collections: Array<{
    collection: string
    totalInBackup: number
    inserted: number
    replaced: number
    skipped: number
  }>
}

export function importAdminBackup(
  backupId: string,
  mode: AdminBackupImportMode,
  token: string,
): Promise<AdminImportBackupResult> {
  return apiRequest<AdminImportBackupResult>("/admin/backups/import", {
    method: "POST",
    body: { backupId, mode },
    token,
  })
}

export async function exportAdminBackup(
  backupId: string,
  token: string,
): Promise<{ blob: Blob; fileName: string }> {
  return downloadAdminFile(`/admin/backups/export/${backupId}`, token, `${backupId}.json`)
}
