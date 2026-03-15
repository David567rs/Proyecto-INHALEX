"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronLeft, ChevronRight, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProductCard } from "@/components/products/product-card"
import { ProductModal } from "@/components/products/product-modal"
import { cn } from "@/lib/utils"
import {
  PRODUCT_CATEGORIES,
  type ProductCategoryOption,
} from "@/lib/products/categories"
import type { Product } from "@/lib/types/product"

interface ProductsSectionProps {
  products: Product[]
  categories?: ProductCategoryOption[]
  isLoading?: boolean
  errorMessage?: string
  onAddToCart?: (product: Product, quantity: number) => void
  searchQuery?: string
  selectedCategory?: string
  onCategoryChange?: (categoryId: string) => void
}

export function ProductsSection({
  products,
  categories = PRODUCT_CATEGORIES,
  isLoading = false,
  errorMessage = "",
  onAddToCart,
  searchQuery = "",
  selectedCategory: controlledCategory,
  onCategoryChange,
}: ProductsSectionProps) {
  const [localCategory, setLocalCategory] = useState("all")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  const productsPerPage = 4
  const effectiveCategory = controlledCategory ?? localCategory
  const setCategory = onCategoryChange ?? setLocalCategory
  const categoryOptions = categories.length > 0 ? categories : PRODUCT_CATEGORIES

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const normalize = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")

  const matchesQuery = (product: Product, query: string) => {
    if (!query.trim()) return true
    const haystack = normalize(
      `${product.name} ${product.description} ${product.longDescription ?? ""} ${product.benefits.join(" ")}`
    )
    const tokens = normalize(query).split(/\s+/).filter(Boolean)
    return tokens.every((token) => haystack.includes(token))
  }

  const filteredProducts = (effectiveCategory === "all"
    ? products
    : products.filter(p => p.category.toLowerCase() === effectiveCategory)
  ).filter((product) => matchesQuery(product, searchQuery))

  const totalPages = Math.ceil(filteredProducts.length / productsPerPage)

  const handleQuickView = (product: Product) => {
    setSelectedProduct(product)
    setIsModalOpen(true)
  }

  const handleAddToCart = (product: Product, quantity: number = 1) => {
    onAddToCart?.(product, quantity)
  }

  const handleCategoryChange = (categoryId: string) => {
    setCategory(categoryId)
    setCurrentPage(1)
  }

  useEffect(() => {
    if (searchQuery.trim()) {
      setCategory("all")
    }
    setCurrentPage(1)
  }, [searchQuery, setCategory])

  useEffect(() => {
    setCurrentPage(1)
  }, [effectiveCategory])

  return (
    <section
      id="catalogo"
      ref={sectionRef}
      className="py-20 lg:py-32 bg-background relative overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/3 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div
          className={cn(
            "text-center mb-12 lg:mb-16 transition-all duration-1000",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <span className="inline-block px-4 py-1.5 bg-primary/10 rounded-full text-sm font-medium text-primary mb-4">
            Catalogo
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-foreground mb-4 text-balance">
            Nuestros Productos
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-pretty">
            Explora nuestra coleccion de esencias naturales, cada una cuidadosamente
            seleccionada para tu bienestar respiratorio.
          </p>
        </div>

        {/* Category Filter */}
        <div
          className={cn(
            "flex flex-wrap items-center justify-center gap-2 mb-10 transition-all duration-1000 delay-200",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <Filter className="w-4 h-4 text-muted-foreground mr-2 hidden sm:block" />
          {categoryOptions.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryChange(category.id)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
                effectiveCategory === category.id
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "bg-secondary text-secondary-foreground hover:bg-primary/10"
              )}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Products Carousel */}
        <div
          className={cn(
            "mb-12 overflow-hidden",
            "transition-all duration-1000 delay-300",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          {isLoading ? (
            <div className="bg-card border border-border/60 rounded-2xl p-8 text-center shadow-sm">
              <p className="text-lg font-semibold text-foreground mb-2">
                Cargando productos...
              </p>
              <p className="text-muted-foreground">
                Estamos trayendo el catalogo desde el servidor.
              </p>
            </div>
          ) : errorMessage ? (
            <div className="bg-card border border-destructive/30 rounded-2xl p-8 text-center shadow-sm">
              <p className="text-lg font-semibold text-destructive mb-2">
                No se pudo cargar el catalogo
              </p>
              <p className="text-muted-foreground">{errorMessage}</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-card border border-border/60 rounded-2xl p-8 text-center shadow-sm">
              <p className="text-lg font-semibold text-foreground mb-2">
                No encontramos resultados
              </p>
              <p className="text-muted-foreground">
                Intenta con otro aroma o ajusta tu busqueda.
              </p>
            </div>
          ) : (
            <div
              className="flex transition-transform duration-700 ease-in-out motion-safe:animate-in motion-safe:fade-in-0"
              style={{ transform: `translateX(-${(currentPage - 1) * 100}%)` }}
            >
              {[...Array(totalPages)].map((_, pageIndex) => {
                const start = pageIndex * productsPerPage
                const pageProducts = filteredProducts.slice(
                  start,
                  start + productsPerPage
                )

                return (
                  <div
                    key={`page-${pageIndex}`}
                    className="w-full flex-shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-1"
                  >
                    {pageProducts.map((product, index) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onQuickView={handleQuickView}
                        onAddToCart={(p) => handleAddToCart(p, 1)}
                        index={index}
                      />
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && filteredProducts.length > 0 && (
          <div
            className={cn(
              "flex items-center justify-center gap-2 transition-all duration-1000 delay-500",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full bg-transparent"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Pagina anterior</span>
            </Button>

            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={cn(
                  "h-10 w-10 rounded-full text-sm font-medium transition-all duration-300",
                  currentPage === i + 1
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "bg-secondary text-secondary-foreground hover:bg-primary/10"
                )}
              >
                {i + 1}
              </button>
            ))}

            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full bg-transparent"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Pagina siguiente</span>
            </Button>
          </div>
        )}
      </div>

      {/* Product Modal */}
      <ProductModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddToCart={handleAddToCart}
      />
    </section>
  )
}

