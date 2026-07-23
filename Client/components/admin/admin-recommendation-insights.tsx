"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  ArrowRight,
  Braces,
  CheckCircle2,
  FlaskConical,
  Loader2,
  Network,
  RefreshCw,
  ShoppingBasket,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  fetchRecommendationModelSummary,
  type RecommendationModelSummary,
} from "@/lib/admin/admin-intelligence-api"

function formatPercent(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("es-MX", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date)
}

export function AdminRecommendationInsights() {
  const [summary, setSummary] =
    useState<RecommendationModelSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const loadSummary = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError("")

    try {
      setSummary(await fetchRecommendationModelSummary())
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No fue posible consultar el modelo de recomendación.",
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  const usableRules = useMemo(
    () => summary?.topRules.filter((rule) => rule.available) ?? [],
    [summary],
  )

  if (loading) {
    return (
      <section className="admin-panel-shell admin-animate-card">
        <div className="relative z-10 flex min-h-44 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-3 h-5 w-5 animate-spin text-primary" />
          Consultando reglas de recomendación...
        </div>
      </section>
    )
  }

  if (!summary) {
    return (
      <section className="admin-panel-shell admin-animate-card">
        <div className="relative z-10 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Modelo no disponible</p>
              <p className="mt-1 text-sm leading-6">
                {error ||
                  "El panel no recibió un artefacto de recomendaciones válido."}
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-4 bg-white"
                onClick={() => void loadSummary(true)}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Intentar de nuevo
              </Button>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="admin-panel-shell admin-animate-card">
      <div className="relative z-10 space-y-5">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700">
                <Network className="h-5 w-5" />
              </span>
              <Badge
                variant="outline"
                className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-800"
              >
                Sistema de recomendación · Apriori
              </Badge>
              {summary.model.isSynthetic ? (
                <Badge
                  variant="outline"
                  className="rounded-full border-amber-200 bg-amber-50 text-amber-800"
                >
                  <FlaskConical className="mr-1.5 h-3.5 w-3.5" />
                  Prototipo académico
                </Badge>
              ) : null}
            </div>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
              Afinidades entre aromas
            </h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Las reglas se entrenan con productos presentes dentro del mismo
              pedido. La bolsa usa estas afinidades para sugerir una opción
              complementaria disponible, sin alterar el pedido ni el
              inventario.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl border border-border/70 bg-background/80 px-4 py-2 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Artefacto
              </p>
              <p className="mt-1 text-xs font-medium text-foreground">
                {summary.model.version} · {formatDate(summary.model.generatedAt)}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-xl"
              disabled={refreshing}
              onClick={() => void loadSummary(true)}
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              <span className="sr-only">Actualizar resumen</span>
            </Button>
          </div>
        </header>

        {error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Canastas analizadas",
              value: summary.training.transactions.toLocaleString("es-MX"),
              helper: "Una canasta por pedido",
              icon: ShoppingBasket,
            },
            {
              label: "Reglas válidas",
              value: summary.metrics.rules.toLocaleString("es-MX"),
              helper: `${usableRules.length} principales disponibles`,
              icon: Braces,
            },
            {
              label: "Cobertura del catálogo",
              value: formatPercent(summary.metrics.catalogCoverage),
              helper: "Aromas con regla de salida",
              icon: Sparkles,
            },
            {
              label: "Acierto temporal Top-1",
              value: formatPercent(summary.metrics.temporalTop1HitRate),
              helper: "Evaluación sobre meses posteriores",
              icon: CheckCircle2,
            },
          ].map((metric) => (
            <article key={metric.label} className="admin-metric-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {metric.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                    {metric.value}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {metric.helper}
                  </p>
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <metric.icon className="h-4 w-4" />
                </span>
              </div>
            </article>
          ))}
        </div>

        {summary.health.unresolvedSlugs.length > 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span className="font-semibold">Revisión de catálogo:</span>{" "}
            {summary.health.unresolvedSlugs.length} identificador(es) del modelo
            ya no coinciden con productos actuales:{" "}
            {summary.health.unresolvedSlugs.join(", ")}.
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <CheckCircle2 className="h-4 w-4" />
            Todas las reglas principales se enlazan con el catálogo actual.
          </div>
        )}

        <div className="admin-table-shell overflow-hidden">
          <div className="border-b border-border/60 px-4 py-4 sm:px-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Reglas principales
            </p>
            <h4 className="mt-1 text-lg font-semibold text-foreground">
              Productos que aparecen juntos con mayor fuerza
            </h4>
          </div>
          <div className="divide-y divide-border/60">
            {summary.topRules.slice(0, 6).map((rule) => (
              <article
                key={`${rule.antecedentSlugs.join("+")}->${rule.consequentSlug}`}
                className="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                    <span>{rule.antecedentNames.join(" + ")}</span>
                    <ArrowRight className="h-4 w-4 text-primary" />
                    <span className="text-primary">{rule.consequentName}</span>
                    <Badge
                      variant="outline"
                      className={
                        rule.available
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      }
                    >
                      {rule.available ? "Disponible" : "No publicable ahora"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Coincidieron en {rule.cooccurrenceCount} canastas. Lift mayor
                    que 1 indica una asociación superior a la coincidencia
                    esperada por popularidad.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    ["Soporte", formatPercent(rule.support)],
                    ["Confianza", formatPercent(rule.confidence)],
                    ["Lift", rule.lift.toFixed(2)],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="min-w-20 rounded-lg border border-border/60 bg-secondary/20 px-3 py-2"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {label}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
