"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownUp,
  CheckCircle2,
  History,
  Loader2,
  PackageCheck,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Warehouse,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/auth/auth-provider";
import { getAccessToken } from "@/lib/auth/token-storage";
import {
  adjustAdminInventory,
  getAdminInventorySummary,
  listAdminInventoryMovements,
  listAdminProductCategories,
  listAdminProducts,
  updateAdminProduct,
  type AdminInventoryMovement,
  type AdminInventorySummary,
  type AdminProduct,
  type AdminProductCategory,
  type InventoryMovementType,
} from "@/lib/admin/admin-api";
import { cn } from "@/lib/utils";

type StockFilter = "all" | "tracked" | "pending" | "low" | "out" | "backorder";
type StatusFilter = "all" | "active" | "draft" | "archived";

const movementLabels: Record<InventoryMovementType, string> = {
  initialize: "Inicializacion",
  restock: "Entrada",
  deduct: "Salida",
  set_available: "Ajuste directo",
  reserve: "Reserva",
  release: "Liberacion",
  commit_reserved: "Cierre de reserva",
};

const productStatusLabels: Record<Exclude<StatusFilter, "all">, string> = {
  active: "Activado",
  draft: "Desactivado",
  archived: "Archivado",
};

const tracked = (product: AdminProduct) =>
  typeof product.stockAvailable === "number";
const available = (product: AdminProduct) =>
  tracked(product) ? (product.stockAvailable ?? 0) : 0;
const reserved = (product: AdminProduct) =>
  tracked(product) ? (product.stockReserved ?? 0) : 0;
const stockMin = (product: AdminProduct) => product.stockMin ?? 0;

function tone(product: AdminProduct) {
  if (!tracked(product))
    return {
      label: "Pendiente",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  if (available(product) === 0) {
    return product.allowBackorder
      ? {
          label: "Bajo pedido",
          className: "border-sky-200 bg-sky-50 text-sky-700",
        }
      : {
          label: "Sin existencias",
          className: "border-rose-200 bg-rose-50 text-rose-700",
        };
  }
  if (stockMin(product) > 0 && available(product) <= stockMin(product)) {
    return {
      label: "Stock bajo",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }
  return {
    label: "Saludable",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function AdminInventorySection() {
  const { user } = useAuth();
  const canManage = user?.role === "admin";
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminProductCategory[]>([]);
  const [summary, setSummary] = useState<AdminInventorySummary | null>(null);
  const [movements, setMovements] = useState<AdminInventoryMovement[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const deferredSearch = useDeferredValue(searchInput);
  const [category, setCategory] = useState("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    stockMin: "0",
    allowBackorder: "false",
  });
  const [adjustment, setAdjustment] = useState({
    type: "restock" as InventoryMovementType,
    quantity: "",
    note: "",
  });
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingAdjustment, setSavingAdjustment] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedProduct = useMemo(
    () =>
      products.find((item) => item._id === selectedId) ?? products[0] ?? null,
    [products, selectedId],
  );

  useEffect(() => {
    if (!selectedProduct) {
      setSelectedId(null);
      return;
    }
    setSelectedId(selectedProduct._id);
    setSettings({
      stockMin: String(selectedProduct.stockMin ?? 0),
      allowBackorder: selectedProduct.allowBackorder ? "true" : "false",
    });
  }, [
    selectedProduct?._id,
    selectedProduct?.stockMin,
    selectedProduct?.allowBackorder,
  ]);

  const loadSummary = async () => {
    const token = getAccessToken();
    if (!token) return;
    const response = await getAdminInventorySummary(token);
    setSummary(response);
  };

  const loadProducts = async () => {
    const token = getAccessToken();
    if (!token) return;
    setLoadingProducts(true);
    try {
      const response = await listAdminProducts(token, {
        search: deferredSearch.trim() || undefined,
        category: category !== "all" ? category : undefined,
        status: status !== "all" ? status : undefined,
        page: 1,
        limit: 100,
      });
      let nextProducts = response.items;
      nextProducts = nextProducts.filter((product) => {
        if (stockFilter === "tracked") return tracked(product);
        if (stockFilter === "pending") return !tracked(product);
        if (stockFilter === "low")
          return (
            tracked(product) &&
            available(product) > 0 &&
            stockMin(product) > 0 &&
            available(product) <= stockMin(product)
          );
        if (stockFilter === "out")
          return tracked(product) && available(product) === 0;
        if (stockFilter === "backorder") return Boolean(product.allowBackorder);
        return true;
      });
      setProducts(nextProducts);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadMovements = async (productId: string) => {
    const token = getAccessToken();
    if (!token) return;
    setLoadingMovements(true);
    try {
      const response = await listAdminInventoryMovements(productId, token, 10);
      setMovements(response.items);
    } finally {
      setLoadingMovements(false);
    }
  };

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      setErrorMessage("Tu sesion no esta disponible. Inicia sesion de nuevo.");
      return;
    }
    const boot = async () => {
      setLoading(true);
      setErrorMessage("");
      try {
        const [summaryResponse, categoriesResponse] = await Promise.all([
          getAdminInventorySummary(token),
          listAdminProductCategories(token),
        ]);
        setSummary(summaryResponse);
        setCategories(categoriesResponse);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudo cargar el inventario",
        );
      } finally {
        setLoading(false);
      }
    };
    void boot();
  }, []);

  useEffect(() => {
    void loadProducts().catch((error) => {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo cargar el inventario",
      );
    });
  }, [deferredSearch, category, status, stockFilter]);

  useEffect(() => {
    if (!selectedProduct?._id) {
      setMovements([]);
      return;
    }
    void loadMovements(selectedProduct._id).catch((error) => {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo cargar el historial",
      );
    });
  }, [selectedProduct?._id]);

  const refreshAll = async () => {
    setSuccessMessage("");
    await Promise.all([loadSummary(), loadProducts()]);
    if (selectedProduct?._id) await loadMovements(selectedProduct._id);
  };

  const savePolicy = async () => {
    if (!selectedProduct) return;
    const token = getAccessToken();
    const minValue = Number(settings.stockMin);
    if (!token)
      return setErrorMessage(
        "Tu sesion no esta disponible. Inicia sesion de nuevo.",
      );
    if (!Number.isFinite(minValue) || minValue < 0)
      return setErrorMessage("El stock minimo debe ser mayor o igual a 0.");
    const accepted = window.confirm(
      `Vas a actualizar la configuracion de inventario de "${selectedProduct.name}". Deseas continuar?`,
    );
    if (!accepted) return;
    setSavingSettings(true);
    setErrorMessage("");
    try {
      const updated = await updateAdminProduct(
        selectedProduct._id,
        {
          stockMin: Math.floor(minValue),
          allowBackorder: settings.allowBackorder === "true",
        },
        token,
      );
      setProducts((prev) =>
        prev.map((product) =>
          product._id === updated._id ? updated : product,
        ),
      );
      setSuccessMessage("Politica de inventario guardada.");
      await loadSummary();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la configuracion.",
      );
    } finally {
      setSavingSettings(false);
    }
  };

  const submitAdjustment = async () => {
    if (!selectedProduct) return;
    const token = getAccessToken();
    const quantity = Number(adjustment.quantity);
    if (!token)
      return setErrorMessage(
        "Tu sesion no esta disponible. Inicia sesion de nuevo.",
      );
    if (!Number.isFinite(quantity) || quantity < 0)
      return setErrorMessage("La cantidad debe ser un numero valido.");
    if (adjustment.type !== "set_available" && quantity <= 0)
      return setErrorMessage("La cantidad debe ser mayor a cero.");
    const accepted = window.confirm(
      `Vas a registrar "${movementLabels[adjustment.type]}" por ${Math.floor(quantity)} unidades en "${selectedProduct.name}". Deseas continuar?`,
    );
    if (!accepted) return;
    setSavingAdjustment(true);
    setErrorMessage("");
    try {
      const response = await adjustAdminInventory(
        selectedProduct._id,
        {
          type: adjustment.type,
          quantity: Math.floor(quantity),
          note: adjustment.note.trim() || undefined,
        },
        token,
      );
      setProducts((prev) =>
        prev.map((product) =>
          product._id === response.product._id ? response.product : product,
        ),
      );
      setAdjustment({ type: "restock", quantity: "", note: "" });
      setSuccessMessage("Movimiento registrado correctamente.");
      await Promise.all([loadSummary(), loadMovements(selectedProduct._id)]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo registrar el movimiento.",
      );
    } finally {
      setSavingAdjustment(false);
    }
  };

  if (loading) {
    return (
      <section className="admin-panel-shell admin-animate-card">
        <div className="relative z-10 flex min-h-[170px] items-center justify-center text-muted-foreground">
          <Loader2 className="mr-3 h-5 w-5 animate-spin text-primary" />
          Preparando inventario...
        </div>
      </section>
    );
  }

  return (
    <section className="admin-panel-shell admin-animate-card">
      <div className="relative z-10 space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Warehouse className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-primary">
              Inventario
            </h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Controla existencias, reservas y productos bajo pedido desde un
              solo lugar.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => void refreshAll()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Recargar
            </Button>
            <Button asChild type="button">
              <Link href="/admin/productos">Ir a productos</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Disponibles",
              value: summary?.totalAvailableUnits ?? 0,
              icon: PackageCheck,
            },
            {
              label: "Reservadas",
              value: summary?.totalReservedUnits ?? 0,
              icon: ArrowDownUp,
            },
            {
              label: "Bajo stock / sin stock",
              value:
                (summary?.lowStockProducts ?? 0) +
                (summary?.outOfStockProducts ?? 0),
              icon: AlertTriangle,
            },
            {
              label: "Sin stock cargado",
              value: summary?.totalPendingInitialization ?? 0,
              icon: ShieldCheck,
            },
          ].map((item) => (
            <div key={item.label} className="admin-section-card p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                {item.label}
              </p>
              <div className="mt-4 flex items-end justify-between gap-3">
                <p className="text-2xl font-semibold text-foreground">
                  {item.value}
                </p>
                <item.icon className="h-5 w-5 text-primary" />
              </div>
            </div>
          ))}
        </div>

        {(errorMessage || successMessage) && (
          <div
            className={cn(
              "admin-section-card rounded-xl px-4 py-3 text-sm",
              errorMessage
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-primary/20 bg-primary/5 text-foreground",
            )}
          >
            {errorMessage || successMessage}
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.34fr)_minmax(21rem,0.86fr)]">
          <div className="space-y-5">
            <div className="admin-section-card p-4">
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] xl:items-start">
                <div className="relative min-w-0">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Buscar producto"
                    className="admin-input-surface pl-9"
                  />
                </div>
                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                  <div className="min-w-0">
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="admin-input-surface w-full">
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          Todas las categorias
                        </SelectItem>
                        {categories.map((item) => (
                          <SelectItem key={item._id} value={item.slug}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-0">
                    <Select
                      value={status}
                      onValueChange={(value) =>
                        setStatus(value as StatusFilter)
                      }
                    >
                      <SelectTrigger className="admin-input-surface w-full">
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los estados</SelectItem>
                        <SelectItem value="active">Activados</SelectItem>
                        <SelectItem value="draft">Desactivados</SelectItem>
                        <SelectItem value="archived">Archivados</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                {["all", "tracked", "pending", "low", "out", "backorder"].map(
                  (item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setStockFilter(item as StockFilter)}
                      className={cn(
                        "rounded-full border px-3.5 py-2 text-sm font-medium transition-all",
                        stockFilter === item
                          ? "border-primary/20 bg-primary text-primary-foreground shadow-sm"
                          : "border-border/60 bg-background/80 text-muted-foreground hover:border-primary/20 hover:text-foreground",
                      )}
                    >
                      {
                        {
                          all: "Todos los productos",
                          tracked: "Con inventario",
                          pending: "Pendientes",
                          low: "Stock bajo",
                          out: "Sin existencias",
                          backorder: "Bajo pedido",
                        }[item]
                      }
                    </button>
                  ),
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                <span>
                  Filtra por disponibilidad real, productos pendientes o
                  opciones de bajo pedido.
                </span>
                <span>{products.length} productos encontrados</span>
              </div>
            </div>

            <div className="admin-table-shell">
              <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Vista de productos
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Selecciona un producto para operar su inventario y revisar
                    su historial.
                  </p>
                </div>
                <div className="rounded-full border border-primary/15 bg-primary/[0.05] px-3 py-1 text-xs font-medium text-primary">
                  {products.length} productos
                </div>
              </div>
              <div className="admin-table-scroll">
                <Table>
                  <TableHeader>
                    <TableRow className="admin-table-head-row">
                      <TableHead className="admin-table-head-cell">
                        Producto
                      </TableHead>
                      <TableHead className="admin-table-head-cell">
                        Categoria
                      </TableHead>
                      <TableHead className="admin-table-head-cell text-right">
                        Libres
                      </TableHead>
                      <TableHead className="admin-table-head-cell text-right">
                        Reservadas
                      </TableHead>
                      <TableHead className="admin-table-head-cell text-right">
                        Min
                      </TableHead>
                      <TableHead className="admin-table-head-cell">
                        Estado
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="admin-table-body-compact">
                    {loadingProducts ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="py-10 text-center text-sm text-muted-foreground"
                        >
                          <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin text-primary" />
                          Cargando inventario...
                        </TableCell>
                      </TableRow>
                    ) : products.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="py-10 text-center text-sm text-muted-foreground"
                        >
                          No encontramos productos con esos filtros.
                        </TableCell>
                      </TableRow>
                    ) : (
                      products.map((product) => {
                        const state = tone(product);
                        return (
                          <TableRow
                            key={product._id}
                            className={cn(
                              "cursor-pointer transition-colors hover:bg-primary/[0.04]",
                              selectedProduct?._id === product._id &&
                                "bg-primary/[0.06]",
                            )}
                            onClick={() => setSelectedId(product._id)}
                          >
                            <TableCell>
                              <div>
                                <p className="font-medium text-foreground">
                                  {product.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {product.presentation ?? "-"} /{" "}
                                  {productStatusLabels[product.status] ??
                                    product.status}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {product.category}
                            </TableCell>
                            <TableCell className="text-right font-medium text-foreground">
                              {tracked(product) ? available(product) : "-"}
                            </TableCell>
                            <TableCell className="text-right font-medium text-foreground">
                              {tracked(product) ? reserved(product) : "-"}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {tracked(product) ? stockMin(product) : "-"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn("rounded-full", state.className)}
                              >
                                {state.label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            {!selectedProduct ? (
              <div className="admin-section-card p-4 text-sm text-muted-foreground">
                Selecciona un producto para operar su inventario.
              </div>
            ) : (
              <>
                <div className="admin-section-card p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                        Producto seleccionado
                      </p>
                      <h4 className="mt-3 text-2xl font-semibold text-foreground">
                        {selectedProduct.name}
                      </h4>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {selectedProduct.category} /{" "}
                        {selectedProduct.presentation ?? "-"}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full",
                        tone(selectedProduct).className,
                      )}
                    >
                      {tone(selectedProduct).label}
                    </Badge>
                  </div>
                  <div className="mt-4 rounded-lg border border-border/60 bg-background/75 px-3 py-2.5 text-sm text-muted-foreground">
                    {tracked(selectedProduct)
                      ? "Este producto ya tiene existencias cargadas. Cualquier movimiento actualiza la disponibilidad para ventas."
                      : "Este producto aun no tiene stock cargado. El primer movimiento iniciara su control de existencias."}
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <div className="admin-stat-chip">
                      <span className="font-medium">Libres:</span>{" "}
                      {tracked(selectedProduct)
                        ? available(selectedProduct)
                        : "Pendiente"}
                    </div>
                    <div className="admin-stat-chip">
                      <span className="font-medium">Reservadas:</span>{" "}
                      {tracked(selectedProduct)
                        ? reserved(selectedProduct)
                        : "Pendiente"}
                    </div>
                    <div className="admin-stat-chip">
                      <span className="font-medium">Minimo:</span>{" "}
                      {stockMin(selectedProduct)}
                    </div>
                    <div className="admin-stat-chip">
                      <span className="font-medium">Bajo pedido:</span>{" "}
                      {selectedProduct.allowBackorder ? "Si" : "No"}
                    </div>
                  </div>
                  <div className="mt-4 rounded-xl border border-primary/15 bg-primary/[0.05] px-4 py-3 text-sm text-foreground">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                      <p>
                        Cuando ajustes este producto, la disponibilidad del
                        catalogo se actualizara automaticamente.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="admin-section-card p-4">
                  <div className="flex items-center gap-2">
                    <ArrowDownUp className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-foreground">
                      Registrar movimiento
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Usa esta accion para entradas, salidas o correcciones de
                    existencia. Todo queda guardado en el historial.
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <Select
                      value={adjustment.type}
                      onValueChange={(value) =>
                        setAdjustment((prev) => ({
                          ...prev,
                          type: value as InventoryMovementType,
                        }))
                      }
                    >
                      <SelectTrigger className="admin-input-surface">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="restock">Entrada</SelectItem>
                        <SelectItem value="deduct">Salida</SelectItem>
                        <SelectItem value="set_available">
                          Ajuste directo
                        </SelectItem>
                        <SelectItem value="reserve">Reservar</SelectItem>
                        <SelectItem value="release">Liberar</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={0}
                      value={adjustment.quantity}
                      onChange={(event) =>
                        setAdjustment((prev) => ({
                          ...prev,
                          quantity: event.target.value,
                        }))
                      }
                      className="admin-input-surface"
                      placeholder={
                        adjustment.type === "set_available"
                          ? "Nuevo disponible"
                          : "Unidades"
                      }
                    />
                  </div>
                  <Textarea
                    value={adjustment.note}
                    onChange={(event) =>
                      setAdjustment((prev) => ({
                        ...prev,
                        note: event.target.value,
                      }))
                    }
                    className="admin-input-surface mt-3 min-h-[76px]"
                    placeholder="Nota interna del ajuste"
                  />
                  <Button
                    type="button"
                    className="mt-4 w-full sm:w-auto"
                    onClick={() => void submitAdjustment()}
                    disabled={!canManage || savingAdjustment}
                  >
                    {savingAdjustment ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <PackageCheck className="mr-2 h-4 w-4" />
                    )}
                    Registrar movimiento
                  </Button>
                </div>

                <div className="admin-section-card p-4">
                  <div className="flex items-center gap-2">
                    <Save className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-foreground">
                      Configuracion de inventario
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Define el minimo de alerta y si el producto puede venderse
                    bajo pedido cuando no haya existencia inmediata.
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <Input
                      type="number"
                      min={0}
                      value={settings.stockMin}
                      onChange={(event) =>
                        setSettings((prev) => ({
                          ...prev,
                          stockMin: event.target.value,
                        }))
                      }
                      className="admin-input-surface"
                      placeholder="Stock minimo"
                    />
                    <Select
                      value={settings.allowBackorder}
                      onValueChange={(value) =>
                        setSettings((prev) => ({
                          ...prev,
                          allowBackorder: value as "true" | "false",
                        }))
                      }
                    >
                      <SelectTrigger className="admin-input-surface">
                        <SelectValue placeholder="Bajo pedido" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">No permitir</SelectItem>
                        <SelectItem value="true">Permitir</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4 w-full sm:w-auto"
                    onClick={() => void savePolicy()}
                    disabled={!canManage || savingSettings}
                  >
                    {savingSettings ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Guardar configuracion
                  </Button>
                </div>

                <div className="admin-section-card p-4">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-foreground">
                      Movimientos recientes
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Aqui ves los cambios recientes del producto: entradas,
                    salidas, reservas y cierres asociados a pedidos.
                  </p>
                  <div className="mt-4 space-y-3">
                    {loadingMovements ? (
                      <div className="rounded-lg border border-border/60 bg-secondary/20 px-3 py-4 text-center text-sm text-muted-foreground">
                        <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin text-primary" />
                        Cargando historial...
                      </div>
                    ) : movements.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border/60 bg-secondary/15 px-3 py-4 text-sm text-muted-foreground">
                        Aun no hay movimientos registrados para este producto.
                      </div>
                    ) : (
                      movements.map((movement) => (
                        <div
                          key={movement.id}
                          className="rounded-lg border border-border/60 bg-background/80 px-3 py-2.5 shadow-[0_12px_30px_-28px_rgba(15,23,42,0.35)]"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {movementLabels[movement.type]}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {formatDate(movement.createdAt)}
                                {movement.actorEmail
                                  ? ` / ${movement.actorEmail}`
                                  : ""}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {movement.orderReference ? (
                                <Badge
                                  variant="outline"
                                  className="rounded-full border-primary/15 bg-primary/[0.05] text-primary"
                                >
                                  {movement.orderReference}
                                </Badge>
                              ) : null}
                              <Badge variant="outline" className="rounded-full">
                                {movement.quantity} unidades
                              </Badge>
                            </div>
                          </div>
                          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                            <p className="rounded-xl border border-border/60 bg-secondary/20 px-3 py-2 text-muted-foreground">
                              Libre:{" "}
                              <span className="font-medium text-foreground">
                                {movement.previousAvailable ?? 0} {"->"}{" "}
                                {movement.nextAvailable}
                              </span>
                            </p>
                            <p className="rounded-xl border border-border/60 bg-secondary/20 px-3 py-2 text-muted-foreground">
                              Reservado:{" "}
                              <span className="font-medium text-foreground">
                                {movement.previousReserved} {"->"}{" "}
                                {movement.nextReserved}
                              </span>
                            </p>
                          </div>
                          {movement.note ? (
                            <p className="mt-3 border-t border-border/50 pt-3 text-sm text-muted-foreground">
                              {movement.note}
                            </p>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
