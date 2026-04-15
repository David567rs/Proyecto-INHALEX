"use client";

import Image from "next/image";
import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  History,
  Loader2,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
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
import { getAccessToken } from "@/lib/auth/token-storage";
import {
  getAdminOrder,
  listAdminOrders,
  updateAdminOrderStatus,
  type AdminOrderDetail,
  type AdminOrderListItem,
  type AdminOrderStatus,
} from "@/lib/admin/admin-api";
import { resolveProductDisplayImage } from "@/lib/products/product-images";
import { cn } from "@/lib/utils";

type OrderStatusFilter = "all" | AdminOrderStatus;
type OrderSummary = Record<AdminOrderStatus, number> & { manualReview: number };

interface OrderListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const EMPTY_SUMMARY: OrderSummary = {
  draft: 0,
  pending_review: 0,
  confirmed: 0,
  cancelled: 0,
  completed: 0,
  manualReview: 0,
};

const STATUS_LABELS: Record<AdminOrderStatus, string> = {
  draft: "En preparacion",
  pending_review: "Pendiente de revision",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
  completed: "Completado",
};

const STATUS_ACTION_MESSAGES: Record<
  Exclude<AdminOrderStatus, "draft">,
  string
> = {
  pending_review: "El pedido sigue pendiente de revision.",
  confirmed: "Pedido confirmado por el equipo.",
  cancelled: "Pedido cancelado y existencias liberadas.",
  completed: "Pedido completado y piezas descontadas del inventario.",
};

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatPrice(value: number, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
  }).format(value);
}

function getStatusTone(status: AdminOrderStatus) {
  if (status === "completed")
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "confirmed")
    return "border-primary/20 bg-primary/10 text-primary";
  if (status === "cancelled") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "pending_review")
    return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-stone-200 bg-stone-100 text-stone-700";
}

function getFulfillmentTone(fulfillment?: string) {
  if (fulfillment === "backorder")
    return "border-amber-200 bg-amber-50 text-amber-700";
  if (fulfillment === "manual") return "border-sky-200 bg-sky-50 text-sky-700";
  if (fulfillment === "adjusted")
    return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function getFulfillmentLabel(fulfillment?: string) {
  if (fulfillment === "backorder") return "Bajo pedido";
  if (fulfillment === "manual") return "Revision manual";
  if (fulfillment === "adjusted") return "Cantidad ajustada";
  return "Disponible";
}

function getIssueTone(severity: "info" | "warning" | "error") {
  if (severity === "error") return "border-rose-200 bg-rose-50 text-rose-700";
  if (severity === "warning")
    return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-sky-200 bg-sky-50 text-sky-700";
}

function canConfirm(status?: AdminOrderStatus) {
  return status === "pending_review";
}

function canCancel(status?: AdminOrderStatus) {
  return (
    status === "draft" || status === "pending_review" || status === "confirmed"
  );
}

function canComplete(status?: AdminOrderStatus) {
  return status === "confirmed";
}

function getFulfilledStockLabel(status: AdminOrderStatus, quantity: number) {
  return status === "completed"
    ? `${quantity} surtidas`
    : `${quantity} reservadas`;
}

export function AdminOrdersSection() {
  const { user } = useAuth();
  const canManage = user?.role === "admin";
  const [searchInput, setSearchInput] = useState("");
  const deferredSearch = useDeferredValue(searchInput);
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [summary, setSummary] = useState<OrderSummary>(EMPTY_SUMMARY);
  const [meta, setMeta] = useState<OrderListMeta>({
    total: 0,
    page: 1,
    limit: 12,
    totalPages: 1,
  });
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderDetail | null>(
    null,
  );
  const [actionNote, setActionNote] = useState("");
  const [isBooting, setIsBooting] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState<AdminOrderStatus | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, statusFilter]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setErrorMessage("Tu sesion no esta disponible. Inicia sesion de nuevo.");
      setIsBooting(false);
      return;
    }

    let isCancelled = false;

    const loadOrders = async () => {
      if (isBooting) {
        setIsBooting(true);
      } else {
        setIsLoadingOrders(true);
      }

      setErrorMessage("");

      try {
        const response = await listAdminOrders(token, {
          search: deferredSearch.trim() || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          page,
          limit: meta.limit,
        });

        if (isCancelled) return;

        setOrders(response.items);
        setSummary(response.summary);
        setMeta({
          total: response.total,
          page: response.page,
          limit: response.limit,
          totalPages: response.totalPages,
        });
        setSelectedOrderId((current) => {
          if (current && response.items.some((item) => item.id === current)) {
            return current;
          }
          return response.items[0]?.id ?? null;
        });
      } catch (error) {
        if (isCancelled) return;
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los pedidos.",
        );
        setOrders([]);
        setSummary(EMPTY_SUMMARY);
      } finally {
        if (!isCancelled) {
          setIsBooting(false);
          setIsLoadingOrders(false);
        }
      }
    };

    void loadOrders();

    return () => {
      isCancelled = true;
    };
  }, [deferredSearch, meta.limit, page, statusFilter]);

  useEffect(() => {
    if (!selectedOrderId) {
      setSelectedOrder(null);
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setErrorMessage("Tu sesion no esta disponible. Inicia sesion de nuevo.");
      return;
    }

    let isCancelled = false;
    setIsLoadingDetail(true);

    void getAdminOrder(selectedOrderId, token)
      .then((response) => {
        if (isCancelled) return;
        setSelectedOrder(response);
      })
      .catch((error) => {
        if (isCancelled) return;
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudo cargar el detalle del pedido.",
        );
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingDetail(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedOrderId]);

  const visibleStats = useMemo(
    () => [
      {
        label: "Pedidos encontrados",
        value: meta.total,
        helper: "Segun filtros actuales",
        icon: ShoppingBag,
      },
      {
        label: "Pendientes",
        value: summary.pending_review,
        helper: "Esperando revision",
        icon: ShieldCheck,
      },
      {
        label: "Confirmados",
        value: summary.confirmed,
        helper: "Con reserva activa",
        icon: CheckCircle2,
      },
      {
        label: "Completados",
        value: summary.completed,
        helper: "Reservas cerradas",
        icon: PackageCheck,
      },
      {
        label: "Revision manual",
        value: summary.manualReview,
        helper: "Requieren atencion",
        icon: AlertTriangle,
      },
    ],
    [
      meta.total,
      summary.completed,
      summary.confirmed,
      summary.manualReview,
      summary.pending_review,
    ],
  );

  const pendingFulfillmentUnits = useMemo(() => {
    if (!selectedOrder) return 0;

    return selectedOrder.items.reduce(
      (sum, item) => sum + Math.max(0, item.quantity - item.reservedQuantity),
      0,
    );
  }, [selectedOrder]);

  const refreshAll = async () => {
    const token = getAccessToken();
    if (!token) {
      setErrorMessage("Tu sesion no esta disponible. Inicia sesion de nuevo.");
      return;
    }

    setIsLoadingOrders(true);
    setErrorMessage("");

    try {
      const response = await listAdminOrders(token, {
        search: deferredSearch.trim() || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        page,
        limit: meta.limit,
      });

      setOrders(response.items);
      setSummary(response.summary);
      setMeta({
        total: response.total,
        page: response.page,
        limit: response.limit,
        totalPages: response.totalPages,
      });

      const nextSelectedId =
        response.items.find((item) => item.id === selectedOrderId)?.id ??
        response.items[0]?.id ??
        null;

      setSelectedOrderId(nextSelectedId);

      if (nextSelectedId) {
        setIsLoadingDetail(true);
        const detail = await getAdminOrder(nextSelectedId, token);
        setSelectedOrder(detail);
      } else {
        setSelectedOrder(null);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron recargar los pedidos.",
      );
    } finally {
      setIsLoadingOrders(false);
      setIsLoadingDetail(false);
    }
  };

  const handleStatusChange = async (nextStatus: AdminOrderStatus) => {
    if (!selectedOrder) return;

    const token = getAccessToken();
    if (!token) {
      setErrorMessage("Tu sesion no esta disponible. Inicia sesion de nuevo.");
      return;
    }

    setActionLoading(nextStatus);
    setErrorMessage("");
    setSuccessMessage("");

    const accepted = window.confirm(
      `Vas a cambiar el pedido ${selectedOrder.reference} a "${STATUS_LABELS[nextStatus]}". Deseas continuar?`,
    );

    if (!accepted) {
      setActionLoading(null);
      return;
    }

    try {
      const updatedOrder = await updateAdminOrderStatus(
        selectedOrder.id,
        {
          status: nextStatus,
          note: actionNote.trim() || undefined,
        },
        token,
      );

      setSelectedOrder(updatedOrder);
      setActionNote("");
      setSuccessMessage(
        STATUS_ACTION_MESSAGES[
          nextStatus as Exclude<AdminOrderStatus, "draft">
        ] ?? "Pedido actualizado.",
      );
      await refreshAll();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el pedido.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const statusOptions: Array<{ value: OrderStatusFilter; label: string }> = [
    { value: "all", label: "Todos los estados" },
    { value: "pending_review", label: STATUS_LABELS.pending_review },
    { value: "confirmed", label: STATUS_LABELS.confirmed },
    { value: "completed", label: STATUS_LABELS.completed },
    { value: "cancelled", label: STATUS_LABELS.cancelled },
    { value: "draft", label: STATUS_LABELS.draft },
  ];

  if (isBooting) {
    return (
      <section className="admin-panel-shell admin-animate-card">
        <div className="relative z-10 flex min-h-[170px] items-center justify-center text-muted-foreground">
          <Loader2 className="mr-3 h-5 w-5 animate-spin text-primary" />
          Preparando pedidos...
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
              <ShoppingBag className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-primary">
              Pedidos
            </h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Revisa pedidos confirmados desde la web, valida stock reservado,
              gestiona cancelaciones y marca cierres con trazabilidad completa.
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
              <Link href="/admin/catalogo/inventario">Ir a inventario</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {visibleStats.map((item) => (
            <div key={item.label} className="admin-section-card p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                {item.label}
              </p>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-2xl font-semibold text-foreground">
                    {item.value}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.helper}
                  </p>
                </div>
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

        <div className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
          <div className="space-y-5">
            <div className="admin-section-card p-4">
              <div className="flex flex-col gap-4 border-b border-border/60 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Busqueda y estados
                  </p>
                  <h4 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                    Filtra los pedidos activos
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Busca por folio o cliente y enfoca el listado por estado
                    comercial.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{meta.total} pedidos</Badge>
                  <Badge variant="secondary">
                    {summary.pending_review} pendientes
                  </Badge>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Buscar por folio, cliente o correo"
                    className="admin-input-surface pl-9"
                  />
                </div>

                <Select
                  value={statusFilter}
                  onValueChange={(value) =>
                    setStatusFilter(value as OrderStatusFilter)
                  }
                >
                  <SelectTrigger className="admin-input-surface">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="rounded-xl border border-primary/15 bg-primary/[0.05] px-4 py-3 text-sm text-muted-foreground">
                  {meta.total} pedidos
                </div>
              </div>
            </div>

            <div className="admin-table-shell">
              <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Listado principal
                  </p>
                  <h4 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                    Pedidos recibidos
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Selecciona un pedido para revisar cliente, inventario y
                    acciones del equipo.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">Pagina {meta.page}</Badge>
                  <Badge variant="secondary">{meta.totalPages} paginas</Badge>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="admin-table-head-row">
                    <TableHead className="admin-table-head-cell">
                      Folio
                    </TableHead>
                    <TableHead className="admin-table-head-cell">
                      Cliente
                    </TableHead>
                    <TableHead className="admin-table-head-cell">
                      Total
                    </TableHead>
                    <TableHead className="admin-table-head-cell">
                      Fecha
                    </TableHead>
                    <TableHead className="admin-table-head-cell">
                      Estado
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="admin-table-body-compact">
                  {isLoadingOrders ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin text-primary" />
                        Cargando pedidos...
                      </TableCell>
                    </TableRow>
                  ) : orders.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        No encontramos pedidos con esos filtros.
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((order) => (
                      <TableRow
                        key={order.id}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-primary/[0.04]",
                          selectedOrderId === order.id && "bg-primary/[0.06]",
                        )}
                        onClick={() => setSelectedOrderId(order.id)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">
                              {order.reference}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {order.totalItems} aromas
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">
                              {order.customerName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {order.customerEmail}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {formatPrice(order.subtotal, order.currency)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Badge
                              variant="outline"
                              className={cn(
                                "rounded-full",
                                getStatusTone(order.status),
                              )}
                            >
                              {STATUS_LABELS[order.status]}
                            </Badge>
                            {order.needsManualReview ? (
                              <Badge
                                variant="outline"
                                className="rounded-full border-sky-200 bg-sky-50 text-sky-700"
                              >
                                Revision manual
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || isLoadingOrders}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Anterior
              </Button>
              <span className="px-2 text-sm text-muted-foreground">
                Pagina {meta.page} de {meta.totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= meta.totalPages || isLoadingOrders}
                onClick={() =>
                  setPage((current) => Math.min(meta.totalPages, current + 1))
                }
              >
                Siguiente
              </Button>
            </div>
          </div>
          <div className="space-y-5">
            {!selectedOrderId ? (
              <div className="admin-empty-state admin-section-card p-4 text-left">
                <div className="rounded-full bg-primary/10 p-3 text-primary">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    Selecciona un pedido
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Aqui apareceran cliente, aromas, alertas y acciones
                    operativas.
                  </p>
                </div>
              </div>
            ) : isLoadingDetail && !selectedOrder ? (
              <div className="admin-section-card p-4 text-sm text-muted-foreground">
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin text-primary" />
                Cargando detalle del pedido...
              </div>
            ) : !selectedOrder ? (
              <div className="admin-section-card p-4 text-sm text-muted-foreground">
                No pudimos cargar el detalle de este pedido.
              </div>
            ) : (
              <>
                <div className="admin-section-card p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                        Pedido seleccionado
                      </p>
                      <h4 className="mt-3 text-2xl font-semibold text-foreground">
                        {selectedOrder.reference}
                      </h4>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {selectedOrder.customerName} /{" "}
                        {selectedOrder.customerEmail}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full",
                          getStatusTone(selectedOrder.status),
                        )}
                      >
                        {STATUS_LABELS[selectedOrder.status]}
                      </Badge>
                      {selectedOrder.needsManualReview ? (
                        <Badge
                          variant="outline"
                          className="rounded-full border-sky-200 bg-sky-50 text-sky-700"
                        >
                          Revision manual
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    <div className="admin-stat-chip">
                      <span className="font-medium">Total:</span>{" "}
                      {formatPrice(
                        selectedOrder.subtotal,
                        selectedOrder.currency,
                      )}
                    </div>
                    <div className="admin-stat-chip">
                      <span className="font-medium">Aromas:</span>{" "}
                      {selectedOrder.totalItems}
                    </div>
                    <div className="admin-stat-chip">
                      <span className="font-medium">Canal:</span>{" "}
                      {selectedOrder.channel}
                    </div>
                    <div className="admin-stat-chip">
                      <span className="font-medium">Validado:</span>{" "}
                      {formatDate(selectedOrder.lastValidatedAt)}
                    </div>
                    <div className="admin-stat-chip">
                      <span className="font-medium">Creado:</span>{" "}
                      {formatDate(selectedOrder.createdAt)}
                    </div>
                    <div className="admin-stat-chip">
                      <span className="font-medium">Ultimo hito:</span>{" "}
                      {formatDate(
                        selectedOrder.completedAt ??
                          selectedOrder.cancelledAt ??
                          selectedOrder.confirmedAt,
                      )}
                    </div>
                  </div>

                  {pendingFulfillmentUnits > 0 ? (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                      Faltan {pendingFulfillmentUnits} piezas por surtir. Si ya
                      entraron al inventario, el sistema intentara reservarlas
                      automaticamente al marcar este pedido como completado.
                    </div>
                  ) : null}
                </div>

                <div className="admin-section-card p-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-foreground">
                      Datos del cliente
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-border/60 bg-background/80 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Nombre
                      </p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {selectedOrder.customerName}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/80 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Correo
                      </p>
                      <a
                        href={`mailto:${selectedOrder.customerEmail}`}
                        className="mt-2 block text-sm font-medium text-primary hover:underline"
                      >
                        {selectedOrder.customerEmail}
                      </a>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/80 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Telefono
                      </p>
                      <a
                        href={`tel:${selectedOrder.customerPhone}`}
                        className="mt-2 block text-sm font-medium text-primary hover:underline"
                      >
                        {selectedOrder.customerPhone}
                      </a>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/80 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Cuenta vinculada
                      </p>
                      <p className="mt-2 text-sm text-foreground">
                        {selectedOrder.customerUserEmail ??
                          "Pedido como invitado"}
                      </p>
                    </div>
                  </div>

                  {selectedOrder.customerNotes ? (
                    <div className="mt-4 rounded-xl border border-primary/15 bg-primary/[0.05] px-4 py-3 text-sm leading-6 text-foreground">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Nota del cliente
                      </p>
                      <p className="mt-2">{selectedOrder.customerNotes}</p>
                    </div>
                  ) : null}
                </div>

                <div className="admin-section-card p-4">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-foreground">
                      Aromas del pedido
                    </p>
                  </div>

                  <div className="mt-4 space-y-3">
                    {selectedOrder.items.map((item) => (
                      <article
                        key={`${selectedOrder.id}-${item.productId}`}
                        className="rounded-lg border border-border/60 bg-background/80 p-3"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row">
                          <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-lg border border-emerald-100 bg-white sm:w-24">
                            <Image
                              src={resolveProductDisplayImage({
                                slug: item.productSlug,
                                name: item.productName,
                                image: item.image,
                                aromas: [],
                              })}
                              alt={item.productName}
                              fill
                              className="object-cover"
                              sizes="96px"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <div className="flex flex-wrap gap-2">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "rounded-full",
                                      getFulfillmentTone(item.fulfillment),
                                    )}
                                  >
                                    {getFulfillmentLabel(item.fulfillment)}
                                  </Badge>
                                  {item.inventoryTracked ? (
                                    <Badge
                                      variant="outline"
                                      className="rounded-full border-primary/15 bg-primary/[0.05] text-primary"
                                    >
                                      Inventario activo
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="rounded-full border-sky-200 bg-sky-50 text-sky-700"
                                    >
                                      Sin stock inicializado
                                    </Badge>
                                  )}
                                </div>
                                <h5 className="mt-3 text-lg font-semibold text-foreground">
                                  {item.productName}
                                </h5>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {item.presentation} / {item.origin}
                                </p>
                                {item.message ? (
                                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                    {item.message}
                                  </p>
                                ) : null}
                              </div>

                              <div className="text-left sm:text-right">
                                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                  Subtotal
                                </p>
                                <p className="mt-2 text-xl font-semibold text-foreground">
                                  {formatPrice(item.subtotal, item.currency)}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2 text-xs">
                              <span className="rounded-full border border-border/70 bg-white px-2.5 py-1 font-medium text-foreground">
                                Solicitado: {item.requestedQuantity}
                              </span>
                              <span className="rounded-full border border-border/70 bg-white px-2.5 py-1 font-medium text-foreground">
                                Confirmado: {item.quantity}
                              </span>
                              {item.reservedQuantity > 0 ? (
                                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
                                  {getFulfilledStockLabel(
                                    selectedOrder.status,
                                    item.reservedQuantity,
                                  )}
                                </span>
                              ) : null}
                              {item.backorderQuantity > 0 ? (
                                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
                                  {item.backorderQuantity} bajo pedido
                                </span>
                              ) : null}
                              {typeof item.stockAvailable === "number" ? (
                                <span className="rounded-full border border-stone-200 bg-stone-100 px-2.5 py-1 font-medium text-stone-700">
                                  Stock libre al validar: {item.stockAvailable}
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-4">
                              <Button
                                variant="link"
                                className="h-auto px-0 text-primary"
                                asChild
                              >
                                <Link href={`/productos/${item.productSlug}`}>
                                  Ver producto publico
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="admin-section-card p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-foreground">
                      Alertas y observaciones
                    </p>
                  </div>

                  {selectedOrder.issues.length === 0 ? (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      Este pedido no tiene alertas abiertas.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {selectedOrder.issues.map((issue) => (
                        <div
                          key={`${issue.code}-${issue.productId ?? issue.title}`}
                          className={cn(
                            "rounded-lg border px-3 py-2.5 text-sm leading-6",
                            getIssueTone(issue.severity),
                          )}
                        >
                          <p className="font-semibold">{issue.title}</p>
                          <p className="mt-1">{issue.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="admin-section-card p-4">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-foreground">
                      Historial de estado
                    </p>
                  </div>

                  <div className="mt-4 space-y-3">
                    {[...selectedOrder.statusNotes].reverse().map((note) => (
                      <div
                        key={`${note.createdAt}-${note.status}-${note.note}`}
                        className="rounded-xl border border-border/60 bg-background/80 px-4 py-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className={cn(
                                "rounded-full",
                                getStatusTone(note.status),
                              )}
                            >
                              {STATUS_LABELS[note.status]}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(note.createdAt)}
                            </span>
                          </div>
                          {note.actorEmail ? (
                            <span className="text-xs text-muted-foreground">
                              {note.actorEmail}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-3 text-sm leading-6 text-foreground">
                          {note.note}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="admin-section-card p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-foreground">
                      Acciones del equipo
                    </p>
                  </div>

                  <Textarea
                    value={actionNote}
                    onChange={(event) => setActionNote(event.target.value)}
                    className="admin-input-surface mt-4 min-h-[88px]"
                    maxLength={500}
                    placeholder="Nota operativa opcional para dejar contexto del cambio de estado."
                  />

                  <div className="mt-2 text-xs text-muted-foreground">
                    {actionNote.trim().length}/500 caracteres
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button
                      type="button"
                      onClick={() => void handleStatusChange("confirmed")}
                      disabled={
                        !canManage ||
                        !canConfirm(selectedOrder.status) ||
                        Boolean(actionLoading)
                      }
                    >
                      {actionLoading === "confirmed" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      )}
                      Confirmar revision
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleStatusChange("completed")}
                      disabled={
                        !canManage ||
                        !canComplete(selectedOrder.status) ||
                        Boolean(actionLoading)
                      }
                    >
                      {actionLoading === "completed" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <PackageCheck className="mr-2 h-4 w-4" />
                      )}
                      Marcar completado
                    </Button>

                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => void handleStatusChange("cancelled")}
                      disabled={
                        !canManage ||
                        !canCancel(selectedOrder.status) ||
                        Boolean(actionLoading)
                      }
                    >
                      {actionLoading === "cancelled" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <AlertTriangle className="mr-2 h-4 w-4" />
                      )}
                      Cancelar pedido
                    </Button>
                  </div>

                  {!canConfirm(selectedOrder.status) &&
                  !canComplete(selectedOrder.status) &&
                  !canCancel(selectedOrder.status) ? (
                    <div className="mt-4 rounded-xl border border-stone-200 bg-stone-100 px-4 py-3 text-sm text-stone-700">
                      Este pedido ya esta en un estado terminal y no admite
                      nuevas acciones.
                    </div>
                  ) : null}

                  <p className="mt-4 text-xs text-muted-foreground">
                    Confirmar mantiene la reserva activa, completar consume la
                    reserva y cancelar libera existencias al inventario.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
