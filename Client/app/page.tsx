"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Hero } from "@/components/sections/hero"
import { ProductsSection } from "@/components/sections/products-section"
import { BenefitsSection } from "@/components/sections/benefits-section"
import { CTASection } from "@/components/sections/cta-section"
import type { Product } from "@/lib/types/product"
import {
  fetchCatalogCategories,
  fetchCatalogProducts,
} from "@/lib/products/products-api"
import {
  PRODUCT_CATEGORIES,
  type ProductCategoryOption,
} from "@/lib/products/categories"

export default function HomePage() {
  const [cartCount, setCartCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategoryOption[]>(PRODUCT_CATEGORIES)
  const [isProductsLoading, setIsProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState("")

  useEffect(() => {
    const loadProducts = async () => {
      setIsProductsLoading(true)
      setProductsError("")

      try {
        const [catalogProducts, catalogCategories] = await Promise.all([
          fetchCatalogProducts(),
          fetchCatalogCategories(),
        ])

        setProducts(catalogProducts)
        if (catalogCategories.length > 0) {
          setCategories([{ id: "all", name: "Todos" }, ...catalogCategories])
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Error al cargar productos"
        setProductsError(message)
      } finally {
        setIsProductsLoading(false)
      }
    }

    void loadProducts()
  }, [])

  const scrollToCatalog = () => {
    const section = document.getElementById("catalogo")
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  const handleSearchSelect = (value: string) => {
    setSearchQuery(value)
    scrollToCatalog()
  }

  const handleLineSelect = (categoryId: string) => {
    setSelectedCategory(categoryId)
    setSearchQuery("")
    setTimeout(scrollToCatalog, 50)
  }

  const handleAddToCart = (product: Product, quantity: number) => {
    setCartCount(prev => prev + quantity)
    // In a real app, you would also update cart state/context
    console.log(`Added ${quantity}x ${product.name} to cart`)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        cartCount={cartCount}
        searchQuery={searchQuery}
        catalogProducts={products}
        catalogCategories={categories}
        onSearchChange={setSearchQuery}
        onLineSelect={handleLineSelect}
        onSearchSelect={handleSearchSelect}
      />
      
      <main className="flex-1">
        <Hero />
        <ProductsSection
          products={products}
          categories={categories}
          isLoading={isProductsLoading}
          errorMessage={productsError}
          onAddToCart={handleAddToCart}
          searchQuery={searchQuery}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
        <BenefitsSection />
        <CTASection />
      </main>

      <Footer />
    </div>
  )
}
