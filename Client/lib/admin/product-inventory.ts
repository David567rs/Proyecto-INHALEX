import type { AdminProduct } from "@/lib/admin/admin-api"

export function hasTrackedInventory(product: AdminProduct): boolean {
  return typeof product.stockAvailable === "number"
}

export function getAvailableUnits(product: AdminProduct): number {
  if (!hasTrackedInventory(product)) return 0
  return Math.max(0, Math.floor(product.stockAvailable ?? 0))
}

export function getReservedUnits(product: AdminProduct): number {
  if (!hasTrackedInventory(product)) return 0
  return Math.max(0, Math.floor(product.stockReserved ?? 0))
}

export function getMinimumStock(product: AdminProduct): number {
  return Math.max(0, Math.floor(product.stockMin ?? 0))
}

export function getInventoryHealth(product: AdminProduct): {
  label: string
  className: string
  helper: string
} {
  if (!hasTrackedInventory(product)) {
    return {
      label: "Sin inventario",
      className: "border-amber-200 bg-amber-50 text-amber-700",
      helper: "Inicializa existencias desde inventario.",
    }
  }

  const available = getAvailableUnits(product)
  const reserved = getReservedUnits(product)
  const minimum = getMinimumStock(product)

  if (available === 0) {
    if (product.allowBackorder) {
      return {
        label: "Bajo pedido",
        className: "border-sky-200 bg-sky-50 text-sky-700",
        helper: "Sin piezas libres, pero se permite vender bajo pedido.",
      }
    }

    return {
      label: "Sin existencias",
      className: "border-rose-200 bg-rose-50 text-rose-700",
      helper: "No hay piezas libres disponibles para venta inmediata.",
    }
  }

  if (minimum > 0 && available <= minimum) {
    return {
      label: "Stock bajo",
      className: "border-amber-200 bg-amber-50 text-amber-700",
      helper: `${available} libres y ${reserved} reservadas. Conviene reabastecer pronto.`,
    }
  }

  return {
    label: "Saludable",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    helper: `${available} libres y ${reserved} reservadas.`,
  }
}
