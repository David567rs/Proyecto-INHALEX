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
  ChevronDown,
  Database,
  Download,
  FileSpreadsheet,
  Filter,
  RefreshCw,
  Save,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { PRODUCT_CATEGORIES } from "@/lib/products/categories";
import { getAccessToken } from "@/lib/auth/token-storage";
import {
  exportAdminProductsCsv,
  exportAdminProductsTemplateCsv,
  importAdminProductsCsv,
  listAdminProductCategories,
  listAdminProducts,
  seedAdminProducts,
  updateAdminProduct,
  type AdminProductCategory,
  type AdminProduct,
} from "@/lib/admin/admin-api";
import type { ProductCategoryOption } from "@/lib/products/categories";
import { useAuth } from "@/components/auth/auth-provider";
import { cn } from "@/lib/utils";

interface ProductDraft {
  category: string;
  price: string;
  status: AdminProduct["status"];
  inStock: "true" | "false";
  sortOrder: string;
}

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

const INITIAL_PRODUCT_FILTERS: ProductFilters = {
  search: "",
  category: "all",
  status: "all",
  inStock: "all",
  page: 1,
  limit: 10,
};

function formatDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatPrice(value: number, currency: string): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency || "MXN",
  }).format(value);
}

const PRODUCT_STATUS_LABELS: Record<AdminProduct["status"], string> = {
  draft: "Desactivado",
  active: "Activado",
  archived: "Archivado",
};

function statusLabel(status: AdminProduct["status"]): string {
  return PRODUCT_STATUS_LABELS[status];
}

function stockLabel(inStock: "true" | "false"): string {
  return inStock === "true" ? "Disponible" : "Agotado";
}

function isInventoryManaged(product: AdminProduct): boolean {
  return typeof product.stockAvailable === "number";
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
    { id: "all", name: "Todas" },
    ...categories.map((category) => ({
      id: category.slug,
      name: category.name,
    })),
  ];
}

function buildProductDraft(product: AdminProduct): ProductDraft {
  return {
    category: product.category,
    price: String(product.price),
    status: product.status,
    inStock: product.inStock ? "true" : "false",
    sortOrder: product.sortOrder !== undefined ? String(product.sortOrder) : "",
  };
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

export function AdminProductsSection() {
  const { user } = useAuth();
  const csvFileInputRef = useRef<HTMLInputElement | null>(null);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categoryOptions, setCategoryOptions] =
    useState<ProductCategoryOption[]>(PRODUCT_CATEGORIES);
  const [productDraftsById, setProductDraftsById] = useState<
    Record<string, ProductDraft>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSeedingProducts, setIsSeedingProducts] = useState(false);
  const [seedProductsMessage, setSeedProductsMessage] = useState("");
  const [isExportingProductsCsv, setIsExportingProductsCsv] = useState(false);
  const [isExportingProductsTemplate, setIsExportingProductsTemplate] =
    useState(false);
  const [isImportingProductsCsv, setIsImportingProductsCsv] = useState(false);
  const [csvMessage, setCsvMessage] = useState("");
  const [savingProductById, setSavingProductById] = useState<
    Record<string, boolean>
  >({});
  const [rowMessageById, setRowMessageById] = useState<Record<string, string>>(
    {},
  );
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
  const canManageCatalog = user?.role === "admin";

  const totalActiveProductsInPage = useMemo(
    () => products.filter((product) => product.status === "active").length,
    [products],
  );
  const totalDraftProductsInPage = useMemo(
    () => products.filter((product) => product.status === "draft").length,
    [products],
  );
  const totalOutOfStockProductsInPage = useMemo(
    () => products.filter((product) => !product.inStock).length,
    [products],
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
      setErrorMessage("No se encontro token de acceso");
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
      setProductDraftsById(
        response.items.reduce<Record<string, ProductDraft>>((acc, product) => {
          acc[product._id] = buildProductDraft(product);
          return acc;
        }, {}),
      );
      setRowMessageById({});
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los productos";
      setErrorMessage(message);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

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
      setCsvMessage("No se encontro token");
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
      setCsvMessage("Lista de productos descargada correctamente.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo descargar la lista de productos";
      setCsvMessage(message);
    } finally {
      setIsExportingProductsCsv(false);
    }
  };

  const handleExportProductsTemplate = async () => {
    const token = getAccessToken();
    if (!token) {
      setCsvMessage("No se encontro token");
      return;
    }

    setIsExportingProductsTemplate(true);
    setCsvMessage("");

    try {
      const exported = await exportAdminProductsTemplateCsv(token);
      triggerBlobDownload(exported.blob, exported.fileName);
      setCsvMessage(
        "Plantilla descargada. Puedes abrirla en Excel y editar varios productos a la vez.",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo descargar la plantilla";
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
      `Vas a subir "${file.name}". Esto puede actualizar productos existentes. Revisa que el archivo sea el correcto antes de continuar.`,
    );

    if (!accepted) {
      event.target.value = "";
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setCsvMessage("No se encontro token");
      event.target.value = "";
      return;
    }

    setIsImportingProductsCsv(true);
    setCsvMessage("");

    try {
      const fileContent = await file.text();
      const rows = parseCsvObjects(fileContent);

      if (rows.length === 0) {
        setCsvMessage("El archivo no tiene productos validos para importar.");
        return;
      }

      const result = await importAdminProductsCsv(rows, token);
      const firstError = result.errors[0];
      const errorHint = firstError
        ? ` Primer error: renglon ${firstError.row} (${firstError.idOrSlug}) - ${firstError.message}.`
        : "";
      setCsvMessage(
        `Carga completada. Actualizados: ${result.updated}, omitidos: ${result.skipped}, con error: ${result.failed}.${errorHint}`,
      );
      await loadProducts();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo subir la lista de productos";
      setCsvMessage(message);
    } finally {
      setIsImportingProductsCsv(false);
      event.target.value = "";
    }
  };

  const updateProductDraft = (
    productId: string,
    draft: Partial<ProductDraft>,
  ) => {
    setProductDraftsById((prev) => {
      const previous = prev[productId];
      if (!previous) return prev;
      return {
        ...prev,
        [productId]: {
          ...previous,
          ...draft,
        },
      };
    });

    setRowMessageById((prev) => ({
      ...prev,
      [productId]: "",
    }));
  };

  const hasChanges = (product: AdminProduct): boolean => {
    const draft = productDraftsById[product._id];
    if (!draft) return false;

    const draftPrice = Number(draft.price);
    const draftInStock = draft.inStock === "true";
    const draftSortOrder =
      draft.sortOrder.trim() === ""
        ? product.sortOrder
        : Number(draft.sortOrder);

    if (draft.category !== product.category) return true;
    if (!Number.isNaN(draftPrice) && draftPrice !== product.price) return true;
    if (draft.status !== product.status) return true;
    if (!isInventoryManaged(product) && draftInStock !== product.inStock)
      return true;
    if (draftSortOrder !== product.sortOrder) return true;
    return false;
  };

  const pendingChangesCount = useMemo(
    () => products.filter((product) => hasChanges(product)).length,
    [productDraftsById, products],
  );

  const saveProduct = async (product: AdminProduct) => {
    const token = getAccessToken();
    if (!token) {
      setRowMessageById((prev) => ({
        ...prev,
        [product._id]: "No se encontro token",
      }));
      return;
    }

    const draft = productDraftsById[product._id];
    if (!draft) return;

    const payload: {
      category?: string;
      price?: number;
      status?: AdminProduct["status"];
      inStock?: boolean;
      sortOrder?: number;
    } = {};

    if (draft.category.trim() === "") {
      setRowMessageById((prev) => ({
        ...prev,
        [product._id]: "Categoria invalida",
      }));
      return;
    }

    if (draft.category !== product.category) payload.category = draft.category;

    if (draft.price.trim() === "") {
      setRowMessageById((prev) => ({
        ...prev,
        [product._id]: "Precio invalido",
      }));
      return;
    }

    const parsedPrice = Number(draft.price);
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setRowMessageById((prev) => ({
        ...prev,
        [product._id]: "Precio invalido",
      }));
      return;
    }

    if (parsedPrice !== product.price) payload.price = parsedPrice;
    if (draft.status !== product.status) payload.status = draft.status;

    const draftInStock = draft.inStock === "true";
    if (!isInventoryManaged(product) && draftInStock !== product.inStock) {
      payload.inStock = draftInStock;
    }

    if (draft.sortOrder.trim() !== "") {
      const parsedSortOrder = Number(draft.sortOrder);
      if (Number.isNaN(parsedSortOrder) || parsedSortOrder < 1) {
        setRowMessageById((prev) => ({
          ...prev,
          [product._id]: "Orden invalido",
        }));
        return;
      }
      if (parsedSortOrder !== product.sortOrder)
        payload.sortOrder = parsedSortOrder;
    }

    if (Object.keys(payload).length === 0) {
      setRowMessageById((prev) => ({
        ...prev,
        [product._id]: "No hay cambios",
      }));
      return;
    }

    if (payload.status === "archived") {
      const accepted = window.confirm(
        `Vas a archivar "${product.name}". No se mostrara como producto activo en el catalogo. Deseas continuar?`,
      );

      if (!accepted) return;
    }

    if (payload.status === "draft") {
      const accepted = window.confirm(
        `Vas a desactivar "${product.name}". El producto dejara de mostrarse como activado. Deseas continuar?`,
      );

      if (!accepted) return;
    }

    setSavingProductById((prev) => ({
      ...prev,
      [product._id]: true,
    }));

    try {
      const updatedProduct = await updateAdminProduct(
        product._id,
        payload,
        token,
      );

      setProducts((prev) =>
        prev.map((currentProduct) =>
          currentProduct._id === updatedProduct._id
            ? updatedProduct
            : currentProduct,
        ),
      );

      setProductDraftsById((prev) => ({
        ...prev,
        [product._id]: buildProductDraft(updatedProduct),
      }));

      setRowMessageById((prev) => ({
        ...prev,
        [product._id]: "Guardado",
      }));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el producto";
      setRowMessageById((prev) => ({
        ...prev,
        [product._id]: message,
      }));
    } finally {
      setSavingProductById((prev) => ({
        ...prev,
        [product._id]: false,
      }));
    }
  };

  const handleSeedProducts = async () => {
    const token = getAccessToken();
    if (!token) {
      setSeedProductsMessage("No se encontro token");
      return;
    }

    const accepted = window.confirm(
      "Vas a cargar el catalogo base. Esto puede crear productos faltantes y actualizar los productos base existentes. Los productos sin stock definido quedaran en 0. Deseas continuar?",
    );

    if (!accepted) return;

    setIsSeedingProducts(true);
    setSeedProductsMessage("");

    try {
      const response = await seedAdminProducts(token);
      setSeedProductsMessage(
        `Catalogo base cargado. Nuevos: ${response.created}, actualizados: ${response.updated}.`,
      );
      await loadProducts();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo cargar el catalogo base";
      setSeedProductsMessage(message);
    } finally {
      setIsSeedingProducts(false);
    }
  };

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
            Activados en pagina
          </p>
          <p className="mt-2 text-xl font-semibold tracking-tight text-foreground">
            {totalActiveProductsInPage}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {totalDraftProductsInPage} desactivados,{" "}
            {totalOutOfStockProductsInPage} sin stock.
          </p>
        </div>
        <div className="admin-metric-card">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Cambios pendientes
          </p>
          <p className="mt-2 text-xl font-semibold tracking-tight text-foreground">
            {pendingChangesCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cambios sin guardar.
          </p>
        </div>
        <div className="admin-metric-card">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Pagina
          </p>
          <p className="mt-2 text-xl font-semibold tracking-tight text-foreground">
            {meta.page} / {meta.totalPages}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {filters.limit} por pagina.
          </p>
        </div>
      </div>

      <div className="admin-toolbar-surface relative z-20 mt-4 px-4 py-4 lg:sticky lg:top-0">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              Acciones del catalogo
            </span>
            <span className="text-xs">
              {pendingChangesCount === 0
                ? "Sin cambios pendientes"
                : `${pendingChangesCount} cambios pendientes`}
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
            {canManageCatalog && (
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
            )}
            {canManageCatalog && (
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
            )}
            {canManageCatalog && (
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
            )}
            {canManageCatalog && (
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
                {isSeedingProducts ? "Cargando..." : "Cargar catalogo base"}
              </Button>
            )}
          </div>
        </div>
      </div>

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
                <ChevronDown
                  className={cn(
                    "ml-2 h-4 w-4 transition-transform",
                    isFiltersOpen && "rotate-180",
                  )}
                />
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent className="data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2">
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-[1.5fr_repeat(4,minmax(0,1fr))]">
            <Input
              className="admin-input-surface"
              placeholder="Buscar por nombre o descripcion"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />

            <Select
              value={filters.category}
              onValueChange={(value) => setFilter({ category: value })}
            >
              <SelectTrigger className="admin-input-surface">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorias</SelectItem>
                {productCategoryOptions.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.status}
              onValueChange={(value) =>
                setFilter({ status: value as ProductFilters["status"] })
              }
            >
              <SelectTrigger className="admin-input-surface">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="draft">{statusLabel("draft")}</SelectItem>
                <SelectItem value="active">{statusLabel("active")}</SelectItem>
                <SelectItem value="archived">
                  {statusLabel("archived")}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.inStock}
              onValueChange={(value) =>
                setFilter({ inStock: value as ProductFilters["inStock"] })
              }
            >
              <SelectTrigger className="admin-input-surface">
                <SelectValue placeholder="Disponibilidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Cualquier disponibilidad</SelectItem>
                <SelectItem value="true">{stockLabel("true")}</SelectItem>
                <SelectItem value="false">{stockLabel("false")}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={String(filters.limit)}
              onValueChange={(value) => setFilter({ limit: Number(value) })}
            >
              <SelectTrigger className="admin-input-surface">
                <SelectValue placeholder="Registros" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 por pagina</SelectItem>
                <SelectItem value="20">20 por pagina</SelectItem>
                <SelectItem value="50">50 por pagina</SelectItem>
                <SelectItem value="100">100 por pagina</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {errorMessage && (
        <div className="relative z-10 mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <p className="inline-flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </p>
        </div>
      )}

      {seedProductsMessage && (
        <div className="admin-section-card relative z-10 mt-4 rounded-xl bg-secondary/30 px-4 py-3 text-sm text-foreground">
          <p className="inline-flex items-start gap-2">
            <Database className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{seedProductsMessage}</span>
          </p>
        </div>
      )}

      {csvMessage && (
        <div className="admin-section-card relative z-10 mt-4 rounded-xl bg-secondary/30 px-4 py-3 text-sm text-foreground">
          <p className="inline-flex items-start gap-2">
            <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{csvMessage}</span>
          </p>
        </div>
      )}

      <div className="admin-table-shell relative z-10 mt-5 hidden 2xl:block">
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
                <TableHead className="admin-table-head-cell">Precio</TableHead>
                <TableHead className="admin-table-head-cell">Estado</TableHead>
                <TableHead className="admin-table-head-cell">
                  Disponibilidad
                </TableHead>
                <TableHead className="admin-table-head-cell">Orden</TableHead>
                <TableHead className="admin-table-head-cell">
                  Actualizado
                </TableHead>
                <TableHead className="admin-table-head-cell">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="admin-table-body-compact">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow
                    key={`product-skeleton-${index}`}
                    className="animate-pulse bg-background/40"
                  >
                    <TableCell>
                      <div className="space-y-2">
                        <div className="h-4 w-36 rounded bg-secondary/60" />
                        <div className="h-3 w-24 rounded bg-secondary/50" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 w-28 rounded bg-secondary/60" />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <div className="h-9 w-28 rounded-md bg-secondary/60" />
                        <div className="h-3 w-20 rounded bg-secondary/50" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="h-9 w-32 rounded-md bg-secondary/60" />
                    </TableCell>
                    <TableCell>
                      <div className="h-9 w-32 rounded-md bg-secondary/60" />
                    </TableCell>
                    <TableCell>
                      <div className="h-9 w-20 rounded-md bg-secondary/60" />
                    </TableCell>
                    <TableCell>
                      <div className="h-4 w-40 rounded bg-secondary/60" />
                    </TableCell>
                    <TableCell>
                      <div className="h-9 w-32 rounded-md bg-secondary/60" />
                    </TableCell>
                  </TableRow>
                ))
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
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
                        Ajusta filtros o carga el catalogo base.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product, index) => {
                  const draft = productDraftsById[product._id];
                  const isSaving = Boolean(savingProductById[product._id]);
                  const rowMessage = rowMessageById[product._id];
                  const hasPendingChanges = hasChanges(product);
                  const selectedCategory = draft?.category ?? product.category;
                  const selectedCategoryExists = productCategoryOptions.some(
                    (category) => category.id === selectedCategory,
                  );

                  return (
                    <TableRow
                      key={product._id}
                      className={cn(
                        "transition-colors hover:bg-secondary/20 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500",
                        hasPendingChanges && "bg-primary/[0.035]",
                      )}
                      style={{ animationDelay: `${index * 35}ms` }}
                    >
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{product.name}</span>
                          {hasPendingChanges && (
                            <span className="mt-1 inline-flex w-fit rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                              Cambio pendiente
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={selectedCategory}
                          onValueChange={(value) =>
                            updateProductDraft(product._id, { category: value })
                          }
                          disabled={isSaving || !canManageCatalog}
                        >
                          <SelectTrigger className="admin-input-surface min-w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {!selectedCategoryExists && (
                              <SelectItem value={selectedCategory}>
                                {categoryLabelById[selectedCategory] ??
                                  selectedCategory}
                              </SelectItem>
                            )}
                            {productCategoryOptions.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          className="admin-input-surface w-24"
                          value={draft?.price ?? String(product.price)}
                          disabled={isSaving || !canManageCatalog}
                          onChange={(event) =>
                            updateProductDraft(product._id, {
                              price: event.target.value,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={draft?.status ?? product.status}
                          onValueChange={(value) =>
                            updateProductDraft(product._id, {
                              status: value as AdminProduct["status"],
                            })
                          }
                          disabled={isSaving || !canManageCatalog}
                        >
                          <SelectTrigger className="admin-input-surface w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">
                              {statusLabel("draft")}
                            </SelectItem>
                            <SelectItem value="active">
                              {statusLabel("active")}
                            </SelectItem>
                            <SelectItem value="archived">
                              {statusLabel("archived")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {isInventoryManaged(product) ? (
                          <div className="rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-xs text-primary">
                            Se gestiona en inventario
                          </div>
                        ) : (
                          <Select
                            value={
                              draft?.inStock ??
                              (product.inStock ? "true" : "false")
                            }
                            onValueChange={(value) =>
                              updateProductDraft(product._id, {
                                inStock: value as "true" | "false",
                              })
                            }
                            disabled={isSaving || !canManageCatalog}
                          >
                            <SelectTrigger className="admin-input-surface w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">
                                {stockLabel("true")}
                              </SelectItem>
                              <SelectItem value="false">
                                {stockLabel("false")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          className="admin-input-surface w-20"
                          value={draft?.sortOrder ?? ""}
                          disabled={isSaving || !canManageCatalog}
                          onChange={(event) =>
                            updateProductDraft(product._id, {
                              sortOrder: event.target.value,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>{formatDate(product.updatedAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            type="button"
                            className="transition-all hover:-translate-y-0.5"
                            onClick={() => void saveProduct(product)}
                            disabled={
                              !canManageCatalog ||
                              !hasChanges(product) ||
                              isSaving
                            }
                          >
                            <Save className="mr-1 h-4 w-4" />
                            {isSaving ? "Guardando..." : "Guardar"}
                          </Button>
                          <Button variant="link" size="sm" asChild>
                            <Link href={`/productos/${product.slug}`}>Ver</Link>
                          </Button>
                          {rowMessage && (
                            <span className="text-xs text-muted-foreground">
                              {rowMessage}
                            </span>
                          )}
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

      <div className="relative z-10 mt-4 grid gap-3 2xl:hidden">
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
              Ajusta filtros o carga el catalogo base.
            </p>
          </div>
        ) : (
          products.map((product, index) => {
            const draft = productDraftsById[product._id];
            const isSaving = Boolean(savingProductById[product._id]);
            const rowMessage = rowMessageById[product._id];
            const selectedCategory = draft?.category ?? product.category;
            const selectedCategoryExists = productCategoryOptions.some(
              (category) => category.id === selectedCategory,
            );
            const currentStatus = draft?.status ?? product.status;
            const currentStock =
              draft?.inStock ?? (product.inStock ? "true" : "false");

            return (
              <div
                key={product._id}
                className={cn(
                  "admin-section-card p-4 transition-colors hover:bg-secondary/10 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500",
                  hasChanges(product) && "bg-primary/[0.035]",
                )}
                style={{ animationDelay: `${index * 35}ms` }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">
                      {product.name}
                    </p>
                    {hasChanges(product) && (
                      <span className="mt-2 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        Cambio pendiente
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Actualizado: {formatDate(product.updatedAt)}
                  </p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Categoria</p>
                    <Select
                      value={selectedCategory}
                      onValueChange={(value) =>
                        updateProductDraft(product._id, { category: value })
                      }
                      disabled={isSaving || !canManageCatalog}
                    >
                      <SelectTrigger className="admin-input-surface">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {!selectedCategoryExists && (
                          <SelectItem value={selectedCategory}>
                            {categoryLabelById[selectedCategory] ??
                              selectedCategory}
                          </SelectItem>
                        )}
                        {productCategoryOptions.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Precio</p>
                    <Input
                      className="admin-input-surface"
                      type="number"
                      min={0}
                      step="0.01"
                      value={draft?.price ?? String(product.price)}
                      disabled={isSaving || !canManageCatalog}
                      onChange={(event) =>
                        updateProductDraft(product._id, {
                          price: event.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Estado</p>
                    <Select
                      value={currentStatus}
                      onValueChange={(value) =>
                        updateProductDraft(product._id, {
                          status: value as AdminProduct["status"],
                        })
                      }
                      disabled={isSaving || !canManageCatalog}
                    >
                      <SelectTrigger className="admin-input-surface">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">
                          {statusLabel("draft")}
                        </SelectItem>
                        <SelectItem value="active">
                          {statusLabel("active")}
                        </SelectItem>
                        <SelectItem value="archived">
                          {statusLabel("archived")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Disponibilidad
                    </p>
                    {isInventoryManaged(product) ? (
                      <div className="admin-input-surface flex min-h-10 items-center rounded-md px-3 text-sm text-primary">
                        Se gestiona en inventario
                      </div>
                    ) : (
                      <Select
                        value={currentStock}
                        onValueChange={(value) =>
                          updateProductDraft(product._id, {
                            inStock: value as "true" | "false",
                          })
                        }
                        disabled={isSaving || !canManageCatalog}
                      >
                        <SelectTrigger className="admin-input-surface">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">
                            {stockLabel("true")}
                          </SelectItem>
                          <SelectItem value="false">
                            {stockLabel("false")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="space-y-1 sm:max-w-[160px]">
                    <p className="text-xs text-muted-foreground">Orden</p>
                    <Input
                      className="admin-input-surface"
                      type="number"
                      min={1}
                      value={draft?.sortOrder ?? ""}
                      disabled={isSaving || !canManageCatalog}
                      onChange={(event) =>
                        updateProductDraft(product._id, {
                          sortOrder: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    type="button"
                    className="transition-all hover:-translate-y-0.5"
                    onClick={() => void saveProduct(product)}
                    disabled={
                      !canManageCatalog || !hasChanges(product) || isSaving
                    }
                  >
                    <Save className="mr-1 h-4 w-4" />
                    {isSaving ? "Guardando..." : "Guardar"}
                  </Button>
                  <Button variant="link" size="sm" asChild className="px-0">
                    <Link href={`/productos/${product.slug}`}>Ver</Link>
                  </Button>
                  {rowMessage && (
                    <span className="text-xs text-muted-foreground">
                      {rowMessage}
                    </span>
                  )}
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
        <span className="text-sm text-muted-foreground px-2">
          Pagina {meta.page} de {meta.totalPages}
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
    </div>
  );
}
