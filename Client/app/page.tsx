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

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        searchQuery={searchQuery}
        catalogProducts={products}
        catalogCategories={categories}
        onSearchChange={setSearchQuery}
        onSearchSelect={handleSearchSelect}
      />
      
      <main className="flex-1">
        <Hero />
        <ProductsSection
          products={products}
          categories={categories}
          isLoading={isProductsLoading}
          errorMessage={productsError}
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
