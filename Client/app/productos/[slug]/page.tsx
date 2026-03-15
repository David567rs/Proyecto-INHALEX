import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Check, Star } from "lucide-react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { fetchProductBySlugServer } from "@/lib/products/products-server"
import type { Product } from "@/lib/types/product"

export const dynamic = "force-dynamic"

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>
}

function buildTitle(product: Product): string {
  return `${product.name} | INHALEX`
}

function buildDescription(product: Product): string {
  return (
    product.longDescription?.slice(0, 160) ??
    product.description.slice(0, 160)
  )
}

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await fetchProductBySlugServer(slug)

  if (!product) {
    return {
      title: "Producto no encontrado | INHALEX",
      description: "No encontramos el producto solicitado.",
    }
  }

  return {
    title: buildTitle(product),
    description: buildDescription(product),
    openGraph: {
      title: buildTitle(product),
      description: buildDescription(product),
      images: product.image ? [product.image] : [],
      type: "website",
    },
  }
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params
  const product = await fetchProductBySlugServer(slug)

  if (!product) {
    notFound()
  }

  const formattedPrice = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: product.currency || "MXN",
  }).format(product.price)

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-24 lg:pt-28">
        <section className="container mx-auto px-4 py-8 lg:py-12">
          <div className="mb-4 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary transition-colors">
              Inicio
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">{product.name}</span>
          </div>

          <div className="grid gap-8 lg:grid-cols-2 items-start">
            <div className="rounded-2xl border border-border/60 bg-card p-4">
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-muted">
                <Image
                  src={product.image || "/placeholder.svg"}
                  alt={product.name}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card p-6 lg:p-8">
              <h1 className="text-3xl lg:text-4xl font-serif font-bold text-foreground">
                {product.name}
              </h1>

              {typeof product.rating === "number" && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {[...Array(5)].map((_, index) => (
                      <Star
                        key={index}
                        className={`h-4 w-4 ${
                          index < Math.floor(product.rating ?? 0)
                            ? "fill-amber-500"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {product.rating} ({product.reviews ?? 0} resenas)
                  </span>
                </div>
              )}

              <p className="mt-5 text-muted-foreground leading-relaxed">
                {product.longDescription || product.description}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-4 rounded-xl bg-secondary/40 p-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Presentacion</p>
                  <p className="font-medium">{product.presentation}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Origen</p>
                  <p className="font-medium">{product.origin}</p>
                </div>
              </div>

              <div className="mt-6">
                <h2 className="text-sm font-semibold text-foreground mb-3">Beneficios</h2>
                <ul className="space-y-2">
                  {product.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary" />
                      </span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">{formattedPrice}</span>
                <span className="text-xs text-muted-foreground">{product.currency}</span>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/">Volver al catalogo</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/auth/login">Comprar ahora</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
