"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Activity,
  AlertTriangle,
  Clock3,
  Cpu,
  Database,
  Gauge,
  HardDrive,
  Network,
  RefreshCw,
  Server,
  ShieldCheck,
  Users,
} from "lucide-react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts"
import { AdminAuditSection } from "@/components/admin/admin-audit-section"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getAccessToken } from "@/lib/auth/token-storage"
import { getAdminMonitoringOverview, type AdminMonitoringOverview } from "@/lib/admin/admin-api"
import { cn } from "@/lib/utils"

const REFRESH_INTERVAL_MS = 15_000
const WINDOW_OPTIONS = [
  { value: "15", label: "15 min" },
  { value: "60", label: "60 min" },
  { value: "180", label: "3 horas" },
  { value: "1440", label: "24 horas" },
]
const PIE_COLORS = ["#166534", "#0f766e", "#f59e0b", "#dc2626", "#64748b", "#7c3aed"]

function formatCompactNumber(value = 0): string {
  return new Intl.NumberFormat("es-MX", {
    notation: "compact",
    maximumFractionDigits: value >= 100 ? 0 : 1,
  }).format(value)
}

function formatInteger(value = 0): string {
  return new Intl.NumberFormat("es-MX", {
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDecimal(value = 0, digits = 1): string {
  return new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value)
}

function formatBytes(value = 0): string {
  if (!Number.isFinite(value) || value <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  let current = value
  let index = 0

  while (current >= 1024 && index < units.length - 1) {
    current /= 1024
    index += 1
  }

  return `${formatDecimal(current, current >= 100 ? 0 : 1)} ${units[index]}`
}

function formatDateTime(value?: string): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function formatTime(value?: string): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function formatRelative(value?: string): string {
  if (!value) return "Sin actividad"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Sin actividad"

  const diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60_000))
  if (diffMinutes < 1) return "Hace instantes"
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `Hace ${diffHours} h`

  const diffDays = Math.round(diffHours / 24)
  return `Hace ${diffDays} d`
}

function methodLabel(value: string): string {
  if (value === "GET") return "GET"
  if (value === "POST") return "POST"
  if (value === "PATCH") return "PATCH"
  if (value === "PUT") return "PUT"
  if (value === "DELETE") return "DELETE"
  return value
}

function collectionActivityLabel(value: AdminMonitoringOverview["collections"][number]["activityLevel"]): string {
  if (value === "hot") return "Alta"
  if (value === "warm") return "Media"
  return "Baja"
}

function userActivityLabel(value: AdminMonitoringOverview["users"]["spotlightUsers"][number]["activityLevel"]): string {
  if (value === "online") return "En linea"
  if (value === "recent") return "Reciente"
  return "Inactivo"
}

function ActivityBadge({
  value,
  kind,
}: {
  value: "hot" | "warm" | "idle" | "online" | "recent"
  kind: "collection" | "user"
}) {
  const isStrong = value === "hot" || value === "online"
  const isMedium = value === "warm" || value === "recent"

  return (
    <Badge
      variant="outline"
      className={cn(
        "border-transparent",
        isStrong && "bg-emerald-500/10 text-emerald-700",
        isMedium && "bg-amber-500/10 text-amber-700",
        !isStrong && !isMedium && "bg-slate-500/10 text-slate-700",
      )}
    >
      {kind === "collection"
        ? collectionActivityLabel(value as "hot" | "warm" | "idle")
        : userActivityLabel(value as "online" | "recent" | "idle")}
    </Badge>
  )
}

function CapabilityBadge({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <Badge
      variant={enabled ? "default" : "outline"}
      className={cn(!enabled && "bg-transparent text-muted-foreground")}
    >
      {label}
    </Badge>
  )
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string
  value: string
  description: string
  icon: typeof Activity
}) {
  return (
    <Card className="admin-section-card min-h-[8.8rem] bg-card/90">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <CardDescription>{title}</CardDescription>
            <CardTitle className="text-2xl tracking-tight">{value}</CardTitle>
          </div>
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 text-xs text-muted-foreground">{description}</CardContent>
    </Card>
  )
}

function MonitoringSkeleton() {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={`metric-${index}`} className="h-32 animate-pulse rounded-2xl border border-border/60 bg-card/70" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="h-[340px] animate-pulse rounded-2xl border border-border/60 bg-card/70" />
        <div className="h-[340px] animate-pulse rounded-2xl border border-border/60 bg-card/70" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="h-[360px] animate-pulse rounded-2xl border border-border/60 bg-card/70" />
        <div className="h-[360px] animate-pulse rounded-2xl border border-border/60 bg-card/70" />
      </div>
    </div>
  )
}

export function AdminMonitoringSection() {
  const [tab, setTab] = useState("realtime")
  const [windowMinutes, setWindowMinutes] = useState("60")
  const [overview, setOverview] = useState<AdminMonitoringOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [autoRefresh, setAutoRefresh] = useState(true)

  const loadOverview = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setOverview(null)
      setErrorMessage("No se encontro token de acceso")
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setErrorMessage("")

    try {
      const response = await getAdminMonitoringOverview(token, {
        windowMinutes: Number(windowMinutes),
        topCollections: 8,
      })

      setOverview(response)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo cargar el monitoreo"
      setErrorMessage(message)
      setOverview(null)
    } finally {
      setIsLoading(false)
    }
  }, [windowMinutes])

  useEffect(() => {
    void loadOverview()
  }, [loadOverview])

  useEffect(() => {
    if (!autoRefresh || tab !== "realtime") return

    const intervalId = window.setInterval(() => {
      void loadOverview()
    }, REFRESH_INTERVAL_MS)

    return () => window.clearInterval(intervalId)
  }, [autoRefresh, loadOverview, tab])

  const timelineData = useMemo(
    () =>
      (overview?.traffic.timeline ?? []).map((item) => ({
        ...item,
        label: formatTime(item.bucketStart),
      })),
    [overview],
  )

  const collectionChartData = useMemo(
    () =>
      (overview?.collections ?? []).map((item) => ({
        ...item,
        shortName: item.name.length > 18 ? `${item.name.slice(0, 18)}...` : item.name,
      })),
    [overview],
  )

  const methodChartData = useMemo(
    () =>
      (overview?.traffic.methods ?? []).map((item, index) => ({
        ...item,
        label: methodLabel(item.key),
        fill: PIE_COLORS[index % PIE_COLORS.length],
      })),
    [overview],
  )

  const systemMemoryPercent = useMemo(() => {
    if (!overview) return 0
    const total = overview.runtime.systemMemoryBytes.total
    const used = overview.runtime.systemMemoryBytes.used
    return total > 0 ? (used / total) * 100 : 0
  }, [overview])

  const mongoCachePercent = useMemo(() => {
    if (!overview) return 0
    const max = overview.database.cacheMaxBytes
    const used = overview.database.cacheUsedBytes
    return max > 0 ? (used / max) * 100 : 0
  }, [overview])

  return (
    <section className="admin-panel-shell admin-animate-card">
      <div className="relative z-10">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="h-4 w-4" />
            Monitoreo operativo
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-primary">
            Salud del sistema, base de datos y actividad
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Trafico, recursos y actividad del panel en una sola vista.
          </p>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="mt-6 gap-4">
          <div className="admin-toolbar-surface space-y-4 px-4 py-4 lg:sticky lg:top-0 lg:z-20">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Centro de lectura</span>
                <Badge variant="outline">Cadencia: {REFRESH_INTERVAL_MS / 1000}s</Badge>
                <Badge variant="outline">
                  Ultima lectura: {overview ? formatDateTime(overview.generatedAt) : "-"}
                </Badge>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                <div className="min-w-[150px]">
                  <Select value={windowMinutes} onValueChange={setWindowMinutes}>
                    <SelectTrigger className="admin-input-surface">
                      <SelectValue placeholder="Ventana" />
                    </SelectTrigger>
                    <SelectContent>
                      {WINDOW_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="button"
                  variant={autoRefresh ? "default" : "outline"}
                  onClick={() => setAutoRefresh((prev) => !prev)}
                >
                  <Clock3 className="mr-2 h-4 w-4" />
                  {autoRefresh ? "Auto-refresh activo" : "Auto-refresh pausado"}
                </Button>

                <Button type="button" variant="outline" onClick={() => void loadOverview()} disabled={isLoading}>
                  <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
                  Refrescar
                </Button>
              </div>
            </div>

            <TabsList className="admin-tab-surface">
              <TabsTrigger value="realtime">Tiempo real</TabsTrigger>
              <TabsTrigger value="audit">Auditoria</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="realtime" className="mt-4">
            {errorMessage ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <p className="inline-flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </p>
              </div>
            ) : isLoading && !overview ? (
              <MonitoringSkeleton />
            ) : overview ? (
              <div className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    title="Solicitudes en ventana"
                    value={formatCompactNumber(overview.traffic.totalRequests)}
                    description={`${overview.windowMinutes} min observados`}
                    icon={Activity}
                  />
                  <MetricCard
                    title="Tasa de exito"
                    value={`${formatDecimal(overview.traffic.successRate)}%`}
                    description={`${formatInteger(overview.traffic.failedRequests)} fallos`}
                    icon={Gauge}
                  />
                  <MetricCard
                    title="Usuarios activos"
                    value={formatInteger(overview.users.activeLast5Minutes)}
                    description={`${formatInteger(overview.users.activeLast60Minutes)} en 60 min`}
                    icon={Users}
                  />
                  <MetricCard
                    title="Conexiones Mongo"
                    value={formatInteger(overview.database.activeConnections)}
                    description={`${formatInteger(overview.database.availableConnections)} libres`}
                    icon={Database}
                  />
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
                  <Card className="admin-section-card bg-card/90">
                    <CardHeader>
                      <CardTitle className="text-lg">Trafico y errores</CardTitle>
                      <CardDescription>
                        Flujo de solicitudes agrupado cada {overview.bucketMinutes} minutos.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer
                        config={{
                          totalRequests: { label: "Solicitudes", color: "#166534" },
                          failedRequests: { label: "Errores", color: "#dc2626" },
                        }}
                        className="h-[300px] w-full aspect-auto"
                      >
                        <AreaChart data={timelineData}>
                          <defs>
                            <linearGradient id="fillRequests" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--color-totalRequests)" stopOpacity={0.28} />
                              <stop offset="95%" stopColor="var(--color-totalRequests)" stopOpacity={0.02} />
                            </linearGradient>
                            <linearGradient id="fillErrors" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--color-failedRequests)" stopOpacity={0.22} />
                              <stop offset="95%" stopColor="var(--color-failedRequests)" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
                          <YAxis tickLine={false} axisLine={false} width={34} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <ChartLegend content={<ChartLegendContent />} />
                          <Area
                            type="monotone"
                            dataKey="totalRequests"
                            stroke="var(--color-totalRequests)"
                            fill="url(#fillRequests)"
                            strokeWidth={2}
                          />
                          <Area
                            type="monotone"
                            dataKey="failedRequests"
                            stroke="var(--color-failedRequests)"
                            fill="url(#fillErrors)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  <Card className="admin-section-card bg-card/90">
                    <CardHeader>
                      <CardTitle className="text-lg">Mix de metodos HTTP</CardTitle>
                      <CardDescription>
                        Distribucion por metodo.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ChartContainer
                        config={Object.fromEntries(
                          methodChartData.map((item) => [item.key, { label: item.label, color: item.fill }]),
                        )}
                        className="h-[220px] w-full aspect-auto"
                      >
                        <PieChart>
                          <ChartTooltip
                            content={
                              <ChartTooltipContent
                                formatter={(value, name) => (
                                  <div className="flex w-full items-center justify-between gap-3">
                                    <span>{methodLabel(String(name))}</span>
                                    <span className="font-mono">{formatInteger(Number(value))}</span>
                                  </div>
                                )}
                              />
                            }
                          />
                          <Pie
                            data={methodChartData}
                            dataKey="value"
                            nameKey="key"
                            innerRadius={54}
                            outerRadius={82}
                            paddingAngle={2}
                          >
                            {methodChartData.map((entry) => (
                              <Cell key={entry.key} fill={entry.fill} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ChartContainer>

                      <div className="space-y-2">
                        {methodChartData.map((item) => (
                          <div key={item.key} className="flex items-center justify-between rounded-xl border border-border/60 bg-secondary/20 px-3 py-2 text-sm">
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: item.fill }}
                              />
                              <span>{item.label}</span>
                            </div>
                            <span className="font-medium">{formatInteger(item.value)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
                  <Card className="admin-section-card bg-card/90">
                    <CardHeader>
                      <CardTitle className="text-lg">Colecciones mas pesadas</CardTitle>
                      <CardDescription>
                        Comparativa por almacenamiento.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer
                        config={{
                          storageSizeBytes: { label: "Peso", color: "#166534" },
                        }}
                        className="h-[320px] w-full aspect-auto"
                      >
                        <BarChart data={collectionChartData} layout="vertical" margin={{ left: 12, right: 8 }}>
                          <CartesianGrid horizontal={false} />
                          <XAxis
                            type="number"
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => formatCompactNumber(Number(value))}
                          />
                          <YAxis
                            dataKey="shortName"
                            type="category"
                            tickLine={false}
                            axisLine={false}
                            width={110}
                          />
                          <ChartTooltip
                            content={
                              <ChartTooltipContent
                                formatter={(value, _name, item) => (
                                  <div className="flex w-full flex-col gap-1">
                                    <div className="flex items-center justify-between gap-3">
                                      <span className="text-muted-foreground">{String(item.payload.name)}</span>
                                      <span className="font-mono">{formatBytes(Number(value))}</span>
                                    </div>
                                    <span className="text-[11px] text-muted-foreground">
                                      {formatInteger(Number(item.payload.documents))} documentos
                                    </span>
                                  </div>
                                )}
                              />
                            }
                          />
                          <Bar dataKey="storageSizeBytes" fill="var(--color-storageSizeBytes)" radius={[0, 10, 10, 0]} />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  <Card className="admin-section-card bg-card/90">
                    <CardHeader>
                      <CardTitle className="text-lg">Recursos y motor</CardTitle>
                      <CardDescription>
                        Backend y metricas de Mongo.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-border/60 bg-secondary/20 p-3">
                          <p className="text-xs text-muted-foreground">Peso base</p>
                          <p className="mt-1 text-lg font-semibold">{formatBytes(overview.database.storageSizeBytes)}</p>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-secondary/20 p-3">
                          <p className="text-xs text-muted-foreground">Indices</p>
                          <p className="mt-1 text-lg font-semibold">{formatBytes(overview.database.indexSizeBytes)}</p>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-secondary/20 p-3">
                          <p className="text-xs text-muted-foreground">CPU backend</p>
                          <p className="mt-1 text-lg font-semibold">{formatDecimal(overview.runtime.processCpuPercent)}%</p>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-secondary/20 p-3">
                          <p className="text-xs text-muted-foreground">Uptime Mongo</p>
                          <p className="mt-1 text-lg font-semibold">{formatCompactNumber(overview.database.uptimeSeconds / 3600)} h</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-2">
                              <Server className="h-3.5 w-3.5" />
                              Memoria del host
                            </span>
                            <span>{formatBytes(overview.runtime.systemMemoryBytes.used)} / {formatBytes(overview.runtime.systemMemoryBytes.total)}</span>
                          </div>
                          <Progress value={systemMemoryPercent} />
                        </div>

                        <div>
                          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-2">
                              <HardDrive className="h-3.5 w-3.5" />
                              Cache Mongo
                            </span>
                            <span>{formatBytes(overview.database.cacheUsedBytes)} / {formatBytes(overview.database.cacheMaxBytes)}</span>
                          </div>
                          <Progress value={mongoCachePercent} />
                        </div>

                        <div>
                          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-2">
                              <Cpu className="h-3.5 w-3.5" />
                              Memoria del proceso
                            </span>
                            <span>{formatBytes(overview.runtime.processMemoryBytes.rss)}</span>
                          </div>
                          <Progress
                            value={
                              overview.runtime.systemMemoryBytes.total > 0
                                ? (overview.runtime.processMemoryBytes.rss /
                                    overview.runtime.systemMemoryBytes.total) *
                                  100
                                : 0
                            }
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <CapabilityBadge enabled={overview.database.capabilities.dbStats} label="dbStats" />
                        <CapabilityBadge enabled={overview.database.capabilities.collStats} label="collStats" />
                        <CapabilityBadge enabled={overview.database.capabilities.serverStatus} label="serverStatus" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                  <Card className="admin-section-card bg-card/90">
                    <CardHeader>
                      <CardTitle className="text-lg">Colecciones monitorizadas</CardTitle>
                      <CardDescription>
                        Tamano, volumen y actividad reciente.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="admin-table-scroll">
                      <Table>
                        <TableHeader>
                          <TableRow className="admin-table-head-row">
                            <TableHead className="admin-table-head-cell">Coleccion</TableHead>
                            <TableHead className="admin-table-head-cell">Actividad</TableHead>
                            <TableHead className="admin-table-head-cell">Docs</TableHead>
                            <TableHead className="admin-table-head-cell">Peso</TableHead>
                            <TableHead className="admin-table-head-cell">Indices</TableHead>
                            <TableHead className="admin-table-head-cell">Req.</TableHead>
                            <TableHead className="admin-table-head-cell">Ultima actividad</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="admin-table-body-compact">
                          {overview.collections.map((item) => (
                            <TableRow key={item.name}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{item.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDecimal(item.documentSharePercent)}% de documentos
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <ActivityBadge value={item.activityLevel} kind="collection" />
                              </TableCell>
                              <TableCell>{formatInteger(item.documents)}</TableCell>
                              <TableCell>
                                <div>
                                  <p>{formatBytes(item.storageSizeBytes)}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDecimal(item.sizeSharePercent)}% del total
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>{formatBytes(item.totalIndexSizeBytes)}</TableCell>
                              <TableCell>
                                <div>
                                  <p>{formatInteger(item.totalRequests)}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatInteger(item.failedRequests)} fallos
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>{formatRelative(item.lastActivityAt)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="admin-section-card bg-card/90">
                    <CardHeader>
                      <CardTitle className="text-lg">Usuarios y rutas calientes</CardTitle>
                      <CardDescription>
                        Actividad reciente y rutas mas usadas.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-border/60 bg-secondary/20 p-3">
                          <p className="text-xs text-muted-foreground">Total usuarios</p>
                          <p className="mt-1 text-lg font-semibold">{formatInteger(overview.users.total)}</p>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-secondary/20 p-3">
                          <p className="text-xs text-muted-foreground">Nuevos 24h</p>
                          <p className="mt-1 text-lg font-semibold">{formatInteger(overview.users.recentlyRegistered)}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {overview.users.spotlightUsers.map((user) => (
                          <div key={user.userId} className="rounded-xl border border-border/60 bg-secondary/15 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium">{user.name}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                              </div>
                              <ActivityBadge value={user.activityLevel} kind="user" />
                            </div>
                            <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
                              <p>
                                <span className="font-medium text-foreground">Rol:</span> {user.role}
                              </p>
                              <p>
                                <span className="font-medium text-foreground">Ultimo acceso:</span>{" "}
                                {formatRelative(user.lastSeenAt)}
                              </p>
                              <p>
                                <span className="font-medium text-foreground">Req. en ventana:</span>{" "}
                                {formatInteger(user.requestsLastWindow)}
                              </p>
                              <p>
                                <span className="font-medium text-foreground">Ultima ruta:</span>{" "}
                                {user.lastRoute ?? "-"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-3 rounded-xl border border-border/60 bg-secondary/15 p-3">
                        <div className="flex items-center gap-2">
                          <Network className="h-4 w-4 text-primary" />
                          <p className="font-medium">Rutas con mayor presion</p>
                        </div>
                        <div className="space-y-2">
                          {overview.traffic.topRoutes.map((route) => (
                            <div key={route.route} className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-sm font-medium">{route.route}</p>
                                <Badge variant="secondary">{formatInteger(route.totalRequests)}</Badge>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {formatDecimal(route.avgResponseTimeMs)} ms promedio - {formatInteger(route.failedRequests)} fallos
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {overview.database.notes.length > 0 && (
                  <div className="rounded-xl border border-amber-300/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900">
                    <p className="inline-flex items-start gap-2 font-medium">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>Observaciones del monitoreo</span>
                    </p>
                    <ul className="mt-2 space-y-1 text-xs">
                      {overview.database.notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-border/60 bg-secondary/20 px-4 py-8 text-center text-sm text-muted-foreground">
                Sin datos de monitoreo.
              </div>
            )}
          </TabsContent>

          <TabsContent value="audit" className="mt-4">
            <AdminAuditSection />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}
