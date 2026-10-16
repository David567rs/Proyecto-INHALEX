import { CartPageClient } from "@/components/cart/cart-page-client"

export const dynamic = "force-dynamic"

export default function BolsaPage() {
  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 pt-24 lg:pt-28">
        <CartPageClient />
      </main>
    </div>
  )
}
