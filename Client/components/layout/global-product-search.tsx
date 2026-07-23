"use client"

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import {
  ArrowRight,
  ArrowUpRight,
  HeartPulse,
  Leaf,
  Loader2,
  MoonStar,
  Search,
  SearchX,
  Sparkles,
  Wind,
  X,
  Zap,
} from "lucide-react"
import { useCatalog } from "@/components/products/catalog-provider"
import { Input } from "@/components/ui/input"
import { resolveProductCollectionImage } from "@/lib/products/product-images"
import {
  normalizeProductSearchText,
  rankProductsForSearch,
} from "@/lib/products/product-search"
import { getLineaConfig, getLineaHref } from "@/lib/products/lineas"
import {
  formatProductPrice,
  getProductDisplayPrice,
} from "@/lib/products/promotions"
import { cn } from "@/lib/utils"
import type { Product } from "@/lib/types/product"

interface GlobalProductSearchProps {
  variant?: "desktop" | "mobile"
  onOpenChange?: (isOpen: boolean) => void
  onNavigate?: () => void
}

function getLineVisual(categoryId: string) {
  switch (categoryId) {
    case "linea-insomnio":
      return {
        icon: MoonStar,
        surface:
          "border-indigo-100 bg-[linear-gradient(135deg,rgba(238,242,255,0.96),rgba(255,255,255,0.94))] text-indigo-700",
        iconSurface: "bg-indigo-100/80 text-indigo-700",
      }
    case "linea-ansiedad-estres":
      return {
        icon: HeartPulse,
        surface:
          "border-rose-100 bg-[linear-gradient(135deg,rgba(255,241,242,0.96),rgba(255,255,255,0.94))] text-rose-700",
        iconSurface: "bg-rose-100/80 text-rose-700",
      }
    case "linea-resfriado":
      return {
        icon: Wind,
        surface:
          "border-amber-100 bg-[linear-gradient(135deg,rgba(255,251,235,0.96),rgba(255,255,255,0.94))] text-amber-700",
        iconSurface: "bg-amber-100/80 text-amber-700",
      }
    case "linea-verde":
      return {
        icon: Leaf,
        surface:
          "border-cyan-100 bg-[linear-gradient(135deg,rgba(236,254,255,0.96),rgba(255,255,255,0.94))] text-cyan-700",
        iconSurface: "bg-cyan-100/80 text-cyan-700",
      }
    default:
      return {
        icon: Zap,
        surface:
          "border-lime-100 bg-[linear-gradient(135deg,rgba(247,254,231,0.96),rgba(255,255,255,0.94))] text-lime-700",
        iconSurface: "bg-lime-100/80 text-lime-700",
      }
  }
}

export function GlobalProductSearch({
  variant = "desktop",
  onOpenChange,
  onNavigate,
}: GlobalProductSearchProps) {
  const router = useRouter()
  const pathname = usePathname()
  const {
    products,
    categories,
    isLoading,
    errorMessage,
    ensureLoaded,
    reloadCatalog,
  } = useCatalog()
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxId = `product-search-${useId().replace(/:/g, "")}`
  const isMobile = variant === "mobile"

  const results = useMemo(
    () => rankProductsForSearch(products, query, categories, query.trim() ? 6 : 3),
    [categories, products, query],
  )

  const lineResults = useMemo(() => {
    const lineOptions = categories.filter((category) => category.id !== "all")
    const normalizedQuery = normalizeProductSearchText(query)

    if (!normalizedQuery) return lineOptions.slice(0, 5)

    const relatedCategoryIds = new Set(
      results.map(({ product }) => product.category),
    )

    return lineOptions
      .map((category) => {
        const config = getLineaConfig(category.id)
        const haystack = normalizeProductSearchText(
          [
            category.name,
            config?.name ?? "",
            config?.label ?? "",
            config?.headline ?? "",
            config?.description ?? "",
            config?.ritual ?? "",
            ...(config?.highlights ?? []),
          ].join(" "),
        )
        const directMatch = haystack.includes(normalizedQuery)
        const relatedMatch = relatedCategoryIds.has(category.id)

        if (!directMatch && !relatedMatch) return null

        return {
          category,
          score: Number(directMatch) * 2 + Number(relatedMatch),
        }
      })
      .filter(
        (
          result,
        ): result is {
          category: (typeof lineOptions)[number]
          score: number
        } => result !== null,
      )
      .sort(
        (left, right) =>
          right.score - left.score ||
          left.category.name.localeCompare(right.category.name, "es"),
      )
      .slice(0, 3)
      .map(({ category }) => category)
  }, [categories, query, results])

  const totalOptions = results.length + lineResults.length

  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  )

  const setSearchOpen = (nextValue: boolean) => {
    setIsOpen(nextValue)
    onOpenChange?.(nextValue)
  }

  useEffect(() => {
    void ensureLoaded()
  }, [ensureLoaded])

  useEffect(() => {
    if (isMobile) return

    const handleShortcut = (event: globalThis.KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "k") {
        return
      }

      const target = event.target as HTMLElement | null
      const isEditing =
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLInputElement && target !== inputRef.current)

      if (isEditing || !inputRef.current || inputRef.current.offsetParent === null) {
        return
      }

      event.preventDefault()
      inputRef.current.focus()
      setSearchOpen(true)
      void ensureLoaded()
    }

    window.addEventListener("keydown", handleShortcut)
    return () => window.removeEventListener("keydown", handleShortcut)
  }, [ensureLoaded, isMobile])

  useEffect(() => {
    setActiveIndex(totalOptions > 0 ? 0 : -1)
  }, [query, totalOptions])

  useEffect(() => {
    setQuery("")
    setIsOpen(false)
    onOpenChange?.(false)
  }, [pathname, onOpenChange])

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  })

  const navigateToProduct = (product: Product) => {
    const productKey = product.slug || product.id
    setQuery("")
    setSearchOpen(false)
    onNavigate?.()
    router.push(`/productos/${encodeURIComponent(productKey)}`)
  }

  const navigateToLine = (categoryId: string) => {
    setQuery("")
    setSearchOpen(false)
    onNavigate?.()
    router.push(getLineaHref(categoryId))
  }

  const navigateToResults = () => {
    const trimmedQuery = query.trim()
    const shouldKeepQuery = trimmedQuery.length > 0 && results.length > 0
    setSearchOpen(false)
    onNavigate?.()
    router.push(
      shouldKeepQuery
        ? `/productos?buscar=${encodeURIComponent(trimmedQuery)}`
        : "/productos",
    )
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setSearchOpen(false)
      return
    }

    if (event.key === "ArrowDown" && totalOptions > 0) {
      event.preventDefault()
      setSearchOpen(true)
      setActiveIndex((current) =>
        current >= totalOptions - 1 ? 0 : current + 1,
      )
      return
    }

    if (event.key === "ArrowUp" && totalOptions > 0) {
      event.preventDefault()
      setSearchOpen(true)
      setActiveIndex((current) =>
        current <= 0 ? totalOptions - 1 : current - 1,
      )
      return
    }

    if (event.key === "Home" && isOpen && totalOptions > 0) {
      event.preventDefault()
      setActiveIndex(0)
      return
    }

    if (event.key === "End" && isOpen && totalOptions > 0) {
      event.preventDefault()
      setActiveIndex(totalOptions - 1)
      return
    }

    if (event.key === "Enter") {
      event.preventDefault()
      const selectedResult = results[activeIndex]?.product
      const selectedLine =
        activeIndex >= results.length
          ? lineResults[activeIndex - results.length]
          : undefined

      if (selectedResult) {
        navigateToProduct(selectedResult)
      } else if (selectedLine) {
        navigateToLine(selectedLine.id)
      } else if (results[0]?.product) {
        navigateToProduct(results[0].product)
      } else if (lineResults[0]) {
        navigateToLine(lineResults[0].id)
      } else {
        navigateToResults()
      }
    }
  }

  const announcement = isLoading
    ? "Cargando aromas"
    : query.trim()
      ? `${totalOptions} sugerencias encontradas`
      : ""

  return (
    <div ref={rootRef} className="group/search relative w-full">
      <div className="pointer-events-none absolute -inset-1 rounded-[1.15rem] bg-[linear-gradient(105deg,rgba(16,112,58,0.28),rgba(137,195,76,0.2),rgba(103,195,166,0.22))] opacity-0 blur-md transition-opacity duration-500 group-focus-within/search:opacity-100" />
      <label className="group relative block">
        <span className="sr-only">Buscar aromas INHALEX</span>
        <span className="pointer-events-none absolute left-1.5 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[0.7rem] bg-[linear-gradient(145deg,#0f703a,#2f9a56)] text-white shadow-[0_8px_18px_-10px_rgba(15,112,58,0.9)] transition-all duration-300 group-focus-within:scale-105 group-focus-within:shadow-[0_10px_22px_-10px_rgba(15,112,58,0.95)]">
          <Search className="h-3.5 w-3.5" />
        </span>
        <Input
          ref={inputRef}
          type="search"
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-keyshortcuts="Control+K Meta+K"
          aria-activedescendant={
            isOpen && activeIndex >= 0
              ? `${listboxId}-option-${activeIndex}`
              : undefined
          }
          placeholder="Buscar un aroma..."
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setSearchOpen(true)
          }}
          onFocus={() => {
            setSearchOpen(true)
            void ensureLoaded()
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            "h-11 w-full rounded-[1rem] border-emerald-100/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(244,250,246,0.88))] pl-12 transition-all duration-300 placeholder:text-muted-foreground/85 focus:border-primary/55 focus:bg-white focus:shadow-[0_14px_32px_-22px_rgba(16,112,58,0.5)] motion-reduce:transition-none [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none",
            query ? "pr-11" : isMobile ? "pr-10" : "pr-[4.8rem]",
            isMobile && "bg-white/82",
          )}
        />
        {query ? (
          <button
            type="button"
            aria-label="Limpiar búsqueda"
            className="absolute right-2.5 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            onClick={() => {
              setQuery("")
              setSearchOpen(true)
            }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : !isMobile ? (
          <span className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-lg border border-emerald-100/90 bg-white/80 px-2 py-1 text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground shadow-sm xl:inline-flex">
            Ctrl
            <span className="text-primary">K</span>
          </span>
        ) : (
          <Sparkles className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-primary/60 motion-safe:animate-pulse" />
        )}
      </label>

      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>

      {isOpen ? (
        <div
          className={cn(
            "z-[70] origin-top overflow-hidden rounded-[1.75rem] border border-white/90 bg-white/96 shadow-[0_34px_90px_-42px_rgba(15,84,43,0.5)] ring-1 ring-emerald-100/70 backdrop-blur-2xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:slide-in-from-top-2 motion-safe:duration-300 motion-reduce:animate-none",
            isMobile
              ? "relative mt-2"
              : "absolute left-1/2 mt-3 w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2",
          )}
        >
          <div className="relative overflow-hidden border-b border-emerald-100/70 bg-[radial-gradient(circle_at_88%_12%,rgba(137,195,76,0.22),transparent_30%),linear-gradient(125deg,rgba(238,249,242,0.96),rgba(255,255,255,0.98)_52%,rgba(250,247,237,0.9))] px-4 py-3.5">
            <div className="pointer-events-none absolute -right-7 -top-8 h-24 w-24 rounded-full border border-white/70 bg-white/30" />
            <div className="relative flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/90 bg-white/86 shadow-[0_12px_25px_-16px_rgba(15,84,43,0.5)]">
                <span className="relative h-8 w-8">
                  <Image
                    src="/images/LogoSimple.png"
                    alt=""
                    fill
                    sizes="32px"
                    className="object-contain"
                  />
                </span>
              </span>
              <span className="min-w-0">
                <span className="block text-[0.65rem] font-extrabold uppercase tracking-[0.2em] text-primary">
                  Buscador INHALEX
                </span>
                <span className="mt-0.5 block truncate text-xs font-medium text-foreground/65">
                  Aromas y líneas de bienestar en un solo lugar
                </span>
              </span>
              <span className="ml-auto hidden shrink-0 items-center gap-1.5 rounded-full border border-emerald-100/80 bg-white/80 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-wider text-emerald-700 shadow-sm sm:inline-flex">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
                </span>
                Catálogo activo
              </span>
            </div>
          </div>

          <div
            id={listboxId}
            role="listbox"
            aria-label="Aromas y líneas sugeridos"
            aria-busy={isLoading}
            className={cn(
              "overflow-y-auto overscroll-contain bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,252,250,0.96))]",
              isMobile ? "max-h-[min(27rem,52dvh)]" : "max-h-[31rem]",
            )}
          >
            {isLoading && products.length === 0 ? (
              <div className="flex items-center gap-3 px-5 py-7 text-sm text-muted-foreground">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-primary">
                  <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                </span>
                Preparando aromas y líneas...
              </div>
            ) : (
              <>
                {errorMessage && products.length === 0 ? (
                  <div className="mx-3 mt-3 flex items-center justify-between gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 px-3.5 py-3">
                    <p className="text-xs leading-5 text-amber-900/75">
                      No pudimos actualizar los aromas.
                    </p>
                    <button
                      type="button"
                      className="shrink-0 text-xs font-bold text-amber-800 hover:underline"
                      onClick={() => void reloadCatalog()}
                    >
                      Reintentar
                    </button>
                  </div>
                ) : null}

                {results.length > 0 ? (
                  <div
                    role="group"
                    aria-labelledby={`${listboxId}-products-label`}
                    className="pb-1"
                  >
                    <div className="flex items-center justify-between px-4 pb-1 pt-3">
                      <span
                        id={`${listboxId}-products-label`}
                        className="inline-flex items-center gap-1.5 text-[0.64rem] font-extrabold uppercase tracking-[0.18em] text-muted-foreground"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        {query.trim() ? "Aromas encontrados" : "Aromas destacados"}
                      </span>
                      <span className="text-[0.65rem] font-semibold text-primary/75">
                        {results.length}{" "}
                        {results.length === 1 ? "opción" : "opciones"}
                      </span>
                    </div>
                    <ul className="p-2 pt-1">
                      {results.map(({ product }, index) => {
                        const isAvailable =
                          product.inStock || product.allowBackorder
                        const categoryName =
                          categoryNames.get(product.category) ??
                          "Producto INHALEX"

                        return (
                          <li
                            key={product.id}
                            className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 motion-safe:duration-300"
                            style={{
                              animationDelay: `${index * 45}ms`,
                              animationFillMode: "both",
                            }}
                          >
                            <button
                              id={`${listboxId}-option-${index}`}
                              type="button"
                              role="option"
                              aria-selected={activeIndex === index}
                              className={cn(
                                "group/result relative flex min-h-[4.5rem] w-full items-center gap-3 overflow-hidden rounded-[1.15rem] border px-2.5 py-2 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 motion-safe:hover:translate-x-1 motion-reduce:transition-none",
                                activeIndex === index
                                  ? "border-emerald-100 bg-[linear-gradient(105deg,rgba(236,253,245,0.98),rgba(255,255,255,0.96))] shadow-[0_13px_30px_-24px_rgba(15,112,58,0.5)]"
                                  : "border-transparent hover:border-emerald-100/70 hover:bg-emerald-50/55",
                              )}
                              onMouseEnter={() => setActiveIndex(index)}
                              onClick={() => navigateToProduct(product)}
                            >
                              <span
                                className={cn(
                                  "absolute bottom-2 left-0 top-2 w-0.5 rounded-full bg-primary transition-opacity",
                                  activeIndex === index
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              <span className="relative h-[3.25rem] w-[3.25rem] shrink-0 overflow-hidden rounded-[0.9rem] border border-emerald-100 bg-emerald-50 shadow-sm ring-2 ring-white">
                                <Image
                                  src={resolveProductCollectionImage(product)}
                                  alt=""
                                  fill
                                  sizes="52px"
                                  className="object-cover transition-transform duration-500 group-hover/result:scale-110 motion-reduce:transition-none"
                                />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-bold text-foreground">
                                  {product.name}
                                </span>
                                <span className="mt-0.5 block truncate text-[0.72rem] font-medium text-muted-foreground">
                                  {categoryName}
                                </span>
                                <span
                                  className={cn(
                                    "mt-1 inline-flex items-center gap-1 text-[0.65rem] font-bold",
                                    isAvailable
                                      ? "text-emerald-700"
                                      : "text-amber-700",
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "h-1.5 w-1.5 rounded-full",
                                      isAvailable
                                        ? "bg-emerald-500"
                                        : "bg-amber-500",
                                    )}
                                  />
                                  {isAvailable ? "Disponible" : "Agotado"}
                                </span>
                              </span>
                              <span className="shrink-0 text-right">
                                <span className="block text-xs font-extrabold text-foreground">
                                  {formatProductPrice(
                                    product,
                                    getProductDisplayPrice(product),
                                  )}
                                </span>
                                <ArrowUpRight className="ml-auto mt-1 h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover/result:-translate-y-0.5 group-hover/result:translate-x-0.5 group-hover/result:text-primary motion-reduce:transition-none" />
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ) : null}

                {lineResults.length > 0 ? (
                  <div
                    role="group"
                    aria-labelledby={`${listboxId}-lines-label`}
                    className="border-t border-emerald-100/65 px-3 pb-3 pt-3"
                  >
                    <div className="mb-2 flex items-center justify-between px-1">
                      <span
                        id={`${listboxId}-lines-label`}
                        className="inline-flex items-center gap-1.5 text-[0.64rem] font-extrabold uppercase tracking-[0.18em] text-muted-foreground"
                      >
                        <Leaf className="h-3.5 w-3.5 text-primary" />
                        Líneas de bienestar
                      </span>
                      <span className="text-[0.65rem] font-semibold text-muted-foreground">
                        Explorar colecciones
                      </span>
                    </div>
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {lineResults.map((category, lineIndex) => {
                        const optionIndex = results.length + lineIndex
                        const visual = getLineVisual(category.id)
                        const LineIcon = visual.icon
                        const config = getLineaConfig(category.id)

                        return (
                          <li
                            key={category.id}
                            className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-300"
                            style={{
                              animationDelay: `${(results.length + lineIndex) * 40}ms`,
                              animationFillMode: "both",
                            }}
                          >
                            <button
                              id={`${listboxId}-option-${optionIndex}`}
                              type="button"
                              role="option"
                              aria-selected={activeIndex === optionIndex}
                              className={cn(
                                "group/line flex min-h-[3.8rem] w-full items-center gap-2.5 rounded-[1rem] border p-2.5 text-left shadow-[0_10px_22px_-20px_rgba(15,23,42,0.3)] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none",
                                visual.surface,
                                activeIndex === optionIndex
                                  ? "ring-2 ring-primary/20 shadow-[0_15px_30px_-22px_rgba(15,112,58,0.48)]"
                                  : "hover:shadow-[0_15px_30px_-22px_rgba(15,112,58,0.34)]",
                              )}
                              onMouseEnter={() => setActiveIndex(optionIndex)}
                              onClick={() => navigateToLine(category.id)}
                            >
                              <span
                                className={cn(
                                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover/line:scale-105",
                                  visual.iconSurface,
                                )}
                              >
                                <LineIcon className="h-4 w-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-xs font-bold text-foreground">
                                  {config?.name ?? category.name}
                                </span>
                                <span className="mt-0.5 block truncate text-[0.65rem] font-medium opacity-75">
                                  {config?.label ??
                                    `${category.count ?? 0} aromas`}
                                </span>
                              </span>
                              <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-55 transition-transform duration-300 group-hover/line:translate-x-0.5" />
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ) : null}

                {totalOptions === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-[1.2rem] border border-emerald-100 bg-[linear-gradient(145deg,rgba(236,253,245,0.96),rgba(255,255,255,0.98))] text-primary shadow-[0_16px_34px_-25px_rgba(15,112,58,0.55)]">
                      <SearchX className="h-5 w-5" />
                      <Sparkles className="absolute -right-1 -top-1 h-4 w-4 text-lime-500" />
                    </span>
                    <p className="mt-4 text-sm font-bold text-foreground">
                      No encontramos “{query.trim()}”
                    </p>
                    <p className="mx-auto mt-1.5 max-w-sm text-xs leading-5 text-muted-foreground">
                      Prueba con el nombre de un aroma o explora las líneas
                      disponibles en el catálogo.
                    </p>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div className="flex min-h-12 items-center gap-3 border-t border-emerald-100/70 bg-[linear-gradient(90deg,rgba(247,252,249,0.98),rgba(255,255,255,0.98))] px-4 py-2.5">
            <button
              type="button"
              className="group/footer flex min-w-0 flex-1 items-center gap-2 text-left text-xs font-bold text-primary transition-colors hover:text-emerald-800 focus-visible:outline-none focus-visible:underline"
              onClick={navigateToResults}
            >
              <span className="truncate">
                {query.trim() && results.length > 0
                  ? `Ver resultados para “${query.trim()}”`
                  : query.trim()
                    ? "Explorar el catálogo completo"
                    : "Ver catálogo completo"}
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover/footer:translate-x-0.5" />
            </button>
            {!isMobile ? (
              <span className="hidden shrink-0 items-center gap-1.5 text-[0.58rem] font-semibold text-muted-foreground/75 sm:flex">
                <kbd className="rounded-md border border-border/70 bg-white px-1.5 py-0.5 shadow-sm">
                  ↑↓
                </kbd>
                navegar
                <kbd className="ml-1 rounded-md border border-border/70 bg-white px-1.5 py-0.5 shadow-sm">
                  Enter
                </kbd>
                abrir
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
