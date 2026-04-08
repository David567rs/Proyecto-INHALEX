import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Check, Star } from "lucide-react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { ProductDetailPurchase } from "@/components/products/product-detail-purchase"
import {
  resolveProductDisplayImage,
  resolveProductImagePosition,
} from "@/lib/products/product-images"
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

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    "linea-insomnio": "Linea insomnio",
    "linea-ansiedad-estres": "Linea ansiedad y estres",
    "linea-resfriado": "Linea resfriado",
    "linea-verde": "Linea verde",
    "linea-estimulante": "Linea estimulante",
  }

  return labels[category] ?? "Seleccion natural"
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

  const displayImage = resolveProductDisplayImage(product)

  return {
    title: buildTitle(product),
    description: buildDescription(product),
    openGraph: {
      title: buildTitle(product),
      description: buildDescription(product),
      images: displayImage ? [displayImage] : [],
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
  const displayImage = resolveProductDisplayImage(product)
  const imagePosition = resolveProductImagePosition(product)

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-24 lg:pt-28">
        <section className="container mx-auto px-4 py-8 lg:py-12">
          <div className="page-fade-up mb-4 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary transition-colors">
              Inicio
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">{product.name}</span>
          </div>

          <div className="mx-auto grid max-w-[1060px] items-start gap-8 lg:grid-cols-[0.94fr_1fr]">
            <div className="page-fade-up page-fade-up-delay-1 relative min-h-[25rem] overflow-hidden rounded-[30px] border border-stone-200/80 bg-white shadow-[0_28px_70px_-42px_rgba(64,50,30,0.22)] sm:min-h-[34rem] lg:min-h-[46rem]">
              <div className="absolute left-5 top-5 z-20">
                <span className="text-[8px] font-bold uppercase tracking-[0.22em] text-neutral-400/80">
                  INHALEX
                </span>
              </div>
              <Image
                src={displayImage}
                alt={product.name}
                fill
                className="object-cover object-center"
                style={{ objectPosition: imagePosition }}
                sizes="(max-width: 1024px) 100vw, 44vw"
                priority
              />
              <div className="absolute bottom-4 left-4 right-4 z-20 flex items-end justify-between gap-2 md:bottom-5 md:left-5 md:right-5">
                <span className="rounded-full bg-primary px-4 py-2 text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-primary-foreground shadow-[0_20px_44px_-26px_rgba(16,112,58,0.42)]">
                  {getCategoryLabel(product.category)}
                </span>
                <span className="rounded-full border border-white/80 bg-white/92 px-3 py-1.5 text-[0.75rem] font-medium text-neutral-600 shadow-[0_18px_36px_-24px_rgba(0,0,0,0.18)] backdrop-blur-sm">
                  {product.presentation}
                </span>
              </div>
            </div>

            <div className="page-fade-up page-fade-up-delay-2 rounded-[30px] border border-stone-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,244,237,0.96))] p-6 shadow-[0_28px_70px_-42px_rgba(64,50,30,0.22)] lg:p-8">
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-primary/10 bg-primary/8 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-primary">
                  Producto INHALEX
                </span>
                {product.inStock ? (
                  <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[0.76rem] font-medium text-emerald-700">
                    Disponible
                  </span>
                ) : (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[0.76rem] font-medium text-amber-700">
                    Bajo pedido
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-serif font-bold text-foreground lg:text-4xl">
                {product.name}
              </h1>

              {typeof product.rating === "number" && (
                <div className="mt-4 flex items-center gap-2">
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
                    {product.rating} - {product.reviews ?? 0} resenas
                  </span>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-[0.8rem] font-medium text-foreground shadow-sm">
                  {product.presentation}
                </span>
                <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-[0.8rem] font-medium text-foreground shadow-sm">
                  {product.origin}
                </span>
              </div>

              <p className="mt-5 leading-8 text-muted-foreground">
                {product.longDescription || product.description}
              </p>

              <div className="mt-6 rounded-2xl border border-stone-200/80 bg-white/82 p-5 shadow-[0_18px_36px_-32px_rgba(64,50,30,0.2)]">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-foreground/80">
                  Beneficios clave
                </h2>
                <ul className="space-y-2">
                  {product.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                        <Check className="h-3 w-3 text-primary" />
                      </span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 rounded-2xl border border-stone-200/80 bg-white/85 p-5 shadow-[0_18px_36px_-32px_rgba(64,50,30,0.2)]">
                <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground/75">
                  Precio unitario
                </p>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold leading-none text-foreground">{formattedPrice}</span>
                  <span className="pb-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {product.currency}
                  </span>
                </div>
              </div>

              <ProductDetailPurchase product={product} />

              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  className="rounded-full border-stone-200/80 bg-white shadow-[0_12px_24px_-20px_rgba(64,50,30,0.2)]"
                  asChild
                >
                  <Link href="/">Volver al catalogo</Link>
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
