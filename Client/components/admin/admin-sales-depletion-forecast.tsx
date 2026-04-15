"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  Clock3,
  Droplets,
  FlaskConical,
  LineChart,
  Loader2,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AdminSalesAPI, type DepletionForecast } from "@/lib/admin/admin-sales-api"
import { cn } from "@/lib/utils"

interface ForecastProductOption {
  id: string
  name: string
  category: string
  image?: string
  presentation?: string
  totalSales: number
}

interface AdminSalesDepletionForecastProps {
  products: ForecastProductOption[]
  defaultProductId?: string | null
}

type ForecastRangePreset = "all" | "last30" | "currentMonth" | "custom"

const numberFormatter = new Intl.NumberFormat("es-MX", {
  maximumFractionDigits: 2,
})

const rateFormatter = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 4,
  maximumFractionDigits: 6,
})

function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

function formatMl(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-"
  return `${numberFormatter.format(value)} ml`
}

function formatUnits(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-"
  return `${numberFormatter.format(value)} piezas`
}

function formatDays(value?: number | null): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Sin dato"
  }
  if (value <= 0) return "0 dias"
  return `${numberFormatter.format(value)} dias`
}

function formatDate(value?: string | null): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function shiftDays(date: Date, days: number): Date {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

function formatRateK(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-"
  return `${value > 0 ? "+" : ""}${rateFormatter.format(value)}`
}

function getStatusTone(status: DepletionForecast["forecast"]["status"]) {
  switch (status) {
    case "critical":
      return {
        badge: "border-rose-200 bg-rose-50 text-rose-700",
        panel: "border-rose-200/80 bg-rose-50/70",
        label: "Critico",
      }
    case "warning":
      return {
        badge: "border-amber-200 bg-amber-50 text-amber-700",
        panel: "border-amber-200/80 bg-amber-50/70",
        label: "En vigilancia",
      }
    case "no_sales":
      return {
        badge: "border-sky-200 bg-sky-50 text-sky-700",
        panel: "border-sky-200/80 bg-sky-50/70",
        label: "Sin ventas",
      }
    case "not_configured":
      return {
        badge: "border-slate-200 bg-slate-50 text-slate-700",
        panel: "border-slate-200/80 bg-slate-50/80",
        label: "Falta configurar",
      }
    case "ready":
    default:
      return {
        badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
        panel: "border-emerald-200/80 bg-emerald-50/70",
        label: "Controlado",
      }
  }
}

function getTrendTone(trend: DepletionForecast["analysis"]["trend"]) {
  switch (trend) {
    case "growth":
      return {
        badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
        label: "Crecimiento",
        icon: TrendingUp,
      }
    case "decline":
      return {
        badge: "border-amber-200 bg-amber-50 text-amber-700",
        label: "Decrecimiento",
        icon: TrendingDown,
      }
    case "stable":
    default:
      return {
        badge: "border-border/70 bg-secondary/35 text-muted-foreground",
        label: "Estable",
        icon: LineChart,
      }
  }
}

function SummaryCard({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string
  value: string
  helper: string
  tone?: "default" | "critical"
}) {
  return (
    <div
      className={cn(
        "admin-metric-card min-h-[6rem] p-4",
        tone === "critical" && "border-amber-200/70 bg-amber-50/60",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{helper}</p>
    </div>
  )
}

function DepletionChart({ forecast }: { forecast: DepletionForecast }) {
  const actualPoints = forecast.chart.actualPoints
  const projectedPoint = forecast.chart.projectedPoint ?? null

  const geometry = useMemo(() => {
    if (actualPoints.length === 0) return null

    const width = 760
    const height = 300
    const padding = { top: 22, right: 24, bottom: 38, left: 58 }
    const projectedDate =
      projectedPoint?.date ?? actualPoints[actualPoints.length - 1]?.date
    const startMs = new Date(actualPoints[0].date).getTime()
    const endMs = new Date(projectedDate).getTime()
    const maxStock = Math.max(
      1,
      forecast.chart.initialStockMl ?? 0,
      forecast.chart.criticalLevelMl ?? 0,
      ...actualPoints.map((point) => point.stockMl),
      projectedPoint?.stockMl ?? 0,
    )
    const minStock = 0
    const plotWidth = width - padding.left - padding.right
    const plotHeight = height - padding.top - padding.bottom

    const xFor = (date: string) => {
      const currentMs = new Date(date).getTime()
      if (endMs <= startMs) return padding.left + plotWidth / 2
      return (
        padding.left +
        ((currentMs - startMs) / Math.max(1, endMs - startMs)) * plotWidth
      )
    }

    const yFor = (stockMl: number) => {
      const ratio = (stockMl - minStock) / Math.max(1, maxStock - minStock)
      return padding.top + (1 - ratio) * plotHeight
    }

    const actualPath = actualPoints
      .map((point, index) => {
        const x = xFor(point.date)
        const y = yFor(point.stockMl)
        return `${index === 0 ? "M" : "L"} ${x} ${y}`
      })
      .join(" ")

    const projectedCurvePoints =
      projectedPoint && actualPoints.length > 0
        ? (() => {
            const lastActual = actualPoints[actualPoints.length - 1]
            const lastActualMs = new Date(lastActual.date).getTime()
            const projectedMs = new Date(projectedPoint.date).getTime()
            const totalDays = Math.max(
              1,
              (forecast.forecast.remainingDaysToCritical ??
                forecast.forecast.estimatedDaysToCritical ??
                1),
            )
            const sampleCount = Math.max(16, Math.min(48, Math.ceil(totalDays)))
            const points = Array.from({ length: sampleCount + 1 }, (_, index) => {
              const ratio = index / sampleCount
              const deltaDays = totalDays * ratio
              const date = new Date(
                lastActualMs + (projectedMs - lastActualMs) * ratio,
              ).toISOString()
              const stockMl =
                index === sampleCount
                  ? projectedPoint.stockMl
                  : Math.max(
                      projectedPoint.stockMl,
                      lastActual.stockMl *
                        Math.exp(forecast.analysis.exponentialRateK * deltaDays),
                    )
              return { date, stockMl }
            })
            return points
          })()
        : null

    const projectedPath =
      projectedCurvePoints && projectedCurvePoints.length > 0
        ? projectedCurvePoints
            .map((point, index) => {
              const x = xFor(point.date)
              const y = yFor(point.stockMl)
              return `${index === 0 ? "M" : "L"} ${x} ${y}`
            })
            .join(" ")
        : null

    const yTicks = [0, 0.33, 0.66, 1].map((ratio) => {
      const value = maxStock * ratio
      return {
        value,
        y: yFor(value),
      }
    })

    return {
      width,
      height,
      padding,
      xFor,
      yFor,
      actualPath,
      projectedPath,
      projectedCurvePoints,
      yTicks,
    }
  }, [actualPoints, forecast.chart.criticalLevelMl, forecast.chart.initialStockMl, projectedPoint])

  if (!geometry) {
    return (
      <div className="admin-empty-state max-w-none">
        <p className="text-sm font-medium">Sin datos para graficar</p>
      </div>
    )
  }

  const lastActualPoint = actualPoints[actualPoints.length - 1]

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <div className="min-w-[680px] rounded-xl border border-border/60 bg-background/80 p-3">
          <svg
            viewBox={`0 0 ${geometry.width} ${geometry.height}`}
            className="h-[19rem] w-full"
            role="img"
            aria-label="Grafica de prediccion de agotamiento con modelo exponencial. Eje vertical: materia prima en mililitros. Eje horizontal: tiempo."
          >
            <defs>
              <linearGradient id="forecast-line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgb(22 163 74)" />
                <stop offset="100%" stopColor="rgb(59 130 246)" />
              </linearGradient>
            </defs>

            {geometry.yTicks.map((tick) => (
              <g key={`tick-${tick.value}`}>
                <line
                  x1={geometry.padding.left}
                  x2={geometry.width - geometry.padding.right}
                  y1={tick.y}
                  y2={tick.y}
                  stroke="rgba(148, 163, 184, 0.22)"
                  strokeDasharray="4 6"
                />
                <text
                  x={geometry.padding.left - 10}
                  y={tick.y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="rgba(100, 116, 139, 1)"
                >
                  {formatNumber(tick.value)}
                </text>
              </g>
            ))}

            {typeof forecast.chart.criticalLevelMl === "number" ? (
              <line
                x1={geometry.padding.left}
                x2={geometry.width - geometry.padding.right}
                y1={geometry.yFor(forecast.chart.criticalLevelMl)}
                y2={geometry.yFor(forecast.chart.criticalLevelMl)}
                stroke="rgba(225, 29, 72, 0.9)"
                strokeDasharray="8 6"
              />
            ) : null}

            <path
              d={geometry.actualPath}
              fill="none"
              stroke="url(#forecast-line-gradient)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {geometry.projectedPath ? (
              <path
                d={geometry.projectedPath}
                fill="none"
                stroke="rgba(245, 158, 11, 0.95)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="10 8"
                strokeLinejoin="round"
              />
            ) : null}

            {actualPoints.map((point, index) => {
              const isLast = index === actualPoints.length - 1
              return (
                <circle
                  key={`${point.date}-${point.kind}-${index}`}
                  cx={geometry.xFor(point.date)}
                  cy={geometry.yFor(point.stockMl)}
                  r={isLast ? 5.5 : 4}
                  fill={isLast ? "rgb(22 163 74)" : "rgb(15 23 42)"}
                  opacity={isLast ? 1 : 0.8}
                />
              )
            })}

            {projectedPoint ? (
              <circle
                cx={geometry.xFor(projectedPoint.date)}
                cy={geometry.yFor(projectedPoint.stockMl)}
                r="5"
                fill="rgb(245 158 11)"
              />
            ) : null}

            <text
              x={geometry.padding.left}
              y={geometry.height - 10}
              fontSize="11"
              fill="rgba(100, 116, 139, 1)"
            >
              {actualPoints[0]?.label}
            </text>
            <text
              x={geometry.xFor(lastActualPoint.date)}
              y={geometry.height - 10}
              textAnchor="middle"
              fontSize="11"
              fill="rgba(100, 116, 139, 1)"
            >
              {lastActualPoint.label}
            </text>
            {projectedPoint ? (
              <text
                x={geometry.width - geometry.padding.right}
                y={geometry.height - 10}
                textAnchor="end"
                fontSize="11"
                fill="rgba(100, 116, 139, 1)"
              >
                {projectedPoint.label}
              </text>
            ) : null}

            <text
              x={18}
              y={geometry.height / 2}
              transform={`rotate(-90 18 ${geometry.height / 2})`}
              fontSize="11"
              fill="rgba(100, 116, 139, 1)"
            >
              Materia prima (ml)
            </text>
            <text
              x={geometry.width / 2}
              y={geometry.height}
              textAnchor="middle"
              fontSize="11"
              fill="rgba(100, 116, 139, 1)"
            >
              Tiempo
            </text>
          </svg>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-primary" />
          Consumo estimado acumulado
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-5 bg-amber-500" />
          Proyeccion exponencial
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-5 bg-rose-500" />
          Nivel critico
        </span>
      </div>
    </div>
  )
}

export function AdminSalesDepletionForecast({
  products,
  defaultProductId,
}: AdminSalesDepletionForecastProps) {
  const todayInputValue = useMemo(() => toDateInputValue(new Date()), [])
  const monthStartInputValue = useMemo(() => {
    const now = new Date()
    return toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1))
  }, [])
  const last30StartInputValue = useMemo(
    () => toDateInputValue(shiftDays(new Date(), -29)),
    [],
  )
  const [selectedProductId, setSelectedProductId] = useState(
    defaultProductId ?? products[0]?.id ?? "",
  )
  const [rangePreset, setRangePreset] = useState<ForecastRangePreset>("all")
  const [customStartDate, setCustomStartDate] = useState(monthStartInputValue)
  const [customEndDate, setCustomEndDate] = useState(todayInputValue)
  const [appliedCustomRange, setAppliedCustomRange] = useState<{
    startDate?: string
    endDate?: string
  }>({})
  const [forecastByProduct, setForecastByProduct] = useState<
    Record<string, DepletionForecast>
  >({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const productSignature = useMemo(
    () => products.map((product) => product.id).join("|"),
    [products],
  )

  useEffect(() => {
    setForecastByProduct({})
  }, [productSignature])

  const activeRange = useMemo(() => {
    switch (rangePreset) {
      case "last30":
        return {
          startDate: last30StartInputValue,
          endDate: todayInputValue,
        }
      case "currentMonth":
        return {
          startDate: monthStartInputValue,
          endDate: todayInputValue,
        }
      case "custom":
        return appliedCustomRange
      case "all":
      default:
        return {}
    }
  }, [
    appliedCustomRange,
    last30StartInputValue,
    monthStartInputValue,
    rangePreset,
    todayInputValue,
  ])

  const forecastCacheKey = useMemo(
    () =>
      [
        selectedProductId,
        activeRange.startDate ?? "all",
        activeRange.endDate ?? "all",
      ].join("|"),
    [activeRange.endDate, activeRange.startDate, selectedProductId],
  )

  const rangeSummary = useMemo(() => {
    if (!activeRange.startDate && !activeRange.endDate) {
      return "Historico completo"
    }

    return `${formatDate(activeRange.startDate)} - ${formatDate(activeRange.endDate)}`
  }, [activeRange.endDate, activeRange.startDate])

  useEffect(() => {
    if (!products.length) {
      setSelectedProductId("")
      return
    }

    if (
      selectedProductId &&
      products.some((product) => product.id === selectedProductId)
    ) {
      return
    }

    setSelectedProductId(defaultProductId ?? products[0]?.id ?? "")
  }, [defaultProductId, products, selectedProductId])

  const loadForecast = useCallback(async () => {
    if (!selectedProductId) return

    if (forecastByProduct[forecastCacheKey]) {
      setError(null)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const nextForecast = await AdminSalesAPI.getDepletionForecast(
        selectedProductId,
        activeRange,
      )
      setForecastByProduct((prev) => ({
        ...prev,
        [forecastCacheKey]: nextForecast,
      }))
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No pude calcular la prediccion de agotamiento.",
      )
    } finally {
      setLoading(false)
    }
  }, [activeRange, forecastByProduct, forecastCacheKey, selectedProductId])

  useEffect(() => {
    void loadForecast()
  }, [loadForecast])

  const forecast = selectedProductId ? forecastByProduct[forecastCacheKey] : null
  const selectedProduct =
    products.find((product) => product.id === selectedProductId) ?? null
  const statusTone = forecast ? getStatusTone(forecast.forecast.status) : null
  const trendTone = forecast ? getTrendTone(forecast.analysis.trend) : null

  const handleApplyCustomRange = () => {
    if (!customStartDate || !customEndDate) {
      setError("Selecciona fecha inicial y final para el analisis.")
      return
    }

    if (customStartDate > customEndDate) {
      setError("La fecha inicial no puede ser mayor a la fecha final.")
      return
    }

    setError(null)
    setAppliedCustomRange({
      startDate: customStartDate,
      endDate: customEndDate,
    })
  }

  if (!products.length) {
    return null
  }

  return (
    <div className="admin-table-shell">
      <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Prediccion operativa
          </p>
          <h4 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
            Prediccion de agotamiento
          </h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Estima el agotamiento de materia prima aplicando un modelo
            exponencial sobre el historial observado del producto.
          </p>
        </div>

        <div className="w-full sm:w-[18rem]">
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger className="admin-input-surface h-10">
              <SelectValue placeholder="Selecciona un producto" />
            </SelectTrigger>
            <SelectContent>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Periodo de analisis
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {rangeSummary}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-[12rem_repeat(2,minmax(0,1fr))_auto] md:items-end">
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Base temporal
            </p>
            <Select
              value={rangePreset}
              onValueChange={(value) => setRangePreset(value as ForecastRangePreset)}
            >
              <SelectTrigger className="admin-input-surface h-10">
                <SelectValue placeholder="Elige un rango" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Historico completo</SelectItem>
                <SelectItem value="last30">Ultimos 30 dias</SelectItem>
                <SelectItem value="currentMonth">Mes actual</SelectItem>
                <SelectItem value="custom">Rango manual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Inicio
            </span>
            <input
              type="date"
              value={customStartDate}
              onChange={(event) => setCustomStartDate(event.target.value)}
              disabled={rangePreset !== "custom"}
              className="admin-input-surface h-10 w-full px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Fin
            </span>
            <input
              type="date"
              value={customEndDate}
              onChange={(event) => setCustomEndDate(event.target.value)}
              disabled={rangePreset !== "custom"}
              className="admin-input-surface h-10 w-full px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>

          <Button
            type="button"
            variant={rangePreset === "custom" ? "default" : "outline"}
            className="h-10 rounded-lg"
            onClick={() => {
              if (rangePreset === "custom") {
                handleApplyCustomRange()
                return
              }

              setError(null)
            }}
            disabled={rangePreset !== "custom"}
          >
            Aplicar
          </Button>
        </div>
      </div>

      <div className="p-4">
        {error ? (
          <div className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {!forecast && loading ? (
          <div className="admin-empty-state max-w-none py-10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-sm font-medium">Calculando prediccion...</p>
          </div>
        ) : forecast ? (
          <div
            key={forecast.product.id}
            className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 space-y-4 motion-safe:duration-500"
          >
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_15rem]">
              <div className="admin-section-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FlaskConical className="h-5 w-5" />
                    </div>
                    <h5 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                      {forecast.product.name}
                    </h5>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {forecast.configuration.rawMaterialName ??
                        "Materia prima sin definir"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {statusTone ? (
                      <Badge
                        variant="outline"
                        className={cn("rounded-full", statusTone.badge)}
                      >
                        {statusTone.label}
                      </Badge>
                    ) : null}
                    {trendTone ? (
                      <Badge
                        variant="outline"
                        className={cn("rounded-full", trendTone.badge)}
                      >
                        <trendTone.icon className="mr-1.5 h-3.5 w-3.5" />
                        {trendTone.label}
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-primary/15 bg-primary/[0.05] px-4 py-3 text-sm text-foreground">
                  <div className="flex items-start gap-3">
                    <Droplets className="mt-0.5 h-4 w-4 text-primary" />
                    <p>
                      Calculamos la prediccion con la ley de crecimiento y
                      decrecimiento, usando{" "}
                      <span className="font-semibold">M(t) = M0 e^(k t)</span>,
                      el stock inicial, el stock estimado observado y el
                      periodo real analizado.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                  <SummaryCard
                    label="Stock inicial"
                    value={formatMl(forecast.configuration.initialStockMl)}
                    helper="Materia prima registrada para el analisis"
                  />
                  <SummaryCard
                    label="Stock estimado"
                    value={formatMl(forecast.forecast.estimatedCurrentStockMl)}
                    helper="Al cierre del periodo analizado"
                    tone={
                      forecast.forecast.status === "critical" ? "critical" : "default"
                    }
                  />
                  <SummaryCard
                    label="Consumo acumulado"
                    value={formatMl(forecast.analysis.accumulatedConsumptionMl)}
                    helper="Ventas registradas x consumo por pieza"
                  />
                  <SummaryCard
                    label="Nivel critico"
                    value={formatMl(forecast.forecast.criticalLevelMl)}
                    helper={`${formatUnits(forecast.configuration.criticalUnits)} minimas`}
                    tone="critical"
                  />
                  <SummaryCard
                    label="Tiempo total"
                    value={formatDays(forecast.forecast.estimatedDaysToCritical)}
                    helper="Desde el inicio del analisis hasta el nivel critico"
                    tone="default"
                  />
                  <SummaryCard
                    label="Dias restantes"
                    value={formatDays(forecast.forecast.remainingDaysToCritical)}
                    helper="Desde el fin del analisis hasta el nivel critico"
                    tone={
                      forecast.forecast.status === "warning" ||
                      forecast.forecast.status === "critical"
                        ? "critical"
                        : "default"
                    }
                  />
                </div>
              </div>

              <div className="admin-section-card overflow-hidden p-3">
                <div className="relative overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[0.08] via-background to-sky-500/[0.08] p-3">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-white/60 bg-background shadow-[0_20px_45px_-30px_rgba(15,23,42,0.45)]">
                    <img
                      src={forecast.product.image || selectedProduct?.image || "/placeholder.svg"}
                      alt={forecast.product.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-xl border border-white/70 bg-white/88 px-3 py-2 backdrop-blur">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {forecast.product.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {selectedProduct?.category ?? forecast.product.category}
                      {selectedProduct?.presentation
                        ? ` / ${selectedProduct.presentation}`
                        : forecast.product.presentation
                          ? ` / ${forecast.product.presentation}`
                          : ""}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {forecast.forecast.status === "not_configured" ? (
              <div className={cn("admin-section-card p-5", statusTone?.panel)}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <p className="text-sm font-semibold text-foreground">
                        Falta configuracion para calcular la prediccion
                      </p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Completa estos datos en el producto para activar la vista:
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {forecast.missingFields.map((field) => (
                        <Badge key={field} variant="outline" className="rounded-full bg-background/90">
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button asChild variant="outline" className="rounded-lg">
                    <Link href="/admin/productos">Abrir catalogo</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
                <section className="admin-section-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Prediccion grafica
                      </p>
                      <h5 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                        Curva de agotamiento
                      </h5>
                      <p className="mt-1 text-sm text-muted-foreground">
                        La linea continua muestra el comportamiento observado y
                        la linea discontinua extiende la prediccion exponencial
                        hasta el nivel critico.
                      </p>
                    </div>
                    <Badge variant="outline" className="rounded-full bg-background/80">
                      {formatDate(forecast.forecast.estimatedCriticalDate)}
                    </Badge>
                  </div>

                  <div className="mt-4">
                    <DepletionChart forecast={forecast} />
                  </div>
                </section>

                <section className="admin-section-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Resumen de datos
                  </p>
                  <div className="mt-4 space-y-3">
                    {[
                      ["Producto", forecast.product.name],
                      [
                        "Materia prima",
                        forecast.configuration.rawMaterialName ?? "-",
                      ],
                      [
                        "Consumo por pieza",
                        formatMl(forecast.configuration.consumptionPerPieceMl),
                      ],
                      [
                        "Ventas registradas",
                        formatUnits(forecast.analysis.totalSalesUnits),
                      ],
                      [
                        "Inicio del analisis",
                        formatDate(forecast.analysis.startDate),
                      ],
                      [
                        "Fin del analisis",
                        formatDate(forecast.analysis.endDate),
                      ],
                      [
                        "Dias observados",
                        `${formatNumber(forecast.analysis.observedDays)} dias`,
                      ],
                      [
                        "Fecha critica estimada",
                        formatDate(forecast.forecast.estimatedCriticalDate),
                      ],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-secondary/15 px-4 py-3"
                      >
                        <p className="text-sm text-muted-foreground">{label}</p>
                        <p className="text-right text-sm font-semibold text-foreground">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-xl border border-border/60 bg-background/70 p-4">
                    <div className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold text-foreground">
                        Modelo exponencial
                      </p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Formula aplicada:{" "}
                      <span className="font-semibold text-foreground">
                        M(t) = M0 e^(k t)
                      </span>
                      . Constante observada k:{" "}
                      <span className="font-semibold text-foreground">
                        {formatRateK(forecast.analysis.exponentialRateK)}
                      </span>
                      .
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Promedio observado:{" "}
                      <span className="font-semibold text-foreground">
                        {formatNumber(forecast.analysis.averageDailyUnits)}
                      </span>{" "}
                      piezas por dia durante{" "}
                      <span className="font-semibold text-foreground">
                        {formatNumber(forecast.analysis.observedDays)}
                      </span>{" "}
                      dias observados.
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Variacion observada en ventas:{" "}
                      <span
                        className={cn(
                          "font-semibold",
                          forecast.analysis.growthRate > 0
                            ? "text-emerald-600"
                            : forecast.analysis.growthRate < 0
                              ? "text-amber-700"
                              : "text-foreground",
                        )}
                      >
                        {forecast.analysis.growthRate > 0 ? "+" : ""}
                        {formatNumber(forecast.analysis.growthRate)}%
                      </span>
                    </p>
                  </div>
                </section>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
