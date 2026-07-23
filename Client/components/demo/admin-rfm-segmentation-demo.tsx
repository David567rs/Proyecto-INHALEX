import Link from "next/link"
import {
  ArrowRight,
  CalendarClock,
  CircleHelp,
  Database,
  HeartHandshake,
  Layers3,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Target,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SegmentProfile {
  key: "loyal" | "new" | "occasional" | "risk"
  name: string
  shortName: string
  count: number
  percentage: string
  description: string
  action: string
  icon: LucideIcon
  color: string
  softColor: string
  borderColor: string
}

interface CustomerExample {
  id: string
  recency: number
  frequency: number
  monetary: number
  segment: string
  segmentKey: SegmentProfile["key"]
}

const TOTAL_CUSTOMERS = 300

const segmentProfiles: SegmentProfile[] = [
  {
    key: "loyal",
    name: "Leales / alto valor",
    shortName: "Leales",
    count: 61,
    percentage: "20.3%",
    description: "Compran con frecuencia y mantienen un gasto acumulado alto.",
    action: "Reconocer su lealtad y ofrecer beneficios exclusivos.",
    icon: HeartHandshake,
    color: "bg-emerald-500",
    softColor: "bg-emerald-500/10 text-emerald-700",
    borderColor: "border-emerald-200/80",
  },
  {
    key: "new",
    name: "Nuevos / prometedores",
    shortName: "Nuevos",
    count: 38,
    percentage: "12.7%",
    description: "Compraron recientemente, aunque todavía tienen poca frecuencia.",
    action: "Acompañar su segunda compra con recomendaciones sencillas.",
    icon: UserPlus,
    color: "bg-sky-500",
    softColor: "bg-sky-500/10 text-sky-700",
    borderColor: "border-sky-200/80",
  },
  {
    key: "occasional",
    name: "Ocasionales",
    shortName: "Ocasionales",
    count: 152,
    percentage: "50.7%",
    description: "Tienen actividad intermedia y compran de manera esporádica.",
    action: "Enviar promociones relevantes para aumentar su frecuencia.",
    icon: ShoppingBag,
    color: "bg-amber-500",
    softColor: "bg-amber-500/10 text-amber-700",
    borderColor: "border-amber-200/80",
  },
  {
    key: "risk",
    name: "En riesgo",
    shortName: "En riesgo",
    count: 49,
    percentage: "16.3%",
    description: "Llevan muchos días sin comprar y presentan poca actividad reciente.",
    action: "Aplicar una campaña de reactivación sin saturar al cliente.",
    icon: CalendarClock,
    color: "bg-rose-500",
    softColor: "bg-rose-500/10 text-rose-700",
    borderColor: "border-rose-200/80",
  },
]

const customerExamples: CustomerExample[] = [
  {
    id: "SYN-CUST-0008",
    recency: 14,
    frequency: 12,
    monetary: 1188,
    segment: "Leales / alto valor",
    segmentKey: "loyal",
  },
  {
    id: "SYN-CUST-0003",
    recency: 10,
    frequency: 1,
    monetary: 180,
    segment: "Nuevos / prometedores",
    segmentKey: "new",
  },
  {
    id: "SYN-CUST-0002",
    recency: 34,
    frequency: 5,
    monetary: 567,
    segment: "Ocasionales",
    segmentKey: "occasional",
  },
  {
    id: "SYN-CUST-0001",
    recency: 381,
    frequency: 2,
    monetary: 180,
    segment: "En riesgo",
    segmentKey: "risk",
  },
]

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
})

function SegmentBadge({ segmentKey, label }: { segmentKey: SegmentProfile["key"]; label: string }) {
  const profile = segmentProfiles.find((item) => item.key === segmentKey)

  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        profile?.softColor,
        profile?.borderColor,
      )}
    >
      {label}
    </span>
  )
}

export function AdminRfmSegmentationDemo() {
  return (
    <section className="container mx-auto px-3 py-6 sm:px-4 lg:py-8">
      <div className="admin-panel-shell admin-animate-card">
        <div className="relative z-10 space-y-5">
          <header className="flex flex-col gap-4 border-b border-border/60 pb-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Vista académica de prueba
                </Badge>
                <Badge variant="outline">Clustering no supervisado</Badge>
              </div>

              <div className="mt-4 flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Users className="h-5 w-5" />
                </span>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    Segmentación inteligente de clientes
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                    Simulación de cómo INHALEX podría agrupar clientes con comportamiento
                    de compra similar mediante las variables RFM: recencia, frecuencia y monto.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-start gap-2 sm:flex-row xl:flex-col xl:items-end">
              <div className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                <CircleHelp className="h-4 w-4" />
                Escenario visual: k=4 por validar
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/ventas">
                  Ver predicción de demanda
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </header>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="admin-metric-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Clientes analizados
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight">{TOTAL_CUSTOMERS}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Una fila por cliente comprador</p>
                </div>
                <span className="rounded-md bg-primary/10 p-2 text-primary">
                  <Users className="h-4 w-4" />
                </span>
              </div>
            </div>

            <div className="admin-metric-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Variables X
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight">3 variables RFM</p>
                  <p className="mt-1 text-xs text-muted-foreground">Recencia · frecuencia · monto</p>
                </div>
                <span className="rounded-md bg-sky-500/10 p-2 text-sky-700">
                  <Layers3 className="h-4 w-4" />
                </span>
              </div>
            </div>

            <div className="admin-metric-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Variable objetivo Y
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight">No aplica</p>
                  <p className="mt-1 text-xs text-muted-foreground">Los grupos no vienen etiquetados</p>
                </div>
                <span className="rounded-md bg-violet-500/10 p-2 text-violet-700">
                  <Target className="h-4 w-4" />
                </span>
              </div>
            </div>

            <div className="admin-metric-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Resultado mostrado
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight">4 perfiles</p>
                  <p className="mt-1 text-xs text-muted-foreground">Interpretación comercial simulada</p>
                </div>
                <span className="rounded-md bg-amber-500/10 p-2 text-amber-700">
                  <ShieldCheck className="h-4 w-4" />
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
            <section className="admin-section-card p-4 sm:p-5">
              <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Distribución del escenario
                </p>
                <h2 className="text-lg font-semibold text-foreground">Clientes por perfil</h2>
                <p className="text-xs leading-5 text-muted-foreground">
                  Conteos utilizados solo para visualizar cómo aparecería el resultado en el panel.
                </p>
              </div>

              <div className="mt-5 grid items-center gap-5 sm:grid-cols-[11rem_1fr]">
                <div className="relative mx-auto flex h-40 w-40 items-center justify-center rounded-full shadow-inner"
                  style={{
                    background:
                      "conic-gradient(#10b981 0% 20.333%, #0ea5e9 20.333% 33%, #f59e0b 33% 83.667%, #f43f5e 83.667% 100%)",
                  }}
                  role="img"
                  aria-label="Distribución simulada: 61 clientes leales, 38 nuevos, 152 ocasionales y 49 en riesgo"
                >
                  <div className="flex h-[6.8rem] w-[6.8rem] flex-col items-center justify-center rounded-full border border-border/60 bg-card shadow-sm">
                    <span className="text-3xl font-semibold tracking-tight">300</span>
                    <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      clientes
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {segmentProfiles.map((profile) => (
                    <div key={profile.key} className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5 text-sm">
                      <span className={cn("h-2.5 w-2.5 rounded-full", profile.color)} />
                      <span className="font-medium text-foreground">{profile.shortName}</span>
                      <span className="text-right">
                        <strong className="font-semibold text-foreground">{profile.count}</strong>{" "}
                        <span className="text-xs text-muted-foreground">({profile.percentage})</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-lg border border-dashed border-amber-200 bg-amber-50/70 px-3 py-2.5 text-xs leading-5 text-amber-900">
                K-Means devuelve grupos numéricos. Los nombres comerciales se asignan después de
                interpretar sus centroides; el valor definitivo de <strong>k</strong> debe validarse.
              </div>
            </section>

            <section className="admin-section-card p-4 sm:p-5">
              <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Perfiles esperados
                </p>
                <h2 className="text-lg font-semibold text-foreground">Acciones sugeridas por grupo</h2>
                <p className="text-xs leading-5 text-muted-foreground">
                  Interpretación posterior al agrupamiento, no clases colocadas antes de entrenar.
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {segmentProfiles.map((profile) => {
                  const Icon = profile.icon
                  return (
                    <article
                      key={profile.key}
                      className={cn(
                        "rounded-lg border bg-card/80 p-3.5 shadow-sm",
                        profile.borderColor,
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className={cn("rounded-md p-2", profile.softColor)}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="text-right">
                          <strong className="block text-lg font-semibold leading-none">{profile.count}</strong>
                          <span className="text-[11px] text-muted-foreground">{profile.percentage}</span>
                        </span>
                      </div>
                      <h3 className="mt-3 text-sm font-semibold text-foreground">{profile.name}</h3>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{profile.description}</p>
                      <p className="mt-2 border-t border-border/50 pt-2 text-[11px] font-medium leading-4 text-foreground/80">
                        Acción: {profile.action}
                      </p>
                    </article>
                  )
                })}
              </div>
            </section>
          </div>

          <section className="admin-section-card overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-border/60 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Dataset RFM de ejemplo
                </p>
                <h2 className="mt-1 text-lg font-semibold text-foreground">Una fila por cliente</h2>
                <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
                  Los valores mostrados proceden del dataset sintético. El perfil es una asignación
                  visual para esta demostración.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-700">
                  CONTROL: id_cliente
                </span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700">
                  X: R + F + M
                </span>
                <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 font-semibold text-violet-700">
                  Y: no existe
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-[10px] font-semibold uppercase tracking-[0.14em]">
                    <th className="bg-slate-100/80 px-4 py-2.5 text-slate-700">Control · fuera de K-Means</th>
                    <th colSpan={3} className="bg-emerald-50/80 px-4 py-2.5 text-center text-emerald-700">
                      Variables para agrupamiento (X)
                    </th>
                    <th className="bg-amber-50/80 px-4 py-2.5 text-amber-800">Resultado simulado</th>
                  </tr>
                  <tr className="border-b border-border/70 bg-background/90 text-[11px] font-semibold text-muted-foreground">
                    <th className="px-4 py-3">id_cliente</th>
                    <th className="px-4 py-3 text-right">recency_days</th>
                    <th className="px-4 py-3 text-right">frequency_orders</th>
                    <th className="px-4 py-3 text-right">monetary_value</th>
                    <th className="px-4 py-3">perfil interpretado</th>
                  </tr>
                </thead>
                <tbody>
                  {customerExamples.map((customer) => (
                    <tr key={customer.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">{customer.id}</td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">{customer.recency} días</td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">{customer.frequency}</td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {currencyFormatter.format(customer.monetary)}
                      </td>
                      <td className="px-4 py-3">
                        <SegmentBadge segmentKey={customer.segmentKey} label={customer.segment} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-secondary/20 p-4 sm:flex-row sm:items-center">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Database className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Origen de las variables</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  <strong>id_cliente</strong> identifica la fila. De los pedidos completados se calculan
                  los días desde la última compra, el número de pedidos y la suma de subtotales.
                  Solo esas tres medidas RFM se estandarizan y entran a K-Means.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground lg:justify-end">
              <Wallet className="h-4 w-4 text-primary" />
              Demostración local · sin API ni cambios en clientes reales
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
