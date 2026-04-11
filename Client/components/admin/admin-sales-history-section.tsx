"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Calendar,
  DollarSign,
  Loader2,
  Package,
  TableIcon,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  AdminSalesAPI,
  type SalesDataPoint,
  type SalesMetrics,
  type SalesPeriodType,
} from "@/lib/admin/admin-sales-api";

type TimePeriod = SalesPeriodType;
type ViewMode = "chart" | "table";

interface SalesHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  productId: string;
}

const months = [
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

const periodLabels: Record<TimePeriod, string> = {
  daily: "Diario",
  weekly: "Semanal",
  monthly: "Mensual",
};

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("es-MX", {
  maximumFractionDigits: 1,
});

function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  tone: "primary" | "success" | "info" | "warning";
}) {
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600",
    info: "bg-sky-500/10 text-sky-600",
    warning: "bg-amber-500/10 text-amber-600",
  }[tone];

  return (
    <div className="admin-metric-card min-h-[5.75rem]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {title}
          </p>
          <p className="mt-2 truncate text-xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
            toneClass,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function SalesBarChart({ data }: { data: SalesDataPoint[] }) {
  const maxUnits = Math.max(...data.map((item) => item.units), 1);

  return (
    <div className="mt-4 grid gap-2 md:grid-cols-[2.25rem_1fr]">
      <div className="hidden items-center justify-center md:flex">
        <p className="-rotate-90 whitespace-nowrap text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Unidades vendidas
        </p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span className="font-medium md:hidden">Y: Unidades vendidas</span>
          <span className="font-medium">
            Max: {numberFormatter.format(maxUnits)}
          </span>
        </div>

        <div className="overflow-x-auto pb-2">
          <div
            className="relative min-w-full rounded-lg border border-border/60 bg-secondary/15"
            role="img"
            aria-label="Grafica de barras. Eje horizontal: periodo. Eje vertical: unidades vendidas."
          >
            <div className="pointer-events-none absolute inset-x-3 top-12 border-t border-dashed border-border/70" />
            <div className="pointer-events-none absolute inset-x-3 top-1/2 border-t border-dashed border-border/50" />
            <div className="pointer-events-none absolute inset-x-3 bottom-11 border-t border-border/70" />

            <div className="flex min-h-[300px] min-w-full items-end gap-3 px-3 pb-8 pt-8">
              {data.map((item, index) => {
                const height = Math.max(
                  10,
                  Math.round((item.units / maxUnits) * 190),
                );

                return (
                  <div
                    key={item.period}
                    className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 flex min-w-[4.75rem] flex-1 flex-col items-center justify-end gap-2 motion-safe:duration-500"
                    style={{ animationDelay: `${index * 45}ms` }}
                    title={`${item.period}: ${numberFormatter.format(item.units)} unidades, ${formatCurrency(item.revenue)}`}
                  >
                    <div className="text-center">
                      <p className="text-xs font-semibold text-foreground">
                        {numberFormatter.format(item.units)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatCurrency(item.revenue)}
                      </p>
                    </div>
                    <div
                      className="w-full max-w-12 rounded-t-md bg-primary shadow-sm shadow-primary/20 transition-[height,transform,opacity] duration-500 ease-out hover:scale-x-110 hover:bg-primary/90"
                      style={{ height }}
                    />
                    <p className="max-w-[5rem] truncate text-center text-[11px] font-medium text-muted-foreground">
                      {item.period}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <p className="mt-1 text-center text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Periodo
        </p>
      </div>
    </div>
  );
}

export function SalesHistoryModal({
  isOpen,
  onClose,
  productName,
  productId,
}: SalesHistoryModalProps) {
  const now = useMemo(() => new Date(), []);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("weekly");
  const [viewMode, setViewMode] = useState<ViewMode>("chart");
  const [selectedMonth, setSelectedMonth] = useState(() =>
    String(now.getMonth() + 1),
  );
  const [selectedYear, setSelectedYear] = useState(() =>
    String(now.getFullYear()),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [salesData, setSalesData] = useState<SalesDataPoint[]>([]);
  const [metrics, setMetrics] = useState<SalesMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  const yearOptions = useMemo(() => {
    const currentYear = now.getFullYear();
    return Array.from({ length: 4 }, (_, index) => String(currentYear - index));
  }, [now]);

  const loadSalesData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const options = {
        year: Number(selectedYear),
        month: Number(selectedMonth),
      };

      const [historyData, metricsData] = await Promise.all([
        AdminSalesAPI.getSalesHistory(productId, timePeriod, options),
        AdminSalesAPI.getSalesMetrics(productId, timePeriod, options),
      ]);

      setSalesData(historyData);
      setMetrics(metricsData);
    } catch {
      setSalesData([]);
      setMetrics(null);
      setError("No pude cargar el historial de ventas.");
    } finally {
      setIsLoading(false);
    }
  }, [productId, selectedMonth, selectedYear, timePeriod]);

  useEffect(() => {
    if (isOpen && productId) {
      void loadSalesData();
    }
  }, [isOpen, loadSalesData, productId]);

  const selectedMonthName =
    months.find((month) => month.value === selectedMonth)?.label ?? "Mes";
  const viewTransitionKey = [
    viewMode,
    timePeriod,
    selectedMonth,
    selectedYear,
    salesData
      .map((item) => `${item.period}-${item.units}-${item.revenue}`)
      .join("|"),
  ].join("-");
  const hasSalesData = salesData.length > 0;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="border-b border-border/60 px-5 py-4 pr-12">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-foreground">
            <BarChart3 className="h-5 w-5 text-primary" />
            Historial de ventas
          </DialogTitle>
          <DialogDescription>
            {productName} - {selectedMonthName} {selectedYear}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(90vh-5.5rem)] overflow-y-auto p-4">
          <div
            key={`metrics-${viewTransitionKey}`}
            className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 grid gap-3 motion-safe:duration-300 md:grid-cols-2 xl:grid-cols-4"
          >
            <MetricCard
              title="Promedio diario"
              value={
                metrics ? numberFormatter.format(metrics.averageDaily) : "0"
              }
              subtitle="Unidades por dia"
              icon={TrendingUp}
              tone="success"
            />
            <MetricCard
              title="Total vendido"
              value={metrics ? numberFormatter.format(metrics.totalSold) : "0"}
              subtitle="Unidades del periodo"
              icon={Package}
              tone="info"
            />
            <MetricCard
              title="Dias con venta"
              value={
                metrics ? numberFormatter.format(metrics.daysWithSales) : "0"
              }
              subtitle="Actividad real"
              icon={Calendar}
              tone="primary"
            />
            <MetricCard
              title="Ingresos"
              value={
                metrics
                  ? formatCurrency(metrics.totalRevenue)
                  : formatCurrency(0)
              }
              subtitle="Total del periodo"
              icon={DollarSign}
              tone="warning"
            />
          </div>

          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-fit gap-1 rounded-lg bg-secondary/40 p-1">
              {(["daily", "weekly", "monthly"] as TimePeriod[]).map(
                (period) => (
                  <Button
                    key={period}
                    type="button"
                    variant={timePeriod === period ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setTimePeriod(period)}
                    className="h-8"
                  >
                    {periodLabels[period]}
                  </Button>
                ),
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex gap-2">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="h-9 w-36 bg-background/70">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="h-9 w-28 bg-background/70">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex w-fit gap-1 rounded-lg bg-secondary/40 p-1">
                <Button
                  type="button"
                  variant={viewMode === "chart" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("chart")}
                  className="h-8"
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Grafica
                </Button>
                <Button
                  type="button"
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className="h-8"
                >
                  <TableIcon className="mr-2 h-4 w-4" />
                  Tabla
                </Button>
              </div>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="admin-section-card relative mt-4 overflow-hidden p-4">
            {isLoading && hasSalesData ? (
              <div className="motion-safe:animate-in motion-safe:fade-in-0 absolute right-4 top-4 z-20 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/95 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm backdrop-blur motion-safe:duration-300">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Actualizando
              </div>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-base font-semibold text-foreground">
                  {viewMode === "chart"
                    ? "Grafica de ventas"
                    : "Detalle de ventas"}
                </h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Vista {periodLabels[timePeriod].toLowerCase()} del periodo
                  seleccionado.
                </p>
              </div>
              <Badge variant="secondary">
                {numberFormatter.format(salesData.length)} registros
              </Badge>
            </div>

            {isLoading && !hasSalesData ? (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
                Cargando historial...
              </div>
            ) : !hasSalesData ? (
              <div className="flex h-[300px] flex-col items-center justify-center text-center text-muted-foreground">
                <BarChart3 className="mb-3 h-10 w-10 opacity-40" />
                <p className="text-sm font-medium">
                  Sin ventas en este periodo
                </p>
                <p className="mt-1 max-w-sm text-xs leading-5">
                  Cambia el mes, el anio o marca pedidos como completados para
                  alimentar esta grafica.
                </p>
              </div>
            ) : (
              <div
                key={viewTransitionKey}
                className={cn(
                  "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300",
                  isLoading && "opacity-60 transition-opacity duration-300",
                )}
              >
                {viewMode === "chart" ? (
                  <SalesBarChart data={salesData} />
                ) : (
                  <div className="mt-4 overflow-hidden rounded-lg border border-border/60">
                    <Table>
                      <TableHeader className="bg-secondary/30">
                        <TableRow>
                          <TableHead>Periodo</TableHead>
                          <TableHead className="text-right">Unidades</TableHead>
                          <TableHead className="text-right">Ingresos</TableHead>
                          <TableHead className="text-right">Promedio</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salesData.map((row, index) => {
                          const averageUnitRevenue =
                            row.units > 0 ? row.revenue / row.units : 0;

                          return (
                            <TableRow
                              key={row.period}
                              className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 transition-colors hover:bg-secondary/20 motion-safe:duration-300"
                              style={{ animationDelay: `${index * 35}ms` }}
                            >
                              <TableCell className="font-medium">
                                {row.period}
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant="secondary">
                                  {numberFormatter.format(row.units)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(row.revenue)}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {formatCurrency(averageUnitRevenue)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
