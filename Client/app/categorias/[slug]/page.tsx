import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight, ChevronLeft, Leaf, Sparkles, Star, Wind } from "lucide-react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { ProductDetailScrollReset } from "@/components/navigation/product-detail-scroll-reset"
import { Button } from "@/components/ui/button"
import { getLineaConfig, getLineaHref, LINEA_CONFIGS } from "@/lib/products/lineas"
import { resolveProductCollectionImage } from "@/lib/products/product-images"
import {
  getProductDisplayPrice,
  hasActiveProductOffer,
} from "@/lib/products/promotions"
import { fetchCatalogProductsServer } from "@/lib/products/products-server"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

interface LineaPageProps {
  params: Promise<{ slug: string }>
}

function formatDisplayText(value: string): string {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ")
}

function formatPrice(value: number, currency = "MXN"): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
  }).format(value)
}

function buildDescription(slug: string): string {
  const linea = getLineaConfig(slug)
  if (!linea) {
    return "No encontramos la l\u00ednea solicitada."
  }

  return `${linea.name}. ${linea.description}`.slice(0, 160)
}

export async function generateMetadata({
  params,
}: LineaPageProps): Promise<Metadata> {
  const { slug } = await params
  const linea = getLineaConfig(slug)

  if (!linea) {
    return {
      title: "L\u00ednea no encontrada | INHALEX",
      description: "No encontramos la l\u00ednea solicitada.",
    }
  }

  return {
    title: `${linea.name} | INHALEX`,
    description: buildDescription(slug),
    openGraph: {
      title: `${linea.name} | INHALEX`,
      description: buildDescription(slug),
      images: [linea.image],
      type: "website",
    },
  }
}

export default async function LineaPage({ params }: LineaPageProps) {
  const { slug } = await params
  const linea = getLineaConfig(slug)

  if (!linea) {
    notFound()
  }

  const allProducts = await fetchCatalogProductsServer()
  const lineProducts = allProducts
    .filter((product) => product.category === linea.id)
    .sort((left, right) => (left.sortOrder ?? 999) - (right.sortOrder ?? 999))

  const totalReviews = lineProducts.reduce((sum, product) => sum + (product.reviews ?? 0), 0)
  const ratings = lineProducts
    .map((product) => product.rating)
    .filter((rating): rating is number => typeof rating === "number")
  const averageRating =
    ratings.length > 0
      ? (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1)
      : null

  const aromaticNotes = Array.from(
    new Set(
      lineProducts.flatMap((product) =>
        (product.aromas ?? []).map((note) => formatDisplayText(note)),
      ),
    ),
  )

  const otherLineas = LINEA_CONFIGS.filter((item) => item.id !== linea.id)

  return (
    <div className="min-h-screen flex flex-col bg-[linear-gradient(180deg,rgba(248,250,248,0.98),rgba(255,255,255,1)_24%,rgba(249,251,249,0.96))]">
      <ProductDetailScrollReset routeKey={slug} />
      <Header />

      <main className="flex-1 pt-24 lg:pt-28">
        <section className="relative overflow-hidden pb-14 pt-6 lg:pb-24">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(248,250,248,0.96),rgba(255,255,255,0.98)_58%,rgba(249,251,249,0.94))]" />
          <div className={cn("absolute inset-0 bg-gradient-to-br opacity-95", linea.heroGradient)} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.92),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.74),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.18),transparent_48%)]" />
          <div className={cn("absolute -left-6 top-24 h-56 w-56 rounded-full opacity-90 blur-3xl", linea.heroGlow)} />
          <div className="absolute right-[8%] top-16 h-64 w-64 rounded-full bg-white/75 blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.82))]" />

          <div className="container relative z-10 mx-auto px-4">
            <div className="page-fade-up mb-5 flex flex-wrap items-center gap-2 text-sm text-foreground/56">
              <Link href="/" className="transition-colors hover:text-foreground">
                Inicio
              </Link>
              <span>/</span>
              <span className="font-medium text-foreground/78">Líneas</span>
              <span>/</span>
              <span className="font-medium text-foreground">{linea.name}</span>
            </div>

            <div className="page-fade-up page-fade-up-delay-1 rounded-[2.7rem] border border-white/70 bg-white/38 p-3 shadow-[0_42px_110px_-66px_rgba(15,23,42,0.28)] backdrop-blur-2xl lg:p-5">
              <div className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
                <div
                  className={cn(
                    "rounded-[2.1rem] border p-6 shadow-[0_28px_70px_-52px_rgba(15,23,42,0.16)] backdrop-blur-xl lg:p-8",
                    linea.accentSurface,
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] shadow-[0_12px_28px_-22px_rgba(15,23,42,0.14)]",
                      linea.badgeSurface,
                    )}
                  >
                    {linea.label}
                  </span>

                  <h1 className="public-display-heading mt-5 max-w-lg text-4xl leading-[0.94] text-foreground sm:text-5xl lg:text-[4rem]">
                    {linea.name}
                  </h1>

                  <p className="mt-5 max-w-xl text-lg leading-8 text-foreground/78">
                    {linea.headline}
                  </p>

                  <p className="mt-4 max-w-xl text-base leading-8 text-foreground/66">
                    {linea.description}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-2.5">
                    {linea.highlights.map((highlight) => (
                      <span
                        key={highlight}
                        className={cn("rounded-full border px-4 py-2 text-sm font-medium", linea.chipSurface)}
                      >
                        {highlight}
                      </span>
                    ))}
                  </div>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <Button
                      asChild
                      className="rounded-full px-6 shadow-[0_18px_38px_-24px_rgba(16,112,58,0.28)]"
                    >
                      <Link href="#aromas">
                        Ver aromas
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="rounded-full border-border/60 bg-white/74 px-6 text-foreground shadow-[0_16px_34px_-26px_rgba(15,23,42,0.14)] hover:bg-white"
                    >
                      <Link href="/productos">
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Volver al catálogo
                      </Link>
                    </Button>
                  </div>

                  <div className="mt-8 border-t border-foreground/8 pt-6">
                    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-foreground/55">
                      <Sparkles className="h-4 w-4" />
                      Ritual sugerido
                    </div>
                    <p className="mt-3 max-w-lg text-base leading-8 text-foreground/74">{linea.ritual}</p>
                  </div>
                </div>

                <div className="relative flex justify-center lg:justify-end lg:pr-1">
                  <div className={cn("absolute inset-x-[10%] top-10 h-48 rounded-full opacity-75 blur-3xl", linea.heroGlow)} />
                  <div className="relative w-full max-w-[25rem] sm:max-w-[32rem] lg:max-w-[39rem] xl:max-w-[43rem]">
                    <div
                      className={cn(
                        "rounded-[2.45rem] border shadow-[0_34px_90px_-58px_rgba(15,23,42,0.28)] backdrop-blur-xl",
                        linea.frameSurface,
                        linea.heroImagePadding,
                      )}
                    >
                      <div
                        className={cn(
                          "relative overflow-hidden rounded-[2.1rem] border border-white/75 bg-white shadow-[0_24px_60px_-42px_rgba(15,23,42,0.14)]",
                          linea.heroImageAspect,
                        )}
                      >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.34),transparent_46%)]" />
                        <div className="absolute inset-x-10 bottom-5 h-12 rounded-full bg-[radial-gradient(circle,rgba(15,23,42,0.12),transparent_72%)] blur-xl" />
                        <Image
                          src={linea.image}
                          alt={linea.name}
                          fill
                          priority
                          className="object-cover"
                          style={{ objectPosition: linea.heroImagePosition }}
                          sizes="(max-width: 1024px) 100vw, 48vw"
                        />
                        <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/45" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div
                  className={cn(
                    "page-fade-up page-fade-up-delay-2 rounded-[1.55rem] border px-5 py-4 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5",
                    linea.statSurface,
                  )}
                >
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-foreground/48">
                    Aromas
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-foreground">{lineProducts.length}</p>
                  <p className="mt-1 text-sm text-foreground/62">Productos activos en esta línea.</p>
                </div>

                <div
                  className={cn(
                    "page-fade-up page-fade-up-delay-3 rounded-[1.55rem] border px-5 py-4 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5",
                    linea.statSurface,
                  )}
                >
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-foreground/48">
                    Notas aromáticas
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-foreground">{aromaticNotes.length}</p>
                  <p className="mt-1 text-sm text-foreground/62">Perfil detectado en el catálogo.</p>
                </div>

                <div
                  className={cn(
                    "page-fade-up page-fade-up-delay-4 rounded-[1.55rem] border px-5 py-4 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5",
                    linea.statSurface,
                  )}
                >
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-foreground/48">
                    Valoración
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-foreground">{averageRating ?? "Nuevo"}</p>
                  <p className="mt-1 text-sm text-foreground/62">
                    {totalReviews > 0 ? `${totalReviews} reseñas acumuladas.` : "Línea lista para descubrir."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="page-fade-up page-fade-up-delay-2 container mx-auto px-4 py-6 lg:py-8">
          <div className="grid gap-6 lg:grid-cols-[0.84fr_1.16fr]">
            <div
              className={cn(
                "rounded-[2rem] border p-6 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.16)] backdrop-blur-sm",
                linea.accentSurface,
              )}
            >
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-foreground/75">
                <Wind className="h-4 w-4 text-primary" />
                Perfil de la línea
              </div>
              <p className="mt-4 text-lg leading-8 text-foreground/80">{linea.ritual}</p>

              <div className="mt-6 flex flex-wrap gap-2.5">
                {aromaticNotes.slice(0, 12).map((note) => (
                  <span
                    key={note}
                    className={cn("rounded-full border px-3.5 py-2 text-sm font-medium", linea.chipSurface)}
                  >
                    {note}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-border/60 bg-white/88 p-6 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.14)] backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-foreground/70">
                <Leaf className="h-4 w-4 text-primary" />
                Aromas disponibles
              </div>

              {lineProducts.length === 0 ? (
                <p className="mt-5 text-sm leading-7 text-muted-foreground">
                  Los aromas activos se mostrarán aquí en cuanto esta línea tenga productos publicados.
                </p>
              ) : (
                <div className="mt-5 flex flex-wrap gap-3">
                  {lineProducts.map((product) => (
                    <Link
                      key={product.id}
                      href={`/productos/${product.slug ?? product.id}`}
                      className={cn(
                        "rounded-full border px-4 py-2.5 text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm",
                        linea.badgeSurface,
                      )}
                    >
                      {product.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="aromas" className="container mx-auto px-4 py-10 lg:py-16">
          <div className="mb-8 max-w-2xl">
            <span className="inline-flex rounded-full border border-primary/10 bg-primary/8 px-4 py-1.5 text-sm font-medium text-primary">
              Colección de aromas
            </span>
            <h2 className="mt-4 text-3xl font-serif font-bold text-foreground sm:text-4xl">
              Cada línea vive en sus aromas
            </h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              Estos son los productos que forman {linea.name}. Cada uno conserva su personalidad,
              notas arom\u00e1ticas y beneficios propios.
            </p>
          </div>

          {lineProducts.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-border/70 bg-white/80 p-10 text-center shadow-sm">
              <p className="text-lg font-semibold text-foreground">
                A\u00fan no hay aromas activos en esta l\u00ednea.
              </p>
              <p className="mt-3 text-muted-foreground">
                La estructura ya est\u00e1 lista y podemos llenar esta vista en cuanto se publiquen productos.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {lineProducts.map((product, index) => (
                <article
                  key={product.id}
                  className="page-fade-up group overflow-hidden rounded-[2rem] border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(250,251,250,0.97))] shadow-[0_22px_56px_-42px_rgba(15,23,42,0.14)] transition-all duration-500 hover:-translate-y-1.5 hover:border-primary/18 hover:shadow-[0_34px_84px_-44px_rgba(15,23,42,0.18)]"
                  style={{ animationDelay: `${120 + index * 70}ms` }}
                >
                  <div className="relative p-3.5 sm:p-4">
                    <div className={cn("absolute inset-x-10 top-9 h-24 rounded-full opacity-65 blur-3xl", linea.heroGlow)} />
                    <div className="rounded-[1.7rem] border border-white/70 bg-white/74 p-[1px] shadow-[0_20px_48px_-34px_rgba(15,23,42,0.14)]">
                      <div className="relative aspect-square overflow-hidden rounded-[1.6rem] border border-border/60 bg-[radial-gradient(circle_at_top,rgba(255,255,255,1),rgba(250,251,250,0.96)_56%,rgba(244,246,244,0.98))]">
                        <Image
                          src={resolveProductCollectionImage(product)}
                          alt={product.name}
                          fill
                          className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.02]"
                          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),transparent_22%,transparent_72%,rgba(15,23,42,0.05))]" />
                        <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/45" />
                        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                          <span className="rounded-full border border-primary/10 bg-white/94 px-3.5 py-1.5 text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-primary shadow-[0_12px_24px_-18px_rgba(15,23,42,0.16)] backdrop-blur-md">
                            INHALEX
                          </span>
                          <span
                            className={cn(
                              "rounded-full border px-3.5 py-1.5 text-[0.64rem] font-semibold uppercase tracking-[0.22em] shadow-[0_12px_24px_-18px_rgba(15,23,42,0.14)] backdrop-blur-md",
                              linea.badgeSurface,
                            )}
                          >
                            {linea.name}
                          </span>
                          {hasActiveProductOffer(product) ? (
                            <span className="rounded-full border border-amber-100 bg-amber-50/94 px-3.5 py-1.5 text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-amber-700 shadow-[0_12px_24px_-18px_rgba(217,119,6,0.18)] backdrop-blur-md">
                              Oferta
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 pb-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-semibold text-foreground">{product.name}</h3>
                        <p className="mt-1 text-sm font-medium text-muted-foreground">
                          {product.presentation} {" | "} {product.origin}
                        </p>
                      </div>
                      <div className="text-right">
                        {typeof product.rating === "number" && (
                          <div className="inline-flex items-center gap-1 rounded-full border border-amber-100/90 bg-amber-50/92 px-2.5 py-1 text-xs font-semibold text-amber-700 shadow-[0_10px_22px_-18px_rgba(217,119,6,0.28)]">
                            <Star className="h-3.5 w-3.5 fill-current" />
                            {product.rating}
                          </div>
                        )}
                        {hasActiveProductOffer(product) ? (
                          <p className="mt-3 text-sm font-medium text-muted-foreground line-through">
                            {formatPrice(product.price, product.currency || "MXN")}
                          </p>
                        ) : null}
                        <p className="mt-3 text-xl font-semibold text-foreground">
                          {formatPrice(
                            getProductDisplayPrice(product),
                            product.currency || "MXN",
                          )}
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 text-[0.98rem] leading-7 text-muted-foreground">
                      {product.description}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {(product.aromas ?? []).slice(0, 4).map((note) => (
                        <span
                          key={`${product.id}-${note}`}
                          className={cn("rounded-full border px-3 py-1.5 text-xs font-medium", linea.chipSurface)}
                        >
                          {formatDisplayText(note)}
                        </span>
                      ))}
                    </div>

                    <div className="mt-5 space-y-2">
                      {product.benefits.slice(0, 3).map((benefit) => (
                        <div key={`${product.id}-${benefit}`} className="flex items-start gap-2 text-sm text-foreground/78">
                          <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary/65" />
                          <span>{benefit}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-3 border-t border-border/70 pt-4">
                      <span className="text-sm text-muted-foreground">
                        {product.inStock ? "Disponible ahora" : "Disponible bajo pedido"}
                      </span>
                      <Button asChild className="rounded-full px-5 shadow-[0_18px_32px_-24px_rgba(16,112,58,0.4)]">
                        <Link
                          href={`/productos/${product.slug ?? product.id}`}
                          scroll
                        >
                          Ver aroma
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {otherLineas.length > 0 && (
          <section
            aria-labelledby="otras-lineas-title"
            className="page-fade-up page-fade-up-delay-3 relative overflow-hidden border-y border-emerald-100/60 bg-[linear-gradient(145deg,rgba(247,251,248,0.96),rgba(255,255,255,1)_48%,rgba(250,248,240,0.84))] py-16 lg:py-24"
          >
            <div
              className="pointer-events-none absolute -left-24 top-8 h-72 w-72 rounded-full bg-emerald-100/55 blur-3xl"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-lime-100/45 blur-3xl"
              aria-hidden="true"
            />

            <div className="container relative mx-auto px-4">
              <div className="mb-10 flex flex-col gap-6 lg:mb-12 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary shadow-[0_14px_32px_-24px_rgba(15,112,58,0.3)]">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    Explora otros rituales
                  </span>
                  <h2
                    id="otras-lineas-title"
                    className="mt-5 max-w-3xl text-3xl font-serif font-bold leading-tight text-foreground sm:text-4xl"
                  >
                    Continúa tu recorrido por INHALEX
                  </h2>
                  <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                    Cada línea acompaña un momento distinto de tu día. Descubre
                    la experiencia aromática que mejor conecta contigo.
                  </p>
                </div>

                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-100 bg-white/75 px-4 py-2.5 text-sm font-medium text-emerald-900 shadow-[0_16px_34px_-26px_rgba(15,112,58,0.3)]">
                  <Leaf className="h-4 w-4 text-primary" aria-hidden="true" />
                  {otherLineas.length} líneas por descubrir
                </span>
              </div>

              <ul
                className="grid list-none gap-6 p-0 lg:grid-cols-2"
                role="list"
              >
                {otherLineas.map((item, index) => {
                  const productCount = allProducts.filter(
                    (product) => product.category === item.id,
                  ).length

                  return (
                    <li key={item.id} className="h-full">
                      <Link
                        href={getLineaHref(item.id)}
                        className="page-fade-up public-card-lift group grid h-full overflow-hidden rounded-[2rem] border border-white/90 bg-white/94 shadow-[0_28px_70px_-48px_rgba(15,52,31,0.32)] transition-all duration-500 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_38px_82px_-48px_rgba(15,84,43,0.38)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-4 motion-reduce:transform-none motion-reduce:transition-none sm:grid-cols-[minmax(12rem,0.82fr)_minmax(0,1.18fr)]"
                        style={{ animationDelay: `${180 + index * 70}ms` }}
                      >
                        <div
                          className={cn(
                            "relative m-3 min-h-[16.5rem] overflow-hidden rounded-[1.55rem] bg-gradient-to-br sm:mr-0 sm:min-h-full",
                            item.heroGradient,
                          )}
                        >
                          <Image
                            src={item.image}
                            alt=""
                            fill
                            className="scale-125 object-cover opacity-[0.16] blur-xl transition-transform duration-700 group-hover:scale-[1.32] motion-reduce:transition-none"
                            sizes="(max-width: 640px) 100vw, 22vw"
                            aria-hidden="true"
                          />
                          <div
                            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.74),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.5))]"
                            aria-hidden="true"
                          />
                          <div
                            className={cn(
                              "absolute left-1/2 top-1/2 h-[82%] w-[74%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-55 blur-3xl transition-opacity duration-500 group-hover:opacity-80",
                              item.heroGlow,
                            )}
                            aria-hidden="true"
                          />

                          <span className="absolute left-4 top-4 z-20 inline-flex rounded-full border border-white/80 bg-white/82 px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-emerald-900 shadow-sm backdrop-blur-md">
                            Línea INHALEX
                          </span>
                          <span
                            className="absolute right-4 top-4 z-20 font-serif text-3xl font-bold text-foreground/12"
                            aria-hidden="true"
                          >
                            {String(index + 1).padStart(2, "0")}
                          </span>

                          <div className="absolute left-1/2 top-1/2 z-10 h-[78%] aspect-[2/3] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[1.35rem] border border-white/85 bg-white/24 shadow-[0_26px_52px_-26px_rgba(15,23,42,0.48)] transition-all duration-700 group-hover:-translate-y-[51%] group-hover:scale-[1.035] group-hover:shadow-[0_32px_64px_-26px_rgba(15,84,43,0.48)] motion-reduce:transform-none motion-reduce:transition-none">
                            <Image
                              src={item.image}
                              alt=""
                              fill
                              className="object-cover"
                              style={{ objectPosition: item.heroImagePosition }}
                              sizes="(max-width: 640px) 42vw, 15vw"
                              aria-hidden="true"
                            />
                          </div>
                        </div>

                        <div className="flex min-h-full flex-col p-6 sm:p-7">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span
                              className={cn(
                                "inline-flex rounded-full border px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em]",
                                item.badgeSurface,
                              )}
                            >
                              {item.label}
                            </span>
                            <span className="text-xs font-medium text-muted-foreground">
                              {productCount}{" "}
                              {productCount === 1 ? "aroma" : "aromas"}
                            </span>
                          </div>

                          <h3 className="mt-5 text-2xl font-semibold leading-tight text-foreground sm:text-[1.7rem]">
                            {item.name}
                          </h3>
                          <p className="mt-3 line-clamp-3 text-sm leading-7 text-muted-foreground sm:text-[0.95rem]">
                            {item.description}
                          </p>

                          <div className="mt-5 flex flex-wrap gap-2">
                            {item.highlights.slice(0, 2).map((highlight) => (
                              <span
                                key={highlight}
                                className={cn(
                                  "rounded-full border px-3 py-1.5 text-xs font-medium",
                                  item.chipSurface,
                                )}
                              >
                                {highlight}
                              </span>
                            ))}
                          </div>

                          <div className="mt-auto flex items-center justify-between border-t border-emerald-100/70 pt-6">
                            <span className="text-sm font-semibold text-primary">
                              Explorar línea
                              <span className="sr-only"> {item.name}</span>
                            </span>
                            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/10 bg-primary/8 text-primary transition-all duration-300 group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground group-focus-visible:border-primary group-focus-visible:bg-primary group-focus-visible:text-primary-foreground motion-reduce:transition-none">
                              <ArrowRight
                                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transition-none"
                                aria-hidden="true"
                              />
                            </span>
                          </div>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  )
}
