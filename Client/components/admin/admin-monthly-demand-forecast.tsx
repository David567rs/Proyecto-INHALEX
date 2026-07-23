"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Boxes,
  BrainCircuit,
  CalendarRange,
  CircleGauge,
  Database,
  Info,
  Loader2,
  PackageCheck,
  PackagePlus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  AdminSalesAPI,
  type MonthlyDemandForecast,
  type MonthlyDemandForecastItem,
  type MonthlyDemandInventoryStatus,
} from "@/lib/admin/admin-sales-api";
import { cn } from "@/lib/utils";

const integerFormatter = new Intl.NumberFormat("es-MX", {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});

const chartConfig = {
  actual: {
    label: "Demanda observada",
    color: "#15803d",
  },
  projection: {
    label: "Pronóstico",
    color: "#7c3aed",
  },
  interval: {
    label: "Intervalo esperado",
    color: "#c4b5fd",
  },
} satisfies ChartConfig;

const MONTH_NAMES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function formatInteger(value?: number | null): string {
  return typeof value === "number" && Number.isFinite(value)
    ? integerFormatter.format(Math.round(value))
    : "Sin dato";
}

function formatDecimal(value: number): string {
  return decimalFormatter.format(value);
}

function formatCurrency(value?: number | null): string {
  return typeof value === "number" && Number.isFinite(value)
    ? currencyFormatter.format(value)
    : "Sin dato";
}

function formatUnits(value?: number | null): string {
  return typeof value === "number" && Number.isFinite(value)
    ? `${formatInteger(value)} u.`
    : "Sin seguimiento";
}

function formatMonth(value: string, short = false): string {
  const match = /^(\d{4})-(\d{1,2})/.exec(value);
  if (!match) return value;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const month = MONTH_NAMES[monthIndex];
  if (!month) return value;

  return short
    ? `${month.slice(0, 3).replace(/^./, (letter) => letter.toUpperCase())} ${String(year).slice(-2)}`
    : `${month.replace(/^./, (letter) => letter.toUpperCase())} de ${year}`;
}

function formatGeneratedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatCategory(value: string): string {
  return value
    .replace(/^linea-/, "Línea ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStatusPresentation(status: MonthlyDemandInventoryStatus) {
  switch (status) {
    case "critical":
      return {
        label: "Reabasto prioritario",
        helper: "El inventario no alcanza la demanda central estimada.",
        badge:
          "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/35 dark:text-red-300",
        panel:
          "border-red-200/80 bg-red-50/65 dark:border-red-900/60 dark:bg-red-950/20",
        icon: AlertTriangle,
      };
    case "warning":
      return {
        label: "Vigilar inventario",
        helper:
          "El inventario cubre la estimación, pero no todo el margen preventivo.",
        badge:
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-300",
        panel:
          "border-amber-200/80 bg-amber-50/65 dark:border-amber-900/60 dark:bg-amber-950/20",
        icon: CircleGauge,
      };
    case "untracked":
      return {
        label: "Inventario sin seguimiento",
        helper:
          "Configura las existencias del producto para obtener una sugerencia.",
        badge:
          "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300",
        panel: "border-border/70 bg-secondary/20",
        icon: Info,
      };
    case "ready":
    default:
      return {
        label: "Cobertura adecuada",
        helper: "El inventario cubre la estimación y el margen de seguridad.",
        badge:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300",
        panel:
          "border-emerald-200/80 bg-emerald-50/60 dark:border-emerald-900/60 dark:bg-emerald-950/20",
        icon: ShieldCheck,
      };
  }
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "green",
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof Boxes;
  tone?: "green" | "violet" | "amber" | "red";
}) {
  const tones = {
    green: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    violet: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    red: "bg-red-500/10 text-red-700 dark:text-red-300",
  };

  return (
    <article className="admin-metric-card min-h-[8.4rem] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
        </div>
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            tones[tone],
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{helper}</p>
    </article>
  );
}

function DemandChart({
  item,
  targetMonth,
}: {
  item: MonthlyDemandForecastItem;
  targetMonth: string;
}) {
  const data = useMemo(() => {
    const history = item.history.map((point) => ({
      month: point.month,
      label: formatMonth(point.month, true),
      actual: point.units,
      projection: null as number | null,
      interval: null as [number, number] | null,
    }));
    const last = history.at(-1);

    if (last) {
      last.projection = last.actual;
      last.interval = [last.actual, last.actual];
    }

    return [
      ...history,
      {
        month: targetMonth,
        label: `${formatMonth(targetMonth, true)}*`,
        actual: null,
        projection: item.prediction.units,
        interval: [item.prediction.lower, item.prediction.upper] as [
          number,
          number,
        ],
      },
    ];
  }, [item, targetMonth]);

  const lastHistory = item.history.at(-1);
  const maximum = Math.max(
    item.prediction.upper,
    item.prediction.units,
    ...item.history.map((point) => point.units),
    1,
  );

  return (
    <ChartContainer
      config={chartConfig}
      className="h-[19rem] w-full min-w-[36rem] aspect-auto"
    >
      <ComposedChart
        data={data}
        margin={{ top: 18, right: 18, bottom: 4, left: 0 }}
        accessibilityLayer
      >
        <defs>
          <linearGradient id="monthly-demand-range" x1="0" x2="0" y1="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-interval)"
              stopOpacity={0.48}
            />
            <stop
              offset="100%"
              stopColor="var(--color-interval)"
              stopOpacity={0.12}
            />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="4 5" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
        />
        <YAxis
          domain={[0, Math.ceil(maximum * 1.18)]}
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          width={38}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              indicator="line"
              labelFormatter={(_, payload) => {
                const month = payload?.[0]?.payload?.month;
                return typeof month === "string"
                  ? formatMonth(month)
                  : "Demanda mensual";
              }}
              formatter={(value, name) => {
                const label =
                  name === "projection"
                    ? "Pronóstico"
                    : name === "actual"
                      ? "Demanda observada"
                      : "Intervalo esperado";
                const display = Array.isArray(value)
                  ? `${formatInteger(Number(value[0]))}–${formatInteger(Number(value[1]))}`
                  : `${formatInteger(Number(value))} unidades`;

                return (
                  <div className="flex min-w-[12rem] items-center justify-between gap-4">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-mono font-semibold text-foreground">
                      {display}
                    </span>
                  </div>
                );
              }}
            />
          }
        />
        {lastHistory ? (
          <ReferenceLine
            x={`${formatMonth(targetMonth, true)}*`}
            stroke="#7c3aed"
            strokeDasharray="4 5"
            strokeOpacity={0.35}
          />
        ) : null}
        <Area
          type="monotone"
          dataKey="interval"
          stroke="var(--color-interval)"
          strokeWidth={1}
          fill="url(#monthly-demand-range)"
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="actual"
          stroke="var(--color-actual)"
          strokeWidth={3}
          dot={{ r: 5, fill: "var(--color-actual)", strokeWidth: 3 }}
          activeDot={{ r: 7 }}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="projection"
          stroke="var(--color-projection)"
          strokeWidth={3}
          strokeDasharray="8 7"
          dot={{ r: 6, fill: "var(--color-projection)", strokeWidth: 3 }}
          activeDot={{ r: 8 }}
          connectNulls
        />
      </ComposedChart>
    </ChartContainer>
  );
}

function FeatureCard({
  code,
  label,
  value,
  explanation,
}: {
  code: string;
  label: string;
  value: string;
  explanation: string;
}) {
  return (
    <article className="rounded-xl border border-border/65 bg-background/75 p-3.5 transition-colors hover:border-primary/25 hover:bg-primary/[0.025]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            {code}
          </p>
          <h6 className="mt-1 text-sm font-semibold text-foreground">{label}</h6>
        </div>
        <p className="shrink-0 text-lg font-semibold tabular-nums text-foreground">
          {value}
        </p>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        {explanation}
      </p>
    </article>
  );
}

export function AdminMonthlyDemandForecast() {
  const [forecast, setForecast] = useState<MonthlyDemandForecast | null>(null);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadForecast = useCallback(async (refresh = false) => {
    try {
      setError(null);
      refresh ? setRefreshing(true) : setLoading(true);
      const response = await AdminSalesAPI.getMonthlyDemandForecast();
      setForecast(response);
      setSelectedProductId((current) => {
        if (response.items.some((item) => item.product.id === current)) {
          return current;
        }

        return (
          response.items.find(
            (item) =>
              item.inventory.status === "critical" ||
              item.inventory.status === "warning",
          )?.product.id ??
          response.items[0]?.product.id ??
          ""
        );
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo cargar el pronóstico mensual.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadForecast();
  }, [loadForecast]);

  const selectedItem = useMemo(
    () =>
      forecast?.items.find(
        (item) => item.product.id === selectedProductId,
      ) ??
      forecast?.items[0] ??
      null,
    [forecast, selectedProductId],
  );

  const modelImprovement = useMemo(() => {
    const metrics = forecast?.model.metrics;
    if (!metrics || metrics.baselineMae <= 0) return null;
    return ((metrics.baselineMae - metrics.mae) / metrics.baselineMae) * 100;
  }, [forecast]);

  if (loading) {
    return (
      <section className="admin-table-shell">
        <div className="flex min-h-[18rem] flex-col items-center justify-center gap-3 px-5 py-12 text-center">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-2xl bg-violet-500/15" />
            <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-200 bg-violet-50 text-violet-700">
              <BrainCircuit className="h-6 w-6" />
            </span>
          </div>
          <div>
            <p className="font-semibold text-foreground">
              Preparando el pronóstico mensual
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Consultando el modelo, la demanda histórica y el inventario.
            </p>
          </div>
          <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
        </div>
      </section>
    );
  }

  if (!forecast || !selectedItem) {
    return (
      <section className="admin-table-shell">
        <div className="admin-empty-state max-w-none py-12">
          <AlertTriangle className="h-9 w-9 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              El pronóstico mensual no está disponible
            </p>
            <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">
              {error ??
                "Todavía no hay un artefacto de modelo válido para consultar."}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadForecast(true)}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Reintentar
          </Button>
        </div>
      </section>
    );
  }

  const isStale = forecast.freshness.isStale;
  const untrackedProducts = forecast.summary.untrackedProducts;
  const unresolvedProducts = forecast.summary.unresolvedProducts;
  const productsNeedingReview =
    forecast.summary.atRiskProducts +
    untrackedProducts +
    unresolvedProducts;
  const catalogProducts =
    forecast.summary.totalProducts + unresolvedProducts;
  const inventoryCoverageIsIncomplete =
    untrackedProducts > 0 || unresolvedProducts > 0;
  const status = isStale
    ? {
        label: "Pronóstico vencido",
        helper:
          "El inventario es actual, pero el mes pronosticado ya terminó. Regenera el modelo antes de decidir un reabasto.",
        badge:
          "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/35 dark:text-red-300",
        panel:
          "border-red-200/80 bg-red-50/65 dark:border-red-900/60 dark:bg-red-950/20",
        icon: AlertTriangle,
      }
    : getStatusPresentation(selectedItem.inventory.status);
  const StatusIcon = status.icon;
  const previousDemand = selectedItem.features.demandLag1m;
  const difference = selectedItem.prediction.units - previousDemand;
  const differencePercent =
    previousDemand > 0 ? (difference / previousDemand) * 100 : null;
  const coverage =
    !isStale &&
    typeof selectedItem.inventory.stockAvailable === "number" &&
    selectedItem.prediction.upper > 0
      ? (selectedItem.inventory.stockAvailable /
          selectedItem.prediction.upper) *
        100
      : null;
  const features = selectedItem.features;
  const model = forecast.model;

  return (
    <section className="admin-table-shell overflow-hidden">
      <div className="relative border-b border-border/60 bg-gradient-to-br from-violet-500/[0.075] via-background to-emerald-500/[0.065] px-4 py-5 sm:px-5">
        <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-violet-300/15 blur-3xl" />
        <div className="relative flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-200/80 bg-violet-50 text-violet-700 shadow-sm dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300">
                <BrainCircuit className="h-5 w-5" />
              </span>
              <Badge
                variant="outline"
                className="rounded-full border-violet-200 bg-violet-50/90 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300"
              >
                Regresión mensual
              </Badge>
              {model.isSynthetic ? (
                <Badge
                  variant="outline"
                  className="rounded-full border-amber-200 bg-amber-50/90 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Entrenamiento sintético
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="rounded-full border-emerald-200 bg-emerald-50/90 text-emerald-700"
                >
                  <Database className="mr-1.5 h-3.5 w-3.5" />
                  Historial operativo
                </Badge>
              )}
            </div>
            <h4 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
              Pronóstico mensual de demanda
            </h4>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Estima cuántas unidades podrían solicitarse en{" "}
              <span className="font-semibold text-foreground">
                {formatMonth(forecast.targetMonth)}
              </span>{" "}
              y contrasta el resultado con el inventario actual para anticipar
              el reabastecimiento.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
            <label className="block min-w-0 flex-1 sm:min-w-[17rem]">
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Producto analizado
              </span>
              <select
                value={selectedItem.product.id}
                onChange={(event) => setSelectedProductId(event.target.value)}
                className="admin-input-surface h-10 w-full rounded-lg border px-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-violet-500/15"
              >
                {forecast.items.map((item) => (
                  <option key={item.product.id} value={item.product.id}>
                    {item.product.name}
                    {item.inventory.status === "critical"
                      ? " · Reabasto prioritario"
                      : item.inventory.status === "warning"
                        ? " · Vigilar"
                        : item.inventory.status === "untracked"
                          ? " · Sin inventario registrado"
                        : ""}
                  </option>
                ))}
              </select>
            </label>
            <div className="self-end">
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full sm:w-auto"
                onClick={() => void loadForecast(true)}
                disabled={refreshing}
                title="Vuelve a consultar las existencias; no reentrena el modelo"
              >
                {refreshing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Actualizar inventario
              </Button>
              <p className="mt-1 text-center text-[10px] text-muted-foreground">
                No reentrena el modelo
              </p>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="border-b border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-800">
          No se pudo actualizar: {error}. Se conserva el último resultado
          disponible.
        </div>
      ) : null}

      <div className="space-y-4 p-4 sm:p-5">
        {isStale ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200/90 bg-red-50/75 px-4 py-3 text-sm text-red-950 dark:border-red-900/65 dark:bg-red-950/25 dark:text-red-100"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-700 dark:text-red-300" />
              <p className="leading-6">
                <span className="font-semibold">Pronóstico vencido.</span> Este
                artefacto estima {formatMonth(forecast.freshness.targetMonth)},
                pero el mes actual es{" "}
                {formatMonth(forecast.freshness.currentMonth)}. Consultar de
                nuevo solo actualiza las existencias; es necesario reentrenar y
                exportar el modelo mensual antes de usar sus cifras para
                reabastecer.
              </p>
            </div>
          </div>
        ) : null}

        {inventoryCoverageIsIncomplete ? (
          <div
            role="status"
            className="rounded-xl border border-amber-200/90 bg-amber-50/70 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100"
          >
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
              <p className="leading-6">
                <span className="font-semibold">
                  Cobertura de inventario incompleta.
                </span>{" "}
                {formatInteger(untrackedProducts)}{" "}
                {untrackedProducts === 1
                  ? "producto no tiene existencias registradas"
                  : "productos no tienen existencias registradas"}{" "}
                y {formatInteger(unresolvedProducts)}{" "}
                {unresolvedProducts === 1
                  ? "producto del modelo no coincide con un producto activo"
                  : "productos del modelo no coinciden con productos activos"}.
                El reabasto total excluye esos casos y debe considerarse
                parcial.
              </p>
            </div>
          </div>
        ) : null}

        {model.isSynthetic ? (
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/65 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
              <p className="leading-6">
                <span className="font-semibold">Propuesta académica.</span> El
                modelo fue entrenado con comportamiento sintético reproducible.
                El stock mostrado sí se consulta del inventario del sistema y
                la sugerencia debe validarse antes de comprar o producir.
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label={`Demanda · ${formatMonth(forecast.targetMonth, true)}`}
            value={`${formatInteger(forecast.summary.predictedUnits)} unidades`}
            helper={`Suma estimada para ${formatInteger(forecast.summary.totalProducts)} productos`}
            icon={TrendingUp}
            tone="violet"
          />
          <MetricCard
            label="Reabasto sugerido"
            value={
              isStale
                ? "No vigente"
                : `${formatInteger(forecast.summary.recommendedReorder)} unidades`
            }
            helper={
              isStale
                ? "Regenera el pronóstico mensual antes de tomar una decisión"
                : inventoryCoverageIsIncomplete
                  ? "Total parcial: excluye productos sin seguimiento o sin coincidencia"
                  : "Incluye el margen preventivo de inventario"
            }
            icon={PackagePlus}
            tone={isStale ? "red" : "amber"}
          />
          <MetricCard
            label="Productos por revisar"
            value={`${formatInteger(productsNeedingReview)} de ${formatInteger(catalogProducts)}`}
            helper={`${formatInteger(forecast.summary.atRiskProducts)} por stock · ${formatInteger(untrackedProducts)} sin seguimiento · ${formatInteger(unresolvedProducts)} sin coincidencia`}
            icon={AlertTriangle}
            tone={
              forecast.summary.atRiskProducts > 0 || isStale
                ? "red"
                : inventoryCoverageIsIncomplete
                  ? "amber"
                  : "green"
            }
          />
          <MetricCard
            label="Error medio del modelo"
            value={`${formatDecimal(model.metrics.mae)} unidades`}
            helper={
              modelImprovement !== null && modelImprovement > 0
                ? `${formatDecimal(modelImprovement)}% menor que la referencia simple`
                : `Referencia simple: ${formatDecimal(model.metrics.baselineMae)}`
            }
            icon={BarChart3}
            tone="green"
          />
        </div>

        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.55fr)]">
          <article className="admin-section-card min-w-0 overflow-hidden p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Histórico y siguiente mes
                </p>
                <h5 className="mt-1 text-lg font-semibold text-foreground">
                  {selectedItem.product.name} · demanda solicitada
                </h5>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Línea verde: meses observados · Línea violeta: estimación ·
                  Área clara: intervalo esperado.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="rounded-full">
                  {formatInteger(selectedItem.prediction.lower)}–
                  {formatInteger(selectedItem.prediction.upper)} unidades
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full",
                    difference >= 0
                      ? "border-violet-200 text-violet-700"
                      : "border-emerald-200 text-emerald-700",
                  )}
                >
                  {difference >= 0 ? "+" : ""}
                  {formatInteger(difference)}
                  {differencePercent !== null
                    ? ` · ${differencePercent >= 0 ? "+" : ""}${formatDecimal(differencePercent)}%`
                    : ""}{" "}
                  vs. mes anterior
                </Badge>
              </div>
            </div>
            <div className="mt-3 overflow-x-auto pb-1">
              <DemandChart
                item={selectedItem}
                targetMonth={forecast.targetMonth}
              />
            </div>
          </article>

          <aside className="admin-section-card overflow-hidden p-3">
            <div className="relative overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[0.08] via-background to-violet-500/[0.08] p-3">
              <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-white/60 bg-background shadow-[0_20px_45px_-30px_rgba(15,23,42,0.45)]">
                <img
                  src={selectedItem.product.image || "/placeholder.svg"}
                  alt={selectedItem.product.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-xl border border-white/70 bg-white/90 px-3 py-2 backdrop-blur dark:border-white/15 dark:bg-slate-950/85">
                <p className="truncate text-sm font-semibold text-foreground">
                  {selectedItem.product.name}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {formatCategory(selectedItem.product.category)}
                  {selectedItem.product.presentation
                    ? ` · ${selectedItem.product.presentation}`
                    : ""}
                </p>
              </div>
            </div>
          </aside>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
          <section className="admin-section-card p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Database className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Variables predictoras X
                </p>
                <h5 className="mt-1 text-lg font-semibold text-foreground">
                  Información conocida antes del mes objetivo
                </h5>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Ninguna variable utiliza información futura. Los rezagos se
                  forman con pedidos anteriores al comienzo de{" "}
                  {formatMonth(forecast.targetMonth)}.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              <FeatureCard
                code="M−1"
                label="Demanda del mes anterior"
                value={formatInteger(features.demandLag1m)}
                explanation="Unidades solicitadas del producto un mes antes."
              />
              <FeatureCard
                code="M−2"
                label="Demanda de hace dos meses"
                value={formatInteger(features.demandLag2m)}
                explanation="Segundo rezago mensual calculado desde pedidos."
              />
              <FeatureCard
                code="M−3"
                label="Demanda de hace tres meses"
                value={formatInteger(features.demandLag3m)}
                explanation="Tercer mes histórico disponible para el modelo."
              />
              <FeatureCard
                code="MEDIA 3M"
                label="Promedio reciente"
                value={formatDecimal(features.averageDemand3m)}
                explanation="Media de los tres rezagos mensuales anteriores."
              />
              <FeatureCard
                code="PEDIDOS"
                label="Pedidos del mes anterior"
                value={formatInteger(features.ordersLag1m)}
                explanation="Cantidad de pedidos distintos que incluyeron el aroma."
              />
              <FeatureCard
                code="PRECIO"
                label="Precio efectivo promedio"
                value={formatCurrency(features.averagePriceLag1m)}
                explanation="Promedio ponderado por unidades del mes anterior."
              />
              <FeatureCard
                code="RATING"
                label="Calificación acumulada"
                value={
                  typeof features.averageRatingAsOf === "number"
                    ? `${formatDecimal(features.averageRatingAsOf)} / 5`
                    : "Sin reseñas"
                }
                explanation="Promedio de reseñas publicadas antes del mes objetivo."
              />
              <FeatureCard
                code="RESEÑAS"
                label="Cantidad acumulada"
                value={formatInteger(features.reviewCountAsOf)}
                explanation="Número de reseñas disponibles al momento del corte."
              />
              <FeatureCard
                code="CALENDARIO"
                label="Número del mes"
                value={formatInteger(features.monthNumber)}
                explanation="Permite aprender cambios estacionales durante el año."
              />
            </div>
          </section>

          <section className={cn("admin-section-card p-4 sm:p-5", status.panel)}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/80 text-primary shadow-sm">
                  <StatusIcon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Decisión de inventario
                  </p>
                  <h5 className="mt-1 text-lg font-semibold text-foreground">
                    Stock y reabastecimiento
                  </h5>
                </div>
              </div>
              <Badge
                variant="outline"
                className={cn("rounded-full", status.badge)}
              >
                {status.label}
              </Badge>
            </div>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {status.helper}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                [
                  "Stock disponible",
                  formatUnits(selectedItem.inventory.stockAvailable),
                ],
                [
                  "Stock mínimo",
                  formatUnits(selectedItem.inventory.stockMin),
                ],
                [
                  "Stock objetivo",
                  formatUnits(selectedItem.inventory.targetStock),
                ],
                [
                  "Reabasto sugerido",
                  formatUnits(selectedItem.inventory.recommendedReorder),
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-background/90 bg-background/75 px-3 py-3"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-1.5 text-xl font-semibold tabular-nums text-foreground">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-background/90 bg-background/75 p-3">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-medium text-muted-foreground">
                  Cobertura del límite superior
                </span>
                <span className="font-semibold text-foreground">
                  {coverage === null
                    ? isStale
                      ? "Pronóstico vencido"
                      : "Sin seguimiento"
                    : `${formatDecimal(Math.max(0, coverage))}%`}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-700",
                    isStale || selectedItem.inventory.status === "critical"
                      ? "bg-red-500"
                      : selectedItem.inventory.status === "warning"
                        ? "bg-amber-500"
                        : "bg-emerald-500",
                  )}
                  style={{
                    width:
                      coverage === null
                        ? "0%"
                        : `${Math.min(100, Math.max(0, coverage))}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                {isStale
                  ? "La cobertura no se evalúa hasta regenerar el pronóstico para un mes vigente."
                  : "El stock objetivo suma el límite superior esperado y el stock mínimo configurado."}
              </p>
            </div>

            <Button asChild className="mt-4 w-full rounded-lg">
              <Link href="/admin/catalogo/inventario">
                Revisar inventario
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </section>
        </div>

        <footer className="rounded-xl border border-border/65 bg-secondary/15 px-4 py-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300">
                <CalendarRange className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {model.name} · versión {model.version}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Entrenamiento:{" "}
                  {formatMonth(model.trainingPeriod.startMonth)} a{" "}
                  {formatMonth(model.trainingPeriod.endMonth)} ·{" "}
                  {formatInteger(model.trainingPeriod.trainingRows)} filas de
                  entrenamiento · Generado el{" "}
                  {formatGeneratedAt(model.generatedAt)}.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:min-w-[25rem]">
              {[
                ["RMSE", formatDecimal(model.metrics.rmse)],
                ["R²", formatDecimal(model.metrics.r2)],
                [
                  "Validación",
                  `${formatInteger(model.trainingPeriod.validationRows)} filas`,
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-center"
                >
                  <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </section>
  );
}
