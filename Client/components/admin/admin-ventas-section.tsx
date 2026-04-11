"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  DollarSign,
  Loader2,
  Package,
  RefreshCw,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SalesHistoryModal } from "@/components/admin/admin-sales-history-section";
import { AdminSalesAPI, type SalesOverview } from "@/lib/admin/admin-sales-api";
import { listAdminProducts, type AdminProduct } from "@/lib/admin/admin-api";
import { getAccessToken } from "@/lib/auth/token-storage";

interface ProductRow {
  id: string;
  name: string;
  category: string;
  totalSales: number;
  revenue: number;
  growth: number;
}

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("es-MX");

function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function AdminVentasSection() {
  const [overview, setOverview] = useState<SalesOverview | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      setIsRefreshing(true);
      const token = await getAccessToken();

      const [salesData, productsRes] = await Promise.allSettled([
        AdminSalesAPI.getSalesOverview({ periodType: "monthly", limit: 100 }),
        token
          ? listAdminProducts(token, { status: "active", limit: 100 })
          : Promise.reject(new Error("No hay sesion activa")),
      ]);

      if (salesData.status === "fulfilled") {
        setOverview(salesData.value);
      } else {
        setOverview(null);
        setError("No pude cargar el resumen de ventas.");
      }

      const mergedRows = new Map<string, ProductRow>();

      if (productsRes.status === "fulfilled") {
        for (const product of productsRes.value.items) {
          mergedRows.set(product._id, {
            id: product._id,
            name: product.name,
            category: product.category,
            totalSales: 0,
            revenue: 0,
            growth: 0,
          });
        }
      }

      if (salesData.status === "fulfilled") {
        for (const sale of salesData.value.topProducts) {
          const catalogProduct = mergedRows.get(sale.id);
          mergedRows.set(sale.id, {
            id: sale.id,
            name: catalogProduct?.name ?? sale.name,
            category: catalogProduct?.category ?? sale.category,
            totalSales: sale.totalSales,
            revenue: sale.revenue,
            growth: sale.growth,
          });
        }
      }

      setProducts(
        Array.from(mergedRows.values()).sort((left, right) => {
          if (right.revenue !== left.revenue)
            return right.revenue - left.revenue;
          if (right.totalSales !== left.totalSales) {
            return right.totalSales - left.totalSales;
          }
          return left.name.localeCompare(right.name, "es");
        }),
      );
    } catch {
      setError("No pude cargar ventas. Revisa que el backend este encendido.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleOpenHistory = (product: ProductRow) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const summary = overview?.summary;
  const totalUnits = summary?.totalUnits ?? 0;
  const totalRevenue = summary?.totalRevenue ?? 0;
  const totalOrders = summary?.totalOrders ?? 0;
  const productsWithSales = summary?.activeProducts ?? 0;
  const avgGrowth = summary?.averageGrowthRate ?? 0;
  const soldProducts = useMemo(
    () => products.filter((product) => product.totalSales > 0).length,
    [products],
  );

  if (loading) {
    return (
      <section className="admin-panel-shell admin-animate-card">
        <div className="relative z-10 flex min-h-[170px] items-center justify-center text-muted-foreground">
          <Loader2 className="mr-3 h-5 w-5 animate-spin text-primary" />
          Preparando ventas...
        </div>
      </section>
    );
  }

  return (
    <section className="admin-panel-shell admin-animate-card">
      <div className="relative z-10 space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-primary">
              Ventas y reportes
            </h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Revisa pedidos completados, ingresos y rendimiento por producto.
              Abre un producto para ver su historial con grafica y tabla.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadData()}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Recargar
            </Button>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Pedidos vendidos",
              value: formatNumber(totalOrders),
              helper: "Completados",
              icon: ShoppingBag,
              accent: "text-primary",
              bg: "bg-primary/10",
            },
            {
              label: "Unidades vendidas",
              value: formatNumber(totalUnits),
              helper: "Piezas entregadas",
              icon: Package,
              accent: "text-emerald-600",
              bg: "bg-emerald-500/10",
            },
            {
              label: "Ingresos",
              value: formatCurrency(totalRevenue),
              helper: "Total facturado",
              icon: DollarSign,
              accent: "text-sky-600",
              bg: "bg-sky-500/10",
            },
            {
              label: "Productos vendidos",
              value: formatNumber(productsWithSales || soldProducts),
              helper: `${formatNumber(products.length)} en catalogo`,
              icon: avgGrowth >= 0 ? TrendingUp : TrendingDown,
              accent: avgGrowth >= 0 ? "text-emerald-600" : "text-red-600",
              bg: avgGrowth >= 0 ? "bg-emerald-500/10" : "bg-red-500/10",
            },
          ].map((card) => (
            <div key={card.label} className="admin-metric-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {card.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                    {card.value}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {card.helper}
                  </p>
                </div>
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${card.bg}`}
                >
                  <card.icon className={`h-4 w-4 ${card.accent}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="admin-table-shell">
          <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Rendimiento
              </p>
              <h4 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                Ventas por producto
              </h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Los productos con ventas aparecen primero; el resto queda como
                referencia del catalogo activo.
              </p>
            </div>
            <Badge variant="secondary">
              {formatNumber(productsWithSales || soldProducts)} con ventas
            </Badge>
          </div>

          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-14 text-center text-muted-foreground">
              <BarChart3 className="mb-3 h-10 w-10 opacity-40" />
              <p className="text-sm font-medium">Sin datos de ventas aun</p>
              <p className="mt-1 max-w-sm text-xs leading-5">
                Cuando marques pedidos como completados, esta vista mostrara
                ingresos, unidades y el historial por producto.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 p-4">
              {products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className="admin-section-card grid w-full gap-3 p-3 text-left transition-colors hover:bg-secondary/10 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                  onClick={() => handleOpenHistory(product)}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Package className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h5 className="truncate text-sm font-semibold text-foreground">
                        {product.name}
                      </h5>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {product.category}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-left sm:text-right">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {formatNumber(product.totalSales)}
                      </p>
                      <p className="text-xs text-muted-foreground">Unidades</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency(product.revenue)}
                      </p>
                      <p className="text-xs text-muted-foreground">Ingresos</p>
                    </div>
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          product.growth > 0
                            ? "text-emerald-600"
                            : product.growth < 0
                              ? "text-red-600"
                              : "text-muted-foreground"
                        }`}
                      >
                        {product.growth > 0 ? "+" : ""}
                        {product.growth}%
                      </p>
                      <p className="text-xs text-muted-foreground">Cambio</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedProduct ? (
        <SalesHistoryModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          productName={selectedProduct.name}
          productId={selectedProduct.id}
        />
      ) : null}
    </section>
  );
}
