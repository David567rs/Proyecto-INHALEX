"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Hero } from "@/components/sections/hero"
import { ProductsSection } from "@/components/sections/products-section"
import { BenefitsSection } from "@/components/sections/benefits-section"
import { CTASection } from "@/components/sections/cta-section"
import { useCatalog } from "@/components/products/catalog-provider"

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState("all")
  const {
    products,
    categories,
    isLoading: isProductsLoading,
    errorMessage: productsError,
    ensureLoaded,
  } = useCatalog()

  useEffect(() => {
    void ensureLoaded()
  }, [ensureLoaded])

  const categoryCount = categories.filter((category) => category.id !== "all").length
  const availableCount = products.filter((product) => product.inStock).length

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <Hero />
        <ProductsSection
          products={products}
          categories={categories}
          isLoading={isProductsLoading}
          errorMessage={productsError}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
        <BenefitsSection />
        <CTASection
          productCount={products.length}
          categoryCount={categoryCount}
          availableCount={availableCount}
          isLoading={isProductsLoading || Boolean(productsError)}
        />
      </main>

      <Footer />
    </div>
  )
}
