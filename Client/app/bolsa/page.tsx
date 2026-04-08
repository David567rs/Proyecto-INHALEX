import { CartPageClient } from "@/components/cart/cart-page-client"
import { Footer } from "@/components/layout/footer"
import { Header } from "@/components/layout/header"

export const dynamic = "force-dynamic"

export default function BolsaPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-24 lg:pt-28">
        <CartPageClient />
      </main>
      <Footer />
    </div>
  )
}
