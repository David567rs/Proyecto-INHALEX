"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  AlertTriangle,
  Archive,
  Database,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  CheckCheck,
  PackageCheck,
  PencilLine,
  RefreshCw,
  Upload,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/components/auth/auth-provider";
import { AdminProductEditDialog } from "@/components/admin/admin-product-edit-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { getAccessToken } from "@/lib/auth/token-storage";
import {
  exportAdminProductsCsv,
  exportAdminProductsTemplateCsv,
  importAdminProductsCsv,
  listAdminProductCategories,
  listAdminProducts,
  seedAdminProducts,
  type AdminProduct,
  type AdminProductCategory,
  updateAdminProduct,
} from "@/lib/admin/admin-api";
import {
  getAvailableUnits,
  getInventoryHealth,
  getMinimumStock,
  getReservedUnits,
  hasTrackedInventory,
} from "@/lib/admin/product-inventory";
import { PRODUCT_CATEGORIES } from "@/lib/products/categories";
import type { ProductCategoryOption } from "@/lib/products/categories";
import { cn } from "@/lib/utils";

interface ProductListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ProductFilters {
  search: string;
  category: string;
  status: "all" | AdminProduct["status"];
  inStock: "all" | "true" | "false";
  page: number;
  limit: number;
}

type BulkStatusAction = Extract<AdminProduct["status"], "active" | "draft" | "archived">;

const INITIAL_PRODUCT_FILTERS: ProductFilters = {
  search: "",
  category: "all",
  status: "all",
  inStock: "all",
  page: 1,
  limit: 10,
};

const PRODUCT_STATUS_LABELS: Record<AdminProduct["status"], string> = {
  draft: "Desactivado",
  active: "Activado",
  archived: "Archivado",
};

function getBulkActionCopy(action: BulkStatusAction, count: number) {
  const plural = count === 1 ? "producto seleccionado" : "productos seleccionados";

  switch (action) {
    case "active":
      return {
        actionLabel: "Activar",
        title: `Activar ${plural}`,
        description:
          "Los productos volveran a estar disponibles comercialmente. El inventario no se modifica.",
        resultLabel: "activados",
      };
    case "draft":
      return {
        actionLabel: "Desactivar",
        title: `Desactivar ${plural}`,
        description:
          "Los productos dejaran de mostrarse como activos, pero conservan su inventario e historial.",
        resultLabel: "desactivados",
      };
    case "archived":
      return {
        actionLabel: "Archivar",
        title: `Archivar ${plural}`,
        description:
          "Solo se archivaran los productos que no tengan stock reservado ni pedidos abiertos.",
        resultLabel: "archivados",
      };
    default:
      return {
        actionLabel: "Actualizar",
        title: `Actualizar ${plural}`,
        description: "Se aplicara el cambio seleccionado.",
        resultLabel: "actualizados",
      };
  }
}

function formatPrice(value: number, currency: string): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency || "MXN",
  }).format(value);
}

function buildCategoryLabelMap(
  categories: ProductCategoryOption[],
): Record<string, string> {
  return categories.reduce<Record<string, string>>((acc, category) => {
    acc[category.id] = category.name;
    return acc;
  }, {});
}

function buildCategoryOptions(
  categories: AdminProductCategory[],
): ProductCategoryOption[] {
  return [
    { id: "all", name: "Todas las categorias" },
    ...categories.map((category) => ({
      id: category.slug,
      name: category.name,
    })),
  ];
}

function detectCsvDelimiter(raw: string): "," | ";" {
  const firstLine = raw.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0] ?? "";
  const semicolonCount = (firstLine.match(/;/g) ?? []).length;
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  return semicolonCount > commaCount ? ";" : ",";
}

function parseCsvMatrix(raw: string, delimiter: "," | ";"): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let currentCell = "";
  let inQuotes = false;
  const text = raw.replace(/^\uFEFF/, "");

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = index + 1 < text.length ? text[index + 1] : "";

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      row.push(currentCell);
      currentCell = "";
      continue;
    }

    if (!inQuotes && char === "\n") {
      row.push(currentCell);
      rows.push(row);
      row = [];
      currentCell = "";
      continue;
    }

    if (!inQuotes && char === "\r") {
      continue;
    }

    currentCell += char;
  }

  row.push(currentCell);
  if (row.some((value) => value.trim() !== "")) {
    rows.push(row);
  }

  return rows;
}

function normalizeCsvHeader(header: string): string {
  const normalized = header.trim().toLowerCase();
  switch (normalized) {
    case "id":
      return "id";
    case "slug":
      return "slug";
    case "nombre":
      return "nombre";
    case "categoria":
    case "categoría":
      return "categoria";
    case "precio":
      return "precio";
    case "moneda":
      return "moneda";
    case "presentacion":
    case "presentación":
      return "presentacion";
    case "presentation_ml":
    case "presentacion_ml":
    case "ml":
    case "mililitros":
      return "presentation_ml";
    case "estado":
      return "estado";
    case "disponible":
    case "instock":
      return "disponible";
    case "orden":
    case "sortorder":
      return "orden";
    default:
      return "";
  }
}

function parseCsvObjects(raw: string): Array<Record<string, string>> {
  const delimiter = detectCsvDelimiter(raw);
  const matrix = parseCsvMatrix(raw, delimiter);
  if (matrix.length === 0) return [];

  const headers = matrix[0].map((cell) => normalizeCsvHeader(cell));
  const rows: Array<Record<string, string>> = [];

  for (let rowIndex = 1; rowIndex < matrix.length; rowIndex += 1) {
    const matrixRow = matrix[rowIndex];
    const row: Record<string, string> = {};
    let hasValue = false;

    for (let columnIndex = 0; columnIndex < headers.length; columnIndex += 1) {
      const header = headers[columnIndex];
      if (!header) continue;
      const value = (matrixRow[columnIndex] ?? "").trim();
      if (value !== "") {
        row[header] = value;
        hasValue = true;
      }
    }

    if (hasValue) {
      rows.push(row);
    }
  }

  return rows;
}

// SECTION: component
export function AdminProductsSection() {
  const { user } = useAuth();
  const csvFileInputRef = useRef<HTMLInputElement | null>(null);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categoryOptions, setCategoryOptions] =
    useState<ProductCategoryOption[]>(PRODUCT_CATEGORIES);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [seedProductsMessage, setSeedProductsMessage] = useState("");
  const [isSeedingProducts, setIsSeedingProducts] = useState(false);
  const [isExportingProductsCsv, setIsExportingProductsCsv] = useState(false);
  const [isExportingProductsTemplate, setIsExportingProductsTemplate] =
    useState(false);
  const [isImportingProductsCsv, setIsImportingProductsCsv] = useState(false);
  const [csvMessage, setCsvMessage] = useState("");
  const [filters, setFilters] = useState<ProductFilters>(
    INITIAL_PRODUCT_FILTERS,
  );
  const [searchInput, setSearchInput] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);
  const [meta, setMeta] = useState<ProductListMeta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [bulkMessage, setBulkMessage] = useState("");
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [pendingBulkAction, setPendingBulkAction] =
    useState<BulkStatusAction | null>(null);

  const canManageCatalog = user?.role === "admin";

  const totalActiveProductsInPage = useMemo(
    () => products.filter((product) => product.status === "active").length,
    [products],
  );
  const totalAvailableUnitsInPage = useMemo(
    () =>
      products.reduce(
        (total, product) => total + getAvailableUnits(product),
        0,
      ),
    [products],
  );
  const productsWithoutTrackedInventoryInPage = useMemo(
    () => products.filter((product) => !hasTrackedInventory(product)).length,
    [products],
  );
  const productsOutOfStockInPage = useMemo(
    () =>
      products.filter(
        (product) =>
          hasTrackedInventory(product) && getAvailableUnits(product) === 0,
      ).length,
    [products],
  );
  const productsLowStockInPage = useMemo(
    () =>
      products.filter((product) => {
        if (!hasTrackedInventory(product)) return false;
        const minimum = getMinimumStock(product);
        const available = getAvailableUnits(product);
        return minimum > 0 && available > 0 && available <= minimum;
      }).length,
    [products],
  );
  const stockAttentionCount = useMemo(
    () =>
      productsWithoutTrackedInventoryInPage +
      productsOutOfStockInPage +
      productsLowStockInPage,
    [
      productsLowStockInPage,
      productsOutOfStockInPage,
      productsWithoutTrackedInventoryInPage,
    ],
  );
  const activeFilterCount = useMemo(() => {
    let total = 0;
    if (searchInput.trim()) total += 1;
    if (filters.category !== "all") total += 1;
    if (filters.status !== "all") total += 1;
    if (filters.inStock !== "all") total += 1;
    if (filters.limit !== INITIAL_PRODUCT_FILTERS.limit) total += 1;
    return total;
  }, [
    filters.category,
    filters.inStock,
    filters.limit,
    filters.status,
    searchInput,
  ]);

  const productCategoryOptions = useMemo(
    () => categoryOptions.filter((category) => category.id !== "all"),
    [categoryOptions],
  );
  const categoryLabelById = useMemo(
    () => buildCategoryLabelMap(categoryOptions),
    [categoryOptions],
  );
  const editingProduct = useMemo(
    () =>
      products.find((product) => product._id === editingProductId) ?? null,
    [editingProductId, products],
  );
  const selectedProductIdSet = useMemo(
    () => new Set(selectedProductIds),
    [selectedProductIds],
  );
  const selectedProducts = useMemo(
    () => products.filter((product) => selectedProductIdSet.has(product._id)),
    [products, selectedProductIdSet],
  );
  const selectedCount = selectedProducts.length;
  const areAllVisibleSelected = useMemo(
    () =>
      products.length > 0 &&
      products.every((product) => selectedProductIdSet.has(product._id)),
    [products, selectedProductIdSet],
  );
  const hasPartialSelection =
    selectedCount > 0 && selectedCount < products.length;
  const stockAttentionProducts = useMemo(
    () =>
      products
        .map((product) => {
          const inventoryHealth = getInventoryHealth(product);
          let priority = 3;

          if (!hasTrackedInventory(product)) priority = 0;
          else if (getAvailableUnits(product) === 0) priority = 1;
          else if (inventoryHealth.label === "Stock bajo") priority = 2;

          return {
            product,
            inventoryHealth,
            priority,
          };
        })
        .filter((entry) => entry.inventoryHealth.label !== "Saludable")
        .sort((left, right) => left.priority - right.priority),
    [products],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setFilters((prev) => {
        if (prev.search === searchInput) return prev;
        return {
          ...prev,
          search: searchInput,
          page: 1,
        };
      });
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const setFilter = useCallback(
    (patch: Partial<ProductFilters>, resetPage = true) => {
      setFilters((prev) => ({
        ...prev,
        ...patch,
        page: resetPage ? 1 : (patch.page ?? prev.page),
      }));
    },
    [],
  );

  const resetFilters = useCallback(() => {
    setSearchInput("");
    setFilters(INITIAL_PRODUCT_FILTERS);
  }, []);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    const token = getAccessToken();
    if (!token) {
      setProducts([]);
      setErrorMessage("No se encontró token de acceso.");
      setIsLoading(false);
      return;
    }

    try {
      const [response, categoriesResponse] = await Promise.all([
        listAdminProducts(token, {
          search: filters.search.trim() || undefined,
          category: filters.category !== "all" ? filters.category : undefined,
          status: filters.status !== "all" ? filters.status : undefined,
          inStock:
            filters.inStock === "all" ? undefined : filters.inStock === "true",
          page: filters.page,
          limit: filters.limit,
        }),
        listAdminProductCategories(token),
      ]);

      const dynamicCategoryOptions = buildCategoryOptions(categoriesResponse);
      setCategoryOptions(
        dynamicCategoryOptions.length > 1
          ? dynamicCategoryOptions
          : PRODUCT_CATEGORIES,
      );
      setProducts(response.items);
      setMeta({
        total: response.total,
        page: response.page,
        limit: response.limit,
        totalPages: response.totalPages,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los productos.";
      setErrorMessage(message);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (!isEditDialogOpen || !editingProductId) return;
    if (products.some((product) => product._id === editingProductId)) return;

    setIsEditDialogOpen(false);
    setEditingProductId(null);
  }, [editingProductId, isEditDialogOpen, products]);

  useEffect(() => {
    setSelectedProductIds((current) =>
      current.filter((productId) =>
        products.some((product) => product._id === productId),
      ),
    );
  }, [products]);

  const triggerBlobDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportProductsCsv = async () => {
    const token = getAccessToken();
    if (!token) {
      setCsvMessage("No se encontró token.");
      return;
    }

    setIsExportingProductsCsv(true);
    setCsvMessage("");

    try {
      const exported = await exportAdminProductsCsv(token, {
        search: filters.search.trim() || undefined,
        category: filters.category !== "all" ? filters.category : undefined,
        status: filters.status !== "all" ? filters.status : undefined,
        inStock:
          filters.inStock === "all" ? undefined : filters.inStock === "true",
      });
      triggerBlobDownload(exported.blob, exported.fileName);
      setCsvMessage("La lista de productos se descargó correctamente.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo descargar la lista de productos.";
      setCsvMessage(message);
    } finally {
      setIsExportingProductsCsv(false);
    }
  };

  const handleExportProductsTemplate = async () => {
    const token = getAccessToken();
    if (!token) {
      setCsvMessage("No se encontró token.");
      return;
    }

    setIsExportingProductsTemplate(true);
    setCsvMessage("");

    try {
      const exported = await exportAdminProductsTemplateCsv(token);
      triggerBlobDownload(exported.blob, exported.fileName);
      setCsvMessage(
        "La plantilla se descargó. Puedes editarla en Excel y reimportarla.",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo descargar la plantilla.";
      setCsvMessage(message);
    } finally {
      setIsExportingProductsTemplate(false);
    }
  };

  const handleImportProductsCsvFile = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const accepted = window.confirm(
      `Vas a subir "${file.name}". Esto puede actualizar productos existentes. Revisa el archivo antes de continuar.`,
    );

    if (!accepted) {
      event.target.value = "";
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setCsvMessage("No se encontró token.");
      event.target.value = "";
      return;
    }

    setIsImportingProductsCsv(true);
    setCsvMessage("");

    try {
      const fileContent = await file.text();
      const rows = parseCsvObjects(fileContent);

      if (rows.length === 0) {
        setCsvMessage("El archivo no tiene productos válidos para importar.");
        return;
      }

      const result = await importAdminProductsCsv(rows, token);
      const firstError = result.errors[0];
      const errorHint = firstError
        ? ` Primer error: renglón ${firstError.row} (${firstError.idOrSlug}) - ${firstError.message}.`
        : "";

      setCsvMessage(
        `Carga completada. Actualizados: ${result.updated}, omitidos: ${result.skipped}, con error: ${result.failed}.${errorHint}`,
      );
      await loadProducts();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo subir la lista de productos.";
      setCsvMessage(message);
    } finally {
      setIsImportingProductsCsv(false);
      event.target.value = "";
    }
  };

  const handleSeedProducts = async () => {
    const token = getAccessToken();
    if (!token) {
      setSeedProductsMessage("No se encontró token.");
      return;
    }

    const accepted = window.confirm(
      "Vas a cargar el catálogo base. Esto puede crear productos faltantes y actualizar los existentes. Los productos sin stock definido quedarán en 0. ¿Deseas continuar?",
    );

    if (!accepted) return;

    setIsSeedingProducts(true);
    setSeedProductsMessage("");

    try {
      const response = await seedAdminProducts(token);
      setSeedProductsMessage(
        `Catálogo base cargado. Nuevos: ${response.created}, actualizados: ${response.updated}.`,
      );
      await loadProducts();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo cargar el catálogo base.";
      setSeedProductsMessage(message);
    } finally {
      setIsSeedingProducts(false);
    }
  };

  const handleProductSaved = useCallback(async () => {
    await loadProducts();
  }, [loadProducts]);

  const openEditDialog = (productId: string) => {
    setEditingProductId(productId);
    setIsEditDialogOpen(true);
  };

  const toggleProductSelection = useCallback(
    (productId: string, checked: boolean | "indeterminate") => {
      setSelectedProductIds((current) => {
        if (checked) {
          return current.includes(productId) ? current : [...current, productId];
        }

        return current.filter((value) => value !== productId);
      });
    },
    [],
  );

  const toggleVisibleSelection = useCallback(
    (checked: boolean | "indeterminate") => {
      if (!checked) {
        setSelectedProductIds([]);
        return;
      }

      setSelectedProductIds(products.map((product) => product._id));
    },
    [products],
  );

  const clearSelection = useCallback(() => {
    setSelectedProductIds([]);
  }, []);

  const requestBulkAction = (action: BulkStatusAction) => {
    if (!selectedCount || isBulkUpdating) return;
    setPendingBulkAction(action);
  };

  const handleBulkStatusUpdate = useCallback(async () => {
    if (!pendingBulkAction) return;

    const token = getAccessToken();
    if (!token) {
      setBulkMessage("No se encontro token.");
      setPendingBulkAction(null);
      return;
    }

    const selectedTargets = selectedProducts.filter(
      (product) => product.status !== pendingBulkAction,
    );
    const skipped = selectedProducts.length - selectedTargets.length;

    if (selectedTargets.length === 0) {
      setBulkMessage("La seleccion ya tiene ese estado.");
      setPendingBulkAction(null);
      return;
    }

    const copy = getBulkActionCopy(pendingBulkAction, selectedProducts.length);
    setIsBulkUpdating(true);
    setBulkMessage("");

    try {
      const results = await Promise.allSettled(
        selectedTargets.map(async (product) => {
          const updated = await updateAdminProduct(
            product._id,
            { status: pendingBulkAction },
            token,
          );

          return {
            product,
            updated,
          };
        }),
      );

      let updatedCount = 0;
      const failed: string[] = [];

      for (const result of results) {
        if (result.status === "fulfilled") {
          updatedCount += 1;
          continue;
        }

        const reason =
          result.reason instanceof Error
            ? result.reason.message
            : "No se pudo aplicar el cambio.";
        failed.push(reason);
      }

      await loadProducts();
      clearSelection();

      const messageParts = [
        `${updatedCount} ${copy.resultLabel} correctamente.`,
      ];

      if (skipped > 0) {
        messageParts.push(`${skipped} ya estaban en ese estado.`);
      }

      if (failed.length > 0) {
        messageParts.push(
          `${failed.length} no se actualizaron. Primer detalle: ${failed[0]}`,
        );
      }

      setBulkMessage(messageParts.join(" "));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo aplicar la accion masiva.";
      setBulkMessage(message);
    } finally {
      setIsBulkUpdating(false);
      setPendingBulkAction(null);
    }
  }, [clearSelection, loadProducts, pendingBulkAction, selectedProducts]);

  const infoMessage = bulkMessage || seedProductsMessage || csvMessage;
  const pendingBulkCopy = pendingBulkAction
    ? getBulkActionCopy(pendingBulkAction, selectedCount)
    : null;

  return (
    <div className="admin-panel-shell admin-animate-card">
      <div className="relative z-10">
        <h2 className="text-2xl font-semibold tracking-tight text-primary">
          Productos
        </h2>
      </div>

      <input
        ref={csvFileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => void handleImportProductsCsvFile(event)}
      />

      <div className="relative z-10 mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <div className="admin-metric-card">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Productos
          </p>
          <p className="mt-2 text-xl font-semibold tracking-tight text-foreground">
            {meta.total}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Resultados con los filtros actuales.
          </p>
        </div>

        <div className="admin-metric-card">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Activados en página
          </p>
          <p className="mt-2 text-xl font-semibold tracking-tight text-foreground">
            {totalActiveProductsInPage}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Productos listos para operar comercialmente.
          </p>
        </div>

        <div className="admin-metric-card">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Piezas disponibles
          </p>
          <p className="mt-2 text-xl font-semibold tracking-tight text-foreground">
            {totalAvailableUnitsInPage}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {products.reduce(
              (total, product) => total + getReservedUnits(product),
              0,
            )}{" "}
            reservadas en los productos visibles.
          </p>
        </div>

        <div className="admin-metric-card">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Atención de stock
          </p>
          <p className="mt-2 text-xl font-semibold tracking-tight text-foreground">
            {stockAttentionCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {productsWithoutTrackedInventoryInPage} sin inventario,{" "}
            {productsOutOfStockInPage} sin existencias y{" "}
            {productsLowStockInPage} con stock bajo.
          </p>
        </div>
      </div>

      {stockAttentionProducts.length > 0 ? (
        <div className="admin-section-card relative z-10 mt-4 overflow-hidden border-amber-200/80 bg-amber-50/60 px-4 py-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-white/80 px-3 py-1 text-xs font-semibold text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                Atencion inmediata
              </p>
              <h3 className="mt-3 text-base font-semibold text-foreground">
                Hay productos que requieren revision operativa
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Esta franja te ayuda a detectar rapido productos sin inventario,
                sin existencias o con stock bajo en la pagina actual.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 xl:justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setFilter({ inStock: "false" })}
              >
                Revisar sin stock comercial
              </Button>
              <Button type="button" size="sm" variant="outline" asChild>
                <Link href="/admin/catalogo/inventario">
                  <PackageCheck className="mr-2 h-4 w-4" />
                  Abrir inventario
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {stockAttentionProducts.slice(0, 6).map(({ product, inventoryHealth }) => (
              <div
                key={`stock-alert-${product._id}`}
                className="rounded-lg border border-white/80 bg-white/85 p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {product.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {categoryLabelById[product.category] ?? product.category}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("rounded-full", inventoryHealth.className)}
                  >
                    {inventoryHealth.label}
                  </Badge>
                </div>

                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  {inventoryHealth.helper}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={`/admin/catalogo/inventario?producto=${product._id}`}
                    >
                      Ver inventario
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => openEditDialog(product._id)}
                  >
                    Editar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="admin-toolbar-surface relative z-20 mt-4 px-4 py-4 lg:sticky lg:top-0">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              Gestión del catálogo
            </span>
            <span className="text-xs">
              Edita datos comerciales, exporta la lista o carga cambios masivos.
            </span>
          </div>

          <div className="flex flex-wrap gap-2 xl:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="whitespace-nowrap transition-all hover:-translate-y-0.5"
              onClick={() => void loadProducts()}
              disabled={isLoading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
              Recargar productos
            </Button>
            {canManageCatalog ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="whitespace-nowrap transition-all hover:-translate-y-0.5"
                onClick={() => void handleExportProductsTemplate()}
                disabled={isExportingProductsTemplate}
              >
                <FileSpreadsheet
                  className={`mr-2 h-4 w-4 ${isExportingProductsTemplate ? "animate-spin" : ""}`}
                />
                {isExportingProductsTemplate
                  ? "Descargando..."
                  : "Plantilla para Excel"}
              </Button>
            ) : null}
            {canManageCatalog ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="whitespace-nowrap transition-all hover:-translate-y-0.5"
                onClick={() => void handleExportProductsCsv()}
                disabled={isExportingProductsCsv}
              >
                <Download
                  className={`mr-2 h-4 w-4 ${isExportingProductsCsv ? "animate-spin" : ""}`}
                />
                {isExportingProductsCsv ? "Descargando..." : "Descargar lista"}
              </Button>
            ) : null}
            {canManageCatalog ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="whitespace-nowrap transition-all hover:-translate-y-0.5"
                onClick={() => csvFileInputRef.current?.click()}
                disabled={isImportingProductsCsv}
              >
                <Upload
                  className={`mr-2 h-4 w-4 ${isImportingProductsCsv ? "animate-spin" : ""}`}
                />
                {isImportingProductsCsv ? "Subiendo..." : "Subir lista"}
              </Button>
            ) : null}
            {canManageCatalog ? (
              <Button
                type="button"
                size="sm"
                className="whitespace-nowrap transition-all hover:-translate-y-0.5"
                onClick={() => void handleSeedProducts()}
                disabled={isSeedingProducts}
              >
                <Database
                  className={`mr-2 h-4 w-4 ${isSeedingProducts ? "animate-spin" : ""}`}
                />
                {isSeedingProducts ? "Cargando..." : "Cargar catálogo base"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {canManageCatalog ? (
        <div className="admin-section-card relative z-10 mt-4 px-4 py-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Acciones por lote
              </p>
              <p className="text-xs text-muted-foreground">
                Selecciona productos de la pagina actual para activar,
                desactivar o archivar con confirmacion.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 xl:justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => toggleVisibleSelection(true)}
                disabled={isLoading || products.length === 0}
              >
                <CheckCheck className="mr-2 h-4 w-4" />
                Seleccionar visibles
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={clearSelection}
                disabled={selectedCount === 0}
              >
                Limpiar seleccion
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => requestBulkAction("active")}
                disabled={selectedCount === 0 || isBulkUpdating}
              >
                Activar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => requestBulkAction("draft")}
                disabled={selectedCount === 0 || isBulkUpdating}
              >
                Desactivar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => requestBulkAction("archived")}
                disabled={selectedCount === 0 || isBulkUpdating}
              >
                <Archive className="mr-2 h-4 w-4" />
                Archivar
              </Button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">
              {selectedCount} seleccionados
            </Badge>
            <span>
              Las acciones masivas solo aplican a los productos visibles en esta
              pagina.
            </span>
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="admin-section-card relative z-10 mt-4 rounded-xl border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      {!errorMessage && infoMessage ? (
        <div className="admin-section-card relative z-10 mt-4 rounded-xl border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
          {infoMessage}
        </div>
      ) : null}

      <Collapsible
        open={isFiltersOpen}
        onOpenChange={setIsFiltersOpen}
        className="admin-form-card relative z-10 mt-5 overflow-hidden lg:sticky lg:top-28 lg:z-10 xl:top-24"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Filter className="h-4 w-4" />
              Filtros
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {activeFilterCount} filtros activos
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetFilters}
              disabled={activeFilterCount === 0 && filters.page === 1}
            >
              Restablecer
            </Button>
            <CollapsibleTrigger asChild>
              <Button variant="outline" type="button" size="sm">
                {isFiltersOpen ? "Ocultar filtros" : "Mostrar filtros"}
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent className="mt-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(0,0.68fr))]">
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Buscar por nombre o descripción"
              className="admin-input-surface"
            />

            <Select
              value={filters.category}
              onValueChange={(value) => setFilter({ category: value })}
            >
              <SelectTrigger className="admin-input-surface">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.status}
              onValueChange={(value) =>
                setFilter({
                  status: value as ProductFilters["status"],
                })
              }
            >
              <SelectTrigger className="admin-input-surface">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Solo activados</SelectItem>
                <SelectItem value="draft">Solo desactivados</SelectItem>
                <SelectItem value="archived">Solo archivados</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.inStock}
              onValueChange={(value) =>
                setFilter({
                  inStock: value as ProductFilters["inStock"],
                })
              }
            >
              <SelectTrigger className="admin-input-surface">
                <SelectValue placeholder="Disponibilidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las disponibilidades</SelectItem>
                <SelectItem value="true">Con stock comercial</SelectItem>
                <SelectItem value="false">Sin stock comercial</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={String(filters.limit)}
              onValueChange={(value) =>
                setFilter({
                  limit: Number(value),
                })
              }
            >
              <SelectTrigger className="admin-input-surface">
                <SelectValue placeholder="Por página" />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 30, 50].map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {value} por página
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="admin-table-shell relative z-10 mt-5 hidden xl:block">
        <div className="admin-table-scroll">
          <Table>
            <TableHeader>
              <TableRow className="admin-table-head-row">
                {canManageCatalog ? (
                  <TableHead className="admin-table-head-cell w-12">
                    <Checkbox
                      aria-label="Seleccionar productos visibles"
                      checked={
                        areAllVisibleSelected
                          ? true
                          : hasPartialSelection
                            ? "indeterminate"
                            : false
                      }
                      onCheckedChange={toggleVisibleSelection}
                    />
                  </TableHead>
                ) : null}
                <TableHead className="admin-table-head-cell">Producto</TableHead>
                <TableHead className="admin-table-head-cell">Categoría</TableHead>
                <TableHead className="admin-table-head-cell">Precio</TableHead>
                <TableHead className="admin-table-head-cell">
                  Piezas disponibles
                </TableHead>
                <TableHead className="admin-table-head-cell">Estado</TableHead>
                <TableHead className="admin-table-head-cell">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="admin-table-body-compact">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <TableRow key={`product-table-skeleton-${index}`}>
                    <TableCell colSpan={canManageCatalog ? 7 : 6}>
                      <div className="admin-skeleton-card h-12" />
                    </TableCell>
                  </TableRow>
                ))
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={canManageCatalog ? 7 : 6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    <div className="admin-empty-state">
                      <div className="rounded-full bg-primary/10 p-3 text-primary">
                        <Database className="h-5 w-5" />
                      </div>
                      <p className="font-medium text-foreground">
                        No hay productos para mostrar
                      </p>
                      <p className="text-xs">
                        Ajusta filtros o carga el catálogo base.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product, index) => {
                  const inventoryHealth = getInventoryHealth(product);
                  return (
                    <TableRow
                      key={product._id}
                      className={cn(
                        "transition-colors hover:bg-secondary/20 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500",
                        selectedProductIdSet.has(product._id) &&
                          "bg-primary/5 ring-1 ring-primary/10",
                      )}
                      style={{ animationDelay: `${index * 35}ms` }}
                    >
                      {canManageCatalog ? (
                        <TableCell>
                          <Checkbox
                            aria-label={`Seleccionar ${product.name}`}
                            checked={selectedProductIdSet.has(product._id)}
                            onCheckedChange={(checked) =>
                              toggleProductSelection(product._id, checked)
                            }
                          />
                        </TableCell>
                      ) : null}
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{product.name}</span>
                          <span className="mt-1 text-xs text-muted-foreground">
                            {product.presentation ?? "-"}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        {categoryLabelById[product.category] ?? product.category}
                      </TableCell>

                      <TableCell className="text-sm font-medium text-foreground">
                        {formatPrice(product.price, product.currency)}
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {hasTrackedInventory(product)
                              ? `${getAvailableUnits(product)} piezas`
                              : "Sin carga"}
                          </span>
                          <span className="mt-1 text-xs text-muted-foreground">
                            {hasTrackedInventory(product)
                              ? `${getReservedUnits(product)} reservadas`
                              : "Se inicializa en inventario"}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-full",
                              product.status === "active" &&
                                "border-emerald-200 bg-emerald-50 text-emerald-700",
                              product.status === "draft" &&
                                "border-amber-200 bg-amber-50 text-amber-700",
                              product.status === "archived" &&
                                "border-slate-200 bg-slate-100 text-slate-700",
                            )}
                          >
                            {PRODUCT_STATUS_LABELS[product.status]}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn("rounded-full", inventoryHealth.className)}
                          >
                            {inventoryHealth.label}
                          </Badge>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            type="button"
                            variant="outline"
                            className="transition-all hover:-translate-y-0.5"
                            onClick={() => openEditDialog(product._id)}
                          >
                            <PencilLine className="mr-1 h-4 w-4" />
                            Editar
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <Link
                              href={`/admin/catalogo/inventario?producto=${product._id}`}
                            >
                              <PackageCheck className="mr-1 h-4 w-4" />
                              Inventario
                            </Link>
                          </Button>
                          <Button variant="link" size="sm" asChild>
                            <Link href={`/productos/${product.slug}`} target="_blank">
                              <Eye className="mr-1 h-4 w-4" />
                              Ver
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="relative z-10 mt-4 grid gap-3 xl:hidden">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div
              key={`product-card-skeleton-${index}`}
              className="admin-skeleton-card"
            >
              <div className="h-5 w-48 rounded bg-secondary/60" />
              <div className="mt-2 h-4 w-32 rounded bg-secondary/50" />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="h-10 rounded bg-secondary/60" />
                <div className="h-10 rounded bg-secondary/60" />
                <div className="h-10 rounded bg-secondary/60" />
              </div>
            </div>
          ))
        ) : products.length === 0 ? (
          <div className="admin-empty-state">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <Database className="h-5 w-5" />
            </div>
            <p className="font-medium text-foreground">
              No hay productos para mostrar
            </p>
            <p className="text-xs text-muted-foreground">
              Ajusta filtros o carga el catálogo base.
            </p>
          </div>
        ) : (
          products.map((product, index) => {
            const inventoryHealth = getInventoryHealth(product);

            return (
              <div
                key={product._id}
                className={cn(
                  "admin-section-card p-4 transition-colors hover:bg-secondary/10 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500",
                  selectedProductIdSet.has(product._id) &&
                    "bg-primary/5 ring-1 ring-primary/10",
                )}
                style={{ animationDelay: `${index * 35}ms` }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{product.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {product.presentation ?? "-"}
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    {canManageCatalog ? (
                      <Checkbox
                        aria-label={`Seleccionar ${product.name}`}
                        checked={selectedProductIdSet.has(product._id)}
                        onCheckedChange={(checked) =>
                          toggleProductSelection(product._id, checked)
                        }
                      />
                    ) : null}
                    <div className="flex flex-wrap justify-end gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full",
                        product.status === "active" &&
                          "border-emerald-200 bg-emerald-50 text-emerald-700",
                        product.status === "draft" &&
                          "border-amber-200 bg-amber-50 text-amber-700",
                        product.status === "archived" &&
                          "border-slate-200 bg-slate-100 text-slate-700",
                      )}
                    >
                      {PRODUCT_STATUS_LABELS[product.status]}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn("rounded-full", inventoryHealth.className)}
                    >
                      {inventoryHealth.label}
                    </Badge>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Categoría</p>
                    <p className="text-sm font-medium text-foreground">
                      {categoryLabelById[product.category] ?? product.category}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Precio</p>
                    <p className="text-sm font-medium text-foreground">
                      {formatPrice(product.price, product.currency)}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Piezas disponibles
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {hasTrackedInventory(product)
                        ? `${getAvailableUnits(product)} libres`
                        : "Sin carga"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Reservadas</p>
                    <p className="text-sm font-medium text-foreground">
                      {hasTrackedInventory(product)
                        ? getReservedUnits(product)
                        : "Sin carga"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    type="button"
                    variant="outline"
                    className="transition-all hover:-translate-y-0.5"
                    onClick={() => openEditDialog(product._id)}
                  >
                    <PencilLine className="mr-1 h-4 w-4" />
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={`/admin/catalogo/inventario?producto=${product._id}`}
                    >
                      <PackageCheck className="mr-1 h-4 w-4" />
                      Inventario
                    </Link>
                  </Button>
                  <Button variant="link" size="sm" asChild className="px-0">
                    <Link href={`/productos/${product.slug}`} target="_blank">
                      <Eye className="mr-1 h-4 w-4" />
                      Ver
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={filters.page <= 1 || isLoading}
          onClick={() => setFilter({ page: filters.page - 1 }, false)}
        >
          Anterior
        </Button>
        <span className="px-2 text-sm text-muted-foreground">
          Página {meta.page} de {meta.totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={filters.page >= meta.totalPages || isLoading}
          onClick={() => setFilter({ page: filters.page + 1 }, false)}
        >
          Siguiente
        </Button>
      </div>

      <AdminProductEditDialog
        product={editingProduct}
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setEditingProductId(null);
          }
        }}
        categories={productCategoryOptions}
        categoryLabelById={categoryLabelById}
        canManageCatalog={canManageCatalog}
        onProductSaved={handleProductSaved}
      />

      <AlertDialog
        open={pendingBulkAction !== null}
        onOpenChange={(open) => {
          if (!open && !isBulkUpdating) {
            setPendingBulkAction(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingBulkCopy?.title ?? "Confirmar accion"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingBulkCopy?.description ??
                "Se aplicara el cambio seleccionado a la seleccion actual."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-lg border border-border/70 bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
            {selectedCount} productos seleccionados en esta pagina.
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkUpdating}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleBulkStatusUpdate();
              }}
              disabled={isBulkUpdating}
            >
              {isBulkUpdating
                ? "Aplicando..."
                : pendingBulkCopy?.actionLabel ?? "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
