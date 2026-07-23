"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  BadgePercent,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Filter,
  Leaf,
  RefreshCcw,
  Search,
  SearchX,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { CatalogProductCard } from "@/components/products/catalog-product-card"
import { useCatalog } from "@/components/products/catalog-provider"
import { useCart } from "@/components/cart/cart-provider"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getProductDisplayPrice,
  hasActiveProductOffer,
} from "@/lib/products/promotions"
import { cn } from "@/lib/utils"
import type { Product } from "@/lib/types/product"

const PRODUCTS_PER_PAGE = 6

type AvailabilityFilter = "all" | "available" | "offers"
type SortOption =
  | "recommended"
  | "name"
  | "rating"
  | "price-asc"
  | "price-desc"

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

function matchesSearch(product: Product, query: string): boolean {
  const tokens = normalize(query).split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return true

  const haystack = normalize(
    [
      product.name,
      product.description,
      product.longDescription ?? "",
      product.category,
      product.presentation,
      product.origin,
      ...(product.aromas ?? []),
      ...product.benefits,
    ].join(" "),
  )

  return tokens.every((token) => haystack.includes(token))
}

function CatalogSkeleton() {
  return (
    <div
      className="grid gap-7 md:grid-cols-2 xl:grid-cols-3"
      aria-label="Cargando productos"
    >
      {Array.from({ length: PRODUCTS_PER_PAGE }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-[2rem] border border-border/55 bg-white/90 p-4 shadow-[0_22px_66px_-48px_rgba(15,23,42,0.2)]"
        >
          <div className="aspect-square animate-pulse rounded-[1.6rem] bg-gradient-to-br from-emerald-50 via-stone-100 to-emerald-100/60 motion-reduce:animate-none" />
          <div className="space-y-3 px-2 pb-2 pt-5">
            <div className="h-7 w-2/5 animate-pulse rounded-full bg-stone-200 motion-reduce:animate-none" />
            <div className="h-4 w-3/5 animate-pulse rounded-full bg-stone-100 motion-reduce:animate-none" />
            <div className="h-20 animate-pulse rounded-2xl bg-stone-100 motion-reduce:animate-none" />
          </div>
        </div>
      ))}
    </div>
  )
}

interface ProductsCatalogPageProps {
  initialSearchQuery?: string
}

export function ProductsCatalogPage({
  initialSearchQuery = "",
}: ProductsCatalogPageProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery)
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [availability, setAvailability] =
    useState<AvailabilityFilter>("all")
  const [sortBy, setSortBy] = useState<SortOption>("recommended")
  const [currentPage, setCurrentPage] = useState(1)
  const catalogRef = useRef<HTMLElement>(null)
  const { addItem } = useCart()
  const {
    products,
    categories,
    isLoading,
    errorMessage,
    ensureLoaded,
    reloadCatalog,
  } = useCatalog()

  useEffect(() => {
    void ensureLoaded()
  }, [ensureLoaded])

  useEffect(() => {
    setSearchQuery(initialSearchQuery)
    if (initialSearchQuery.trim()) {
      setSelectedCategory("all")
      setAvailability("all")
    }
  }, [initialSearchQuery])

  const filteredProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      const matchesCategory =
        selectedCategory === "all" || product.category === selectedCategory
      const matchesAvailability =
        availability === "all" ||
        (availability === "available" &&
          (product.inStock || product.allowBackorder)) ||
        (availability === "offers" && hasActiveProductOffer(product))

      return (
        matchesCategory &&
        matchesAvailability &&
        matchesSearch(product, searchQuery)
      )
    })

    return filtered.sort((left, right) => {
      switch (sortBy) {
        case "name":
          return left.name.localeCompare(right.name, "es")
        case "rating":
          return (right.rating ?? 0) - (left.rating ?? 0)
        case "price-asc":
          return getProductDisplayPrice(left) - getProductDisplayPrice(right)
        case "price-desc":
          return getProductDisplayPrice(right) - getProductDisplayPrice(left)
        default:
          return (
            (left.sortOrder ?? Number.MAX_SAFE_INTEGER) -
              (right.sortOrder ?? Number.MAX_SAFE_INTEGER) ||
            left.name.localeCompare(right.name, "es")
          )
      }
    })
  }, [availability, products, searchQuery, selectedCategory, sortBy])

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE),
  )
  const pageProducts = filteredProducts.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE,
  )
  const availableCount = products.filter(
    (product) => product.inStock || product.allowBackorder,
  ).length
  const categoryCount = categories.filter(
    (category) => category.id !== "all",
  ).length
  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedCategory !== "all" ||
    availability !== "all"

  useEffect(() => {
    setCurrentPage(1)
  }, [availability, searchQuery, selectedCategory, sortBy])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const scrollToCatalog = useCallback(() => {
    catalogRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    })
  }, [])

  useEffect(() => {
    if (!initialSearchQuery.trim()) return

    const timeoutId = window.setTimeout(scrollToCatalog, 120)
    return () => window.clearTimeout(timeoutId)
  }, [initialSearchQuery, scrollToCatalog])

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages))
    window.requestAnimationFrame(scrollToCatalog)
  }

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedCategory("all")
    setAvailability("all")
    setSortBy("recommended")
    if (initialSearchQuery.trim()) {
      router.replace("/productos", { scroll: false })
    }
  }

  const clearGlobalSearch = () => {
    setSearchQuery("")
    router.replace("/productos", { scroll: false })
  }

  const resultStart =
    filteredProducts.length === 0
      ? 0
      : (currentPage - 1) * PRODUCTS_PER_PAGE + 1
  const resultEnd = Math.min(
    currentPage * PRODUCTS_PER_PAGE,
    filteredProducts.length,
  )

  return (
    <div className="min-h-screen bg-[#fbfcfa]">
      <Header />

      <main className="overflow-hidden pt-24 lg:pt-28">
        <section className="relative border-b border-emerald-100/70 px-4 pb-14 pt-10 lg:pb-20 lg:pt-16">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-24 top-4 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl" />
            <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-amber-100/50 blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_14%,rgba(255,255,255,0.9),transparent_31%),linear-gradient(135deg,rgba(239,248,242,0.88),rgba(255,252,246,0.7)_52%,rgba(242,248,244,0.9))]" />
          </div>

          <div className="container relative mx-auto grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="page-fade-up max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-white/80 px-4 py-2 text-sm font-semibold text-primary shadow-sm backdrop-blur-sm">
                <Leaf className="h-4 w-4" />
                Catálogo completo INHALEX
              </span>
              <h1 className="public-display-heading mt-6 max-w-3xl text-4xl leading-[1.06] text-foreground sm:text-5xl lg:text-6xl">
                Encuentra el aroma que acompaña tu momento
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                Explora nuestros inhaladores aromáticos por línea, compara sus perfiles
                y descubre la opción que mejor se adapta a tu rutina.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  size="lg"
                  className="h-12 rounded-full px-6 shadow-[0_18px_36px_-22px_rgba(16,112,58,0.5)]"
                  onClick={scrollToCatalog}
                >
                  Explorar aromas
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-full border-primary/15 bg-white/76 px-6 backdrop-blur-sm"
                >
                  <a href="#como-elegir">Cómo elegir</a>
                </Button>
              </div>
            </div>

            <div className="page-fade-up page-fade-up-delay-1 grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {[
                {
                  icon: Boxes,
                  value: isLoading ? "—" : products.length,
                  label: "Aromas en catálogo",
                },
                {
                  icon: Leaf,
                  value: isLoading ? "—" : categoryCount,
                  label: "Líneas de bienestar",
                },
                {
                  icon: Sparkles,
                  value: isLoading ? "—" : availableCount,
                  label: "Opciones disponibles",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[1.6rem] border border-white/85 bg-white/76 p-5 shadow-[0_24px_50px_-38px_rgba(15,84,43,0.26)] backdrop-blur-xl"
                >
                  <stat.icon className="h-5 w-5 text-primary" />
                  <p className="mt-4 text-3xl font-semibold text-foreground">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          ref={catalogRef}
          id="catalogo-productos"
          className="scroll-mt-28 py-14 lg:py-20"
        >
          <div className="container mx-auto px-4">
            <div className="page-fade-up rounded-[2rem] border border-emerald-100/75 bg-white/90 p-4 shadow-[0_28px_76px_-54px_rgba(15,84,43,0.28)] backdrop-blur-xl sm:p-6">
              <div className="grid gap-4 lg:grid-cols-[minmax(260px,1fr)_auto] lg:items-center">
                <div className="flex items-center gap-3.5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-[linear-gradient(145deg,rgba(236,253,245,0.95),rgba(255,255,255,0.96))] text-primary shadow-[0_12px_25px_-18px_rgba(15,112,58,0.5)]">
                    <SlidersHorizontal className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      Personaliza tu exploración
                    </p>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                      Refina el catálogo por línea, disponibilidad y orden.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <SlidersHorizontal className="h-4 w-4" />
                    Ordenar
                  </div>
                  <Select
                    value={sortBy}
                    onValueChange={(value) => setSortBy(value as SortOption)}
                  >
                    <SelectTrigger className="h-11 min-w-[210px] rounded-full border-emerald-100/90 bg-[#fbfdfb] px-4 shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-border/60 bg-white">
                      <SelectItem value="recommended">Recomendados</SelectItem>
                      <SelectItem value="name">Nombre: A a Z</SelectItem>
                      <SelectItem value="rating">Mejor calificados</SelectItem>
                      <SelectItem value="price-asc">Precio: menor a mayor</SelectItem>
                      <SelectItem value="price-desc">Precio: mayor a menor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {searchQuery.trim() ? (
                <div className="mt-5 flex flex-col gap-3 rounded-[1.25rem] border border-emerald-100 bg-[radial-gradient(circle_at_88%_10%,rgba(137,195,76,0.15),transparent_32%),linear-gradient(110deg,rgba(236,253,245,0.9),rgba(255,255,255,0.96))] p-3.5 shadow-[0_16px_34px_-28px_rgba(15,112,58,0.45)] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-2 motion-safe:duration-300 sm:flex-row sm:items-center">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_10px_20px_-12px_rgba(15,112,58,0.8)]">
                    <Search className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-primary/75">
                      Búsqueda desde el encabezado
                    </p>
                    <p className="mt-0.5 truncate text-sm font-bold text-foreground">
                      Resultados para “{searchQuery.trim()}”
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearGlobalSearch}
                    className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-emerald-100 bg-white/85 px-3.5 text-xs font-bold text-emerald-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 motion-reduce:transition-none"
                    aria-label={`Quitar búsqueda ${searchQuery.trim()}`}
                  >
                    Mostrar todo
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : null}

              <div className="mt-5 border-t border-border/60 pt-5">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <Filter className="h-4 w-4" />
                  Filtrar por línea
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible sm:pb-0">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedCategory(category.id)}
                      aria-pressed={selectedCategory === category.id}
                      className={cn(
                        "shrink-0 rounded-full border px-4 py-2.5 text-sm font-medium transition-all duration-300",
                        selectedCategory === category.id
                          ? "border-primary bg-primary text-primary-foreground shadow-[0_14px_28px_-18px_rgba(16,112,58,0.55)]"
                          : "border-emerald-100/90 bg-[#fbfdfb] text-foreground/75 hover:-translate-y-0.5 hover:border-primary/20 hover:bg-primary/7",
                      )}
                    >
                      {category.name}
                      {typeof category.count === "number" ? (
                        <span className="ml-1.5 opacity-65">{category.count}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAvailability("all")}
                  aria-pressed={availability === "all"}
                  className={cn(
                    "rounded-full border px-3.5 py-2 text-xs font-medium transition-colors",
                    availability === "all"
                      ? "border-foreground/10 bg-foreground text-background"
                      : "border-border bg-white text-muted-foreground hover:text-foreground",
                  )}
                >
                  Todos los estados
                </button>
                <button
                  type="button"
                  onClick={() => setAvailability("available")}
                  aria-pressed={availability === "available"}
                  className={cn(
                    "rounded-full border px-3.5 py-2 text-xs font-medium transition-colors",
                    availability === "available"
                      ? "border-emerald-700 bg-emerald-700 text-white"
                      : "border-emerald-100 bg-emerald-50/70 text-emerald-700 hover:bg-emerald-50",
                  )}
                >
                  Disponibles
                </button>
                <button
                  type="button"
                  onClick={() => setAvailability("offers")}
                  aria-pressed={availability === "offers"}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition-colors",
                    availability === "offers"
                      ? "border-amber-600 bg-amber-500 text-white"
                      : "border-amber-100 bg-amber-50/70 text-amber-700 hover:bg-amber-50",
                  )}
                >
                  <BadgePercent className="h-3.5 w-3.5" />
                  Ofertas
                </button>
                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                    Limpiar filtros
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mb-7 mt-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/75">
                  Colección INHALEX
                </p>
                <h2 className="mt-2 text-3xl font-semibold text-foreground">
                  {searchQuery.trim()
                    ? `Resultados para “${searchQuery.trim()}”`
                    : selectedCategory === "all"
                      ? "Todos los aromas"
                      : (categories.find(
                          (category) => category.id === selectedCategory,
                        )?.name ?? "Aromas")}
                </h2>
              </div>
              {!isLoading && !errorMessage ? (
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  {filteredProducts.length === 0
                    ? "Sin resultados"
                    : `Mostrando ${resultStart}–${resultEnd} de ${filteredProducts.length}`}
                </p>
              ) : null}
            </div>

            {isLoading ? (
              <CatalogSkeleton />
            ) : errorMessage ? (
              <div className="rounded-[2rem] border border-rose-100 bg-white px-6 py-16 text-center shadow-[0_22px_60px_-48px_rgba(127,29,29,0.24)]">
                <RefreshCcw className="mx-auto h-10 w-10 text-rose-500" />
                <h2 className="mt-5 text-2xl font-semibold text-foreground">
                  No pudimos cargar el catálogo
                </h2>
                <p className="mx-auto mt-3 max-w-lg leading-7 text-muted-foreground">
                  {errorMessage}
                </p>
                <Button
                  className="mt-6 rounded-full px-6"
                  onClick={() => void reloadCatalog()}
                >
                  <RefreshCcw className="h-4 w-4" />
                  Intentar de nuevo
                </Button>
              </div>
            ) : pageProducts.length === 0 ? (
              <div className="rounded-[2rem] border border-border/60 bg-white px-6 py-16 text-center shadow-[0_22px_60px_-48px_rgba(15,23,42,0.2)]">
                <SearchX className="mx-auto h-11 w-11 text-primary/55" />
                <h2 className="mt-5 text-2xl font-semibold text-foreground">
                  No encontramos ese aroma
                </h2>
                <p className="mx-auto mt-3 max-w-lg leading-7 text-muted-foreground">
                  Usa el buscador principal para probar otro aroma o restablece
                  los filtros para consultar todo el catálogo.
                </p>
                <Button
                  variant="outline"
                  className="mt-6 rounded-full border-primary/15 px-6"
                  onClick={clearFilters}
                >
                  Ver todos los aromas
                </Button>
              </div>
            ) : (
              <div className="grid items-stretch gap-7 md:grid-cols-2 xl:grid-cols-3">
                {pageProducts.map((product, index) => (
                  <CatalogProductCard
                    key={product.id}
                    product={product}
                    index={index}
                    onAddToCart={addItem}
                  />
                ))}
              </div>
            )}

            {!isLoading && !errorMessage && totalPages > 1 ? (
              <nav
                className="mt-12 flex flex-wrap items-center justify-center gap-2"
                aria-label="Paginación del catálogo"
              >
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 rounded-full border-emerald-100/90 bg-white"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                  (page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => handlePageChange(page)}
                      aria-label={`Ir a la página ${page}`}
                      aria-current={currentPage === page ? "page" : undefined}
                      className={cn(
                        "h-11 min-w-11 rounded-full px-3 text-sm font-semibold transition-all",
                        currentPage === page
                          ? "bg-primary text-primary-foreground shadow-[0_14px_28px_-18px_rgba(16,112,58,0.6)]"
                          : "border border-emerald-100/90 bg-white text-foreground/70 hover:border-primary/20 hover:bg-primary/7 hover:text-primary",
                      )}
                    >
                      {page}
                    </button>
                  ),
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 rounded-full border-emerald-100/90 bg-white"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  aria-label="Página siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </nav>
            ) : null}
          </div>
        </section>

        <section
          id="como-elegir"
          className="scroll-mt-28 border-t border-emerald-100/70 bg-white py-14 lg:py-20"
        >
          <div className="container mx-auto px-4">
            <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
              <div>
                <span className="inline-flex rounded-full border border-primary/10 bg-primary/7 px-4 py-1.5 text-sm font-medium text-primary">
                  Una elección más sencilla
                </span>
                <h2 className="mt-5 text-3xl font-semibold text-foreground sm:text-4xl">
                  Elige por el momento que quieres acompañar
                </h2>
                <p className="mt-4 max-w-xl text-lg leading-8 text-muted-foreground">
                  Cada ficha reúne notas aromáticas, características, disponibilidad y
                  reseñas para que compares antes de agregar un inhalador a tu bolsa.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  {
                    number: "01",
                    title: "Filtra",
                    description: "Explora por línea o busca una nota aromática.",
                  },
                  {
                    number: "02",
                    title: "Compara",
                    description: "Revisa características, calificación y precio.",
                  },
                  {
                    number: "03",
                    title: "Descubre",
                    description: "Abre la ficha completa y conoce sus reseñas.",
                  },
                ].map((step) => (
                  <div
                    key={step.number}
                    className="rounded-[1.6rem] border border-emerald-100/80 bg-[#fbfdfb] p-5"
                  >
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary/65">
                      {step.number}
                    </span>
                    <h3 className="mt-4 text-xl font-semibold text-foreground">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
