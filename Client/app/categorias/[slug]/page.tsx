import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight, ChevronLeft, Leaf, Sparkles, Star, Wind } from "lucide-react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { getLineaConfig, getLineaHref, LINEA_CONFIGS } from "@/lib/products/lineas"
import { resolveProductCollectionImage } from "@/lib/products/product-images"
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

function buildDescription(slug: string): string {
  const linea = getLineaConfig(slug)
  if (!linea) {
    return "No encontramos la linea solicitada."
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
      title: "Linea no encontrada | INHALEX",
      description: "No encontramos la linea solicitada.",
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
    <div className="min-h-screen flex flex-col bg-[linear-gradient(180deg,rgba(247,250,247,0.98),rgba(255,255,255,1))]">
      <Header />

      <main className="flex-1 pt-24 lg:pt-28">
        <section className="relative overflow-hidden pb-14 pt-6 lg:pb-24">
          <div className={cn("absolute inset-0 bg-gradient-to-br", linea.heroGradient)} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_46%)]" />
          <div className={cn("absolute left-[6%] top-28 h-44 w-44 rounded-full blur-3xl", linea.heroGlow)} />
          <div className="absolute right-[10%] top-16 h-60 w-60 rounded-full bg-white/10 blur-3xl" />

          <div className="container relative z-10 mx-auto px-4">
            <div className="page-fade-up mb-5 flex flex-wrap items-center gap-2 text-sm text-white/78">
              <Link href="/" className="transition-colors hover:text-white">
                Inicio
              </Link>
              <span>/</span>
              <span className="text-white">Lineas</span>
              <span>/</span>
              <span className="text-white">{linea.name}</span>
            </div>

            <div className="page-fade-up page-fade-up-delay-1 rounded-[2.5rem] border border-white/14 bg-white/8 p-3 shadow-[0_42px_110px_-66px_rgba(15,23,42,0.78)] backdrop-blur-xl lg:p-5">
              <div className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
                <div className="rounded-[2rem] border border-white/12 bg-black/10 p-6 shadow-[0_28px_70px_-50px_rgba(15,23,42,0.58)] backdrop-blur-md lg:p-8">
                  <span className="inline-flex rounded-full border border-white/18 bg-white/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/92">
                    {linea.label}
                  </span>

                  <h1 className="mt-5 max-w-lg font-serif text-4xl font-bold leading-[0.94] text-white sm:text-5xl lg:text-[4rem]">
                    {linea.name}
                  </h1>

                  <p className="mt-5 max-w-xl text-lg leading-8 text-white/84">
                    {linea.headline}
                  </p>

                  <p className="mt-4 max-w-xl text-base leading-8 text-white/70">
                    {linea.description}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-2.5">
                    {linea.highlights.map((highlight) => (
                      <span
                        key={highlight}
                        className="rounded-full border border-white/16 bg-white/10 px-4 py-2 text-sm font-medium text-white/90"
                      >
                        {highlight}
                      </span>
                    ))}
                  </div>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <Button
                      asChild
                      className="rounded-full bg-white px-6 text-emerald-950 shadow-[0_18px_38px_-24px_rgba(15,23,42,0.42)] hover:bg-white/95"
                    >
                      <Link href="#aromas">
                        Ver aromas
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="rounded-full border-white/24 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white"
                    >
                      <Link href="/">
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Volver al catalogo
                      </Link>
                    </Button>
                  </div>

                  <div className="mt-8 border-t border-white/12 pt-6">
                    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-white/68">
                      <Sparkles className="h-4 w-4" />
                      Ritual sugerido
                    </div>
                    <p className="mt-3 max-w-lg text-base leading-8 text-white/82">{linea.ritual}</p>
                  </div>
                </div>

                <div className="relative flex justify-center lg:justify-end lg:pr-1">
                  <div className={cn("absolute inset-x-[10%] top-10 h-48 rounded-full blur-3xl", linea.heroGlow)} />
                  <div className="relative w-full max-w-[25rem] sm:max-w-[32rem] lg:max-w-[39rem] xl:max-w-[43rem]">
                    <div className="overflow-hidden rounded-[2.45rem] border border-white/16 bg-white/6 p-[1px] shadow-[0_34px_90px_-54px_rgba(15,23,42,0.72)]">
                      <div className={cn("relative overflow-hidden rounded-[2.35rem]", linea.heroImageAspect)}>
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_44%)]" />
                        <div className="absolute inset-x-10 bottom-5 h-12 rounded-full bg-[radial-gradient(circle,rgba(15,23,42,0.18),transparent_72%)] blur-xl" />
                        <Image
                          src={linea.image}
                          alt={linea.name}
                          fill
                          priority
                          className="object-cover"
                          style={{ objectPosition: linea.heroImagePosition }}
                          sizes="(max-width: 1024px) 100vw, 48vw"
                        />
                        <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/8" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="page-fade-up page-fade-up-delay-2 rounded-[1.5rem] border border-white/12 bg-white/10 px-5 py-4 text-white shadow-[0_18px_40px_-32px_rgba(15,23,42,0.52)]">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/66">
                    Aromas
                  </p>
                  <p className="mt-2 text-3xl font-semibold">{lineProducts.length}</p>
                  <p className="mt-1 text-sm text-white/70">Productos activos en esta linea.</p>
                </div>
                <div className="page-fade-up page-fade-up-delay-3 rounded-[1.5rem] border border-white/12 bg-white/10 px-5 py-4 text-white shadow-[0_18px_40px_-32px_rgba(15,23,42,0.52)]">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/66">
                    Notas aromaticas
                  </p>
                  <p className="mt-2 text-3xl font-semibold">{aromaticNotes.length}</p>
                  <p className="mt-1 text-sm text-white/70">Perfil detectado en el catalogo.</p>
                </div>
                <div className="page-fade-up page-fade-up-delay-4 rounded-[1.5rem] border border-white/12 bg-white/10 px-5 py-4 text-white shadow-[0_18px_40px_-32px_rgba(15,23,42,0.52)]">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/66">
                    Valoracion
                  </p>
                  <p className="mt-2 text-3xl font-semibold">{averageRating ?? "Nuevo"}</p>
                  <p className="mt-1 text-sm text-white/70">
                    {totalReviews > 0 ? `${totalReviews} resenas acumuladas.` : "Linea lista para descubrir."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="page-fade-up page-fade-up-delay-2 container mx-auto px-4 py-6 lg:py-8">
          <div className="grid gap-6 lg:grid-cols-[0.84fr_1.16fr]">
            <div className={cn("rounded-[2rem] border p-6 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.25)]", linea.accentSurface)}>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-foreground/75">
                <Wind className="h-4 w-4 text-primary" />
                Perfil de la linea
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

            <div className="rounded-[2rem] border border-emerald-100/70 bg-white p-6 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.18)]">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-foreground/70">
                <Leaf className="h-4 w-4 text-primary" />
                Aromas disponibles
              </div>
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
            </div>
          </div>
        </section>

        <section id="aromas" className="container mx-auto px-4 py-10 lg:py-16">
          <div className="mb-8 max-w-2xl">
            <span className="inline-flex rounded-full border border-primary/10 bg-primary/8 px-4 py-1.5 text-sm font-medium text-primary">
              Coleccion de aromas
            </span>
            <h2 className="mt-4 text-3xl font-serif font-bold text-foreground sm:text-4xl">
              Cada linea vive en sus aromas
            </h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              Estos son los productos que forman {linea.name}. Cada uno conserva su personalidad, notas aromaticas y beneficios propios.
            </p>
          </div>

          {lineProducts.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-border/70 bg-white/80 p-10 text-center shadow-sm">
              <p className="text-lg font-semibold text-foreground">Aun no hay aromas activos en esta linea.</p>
              <p className="mt-3 text-muted-foreground">
                La estructura ya esta lista y podemos llenar esta vista en cuanto se publiquen productos.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {lineProducts.map((product, index) => (
                <article
                  key={product.id}
                  className="page-fade-up group overflow-hidden rounded-[2rem] border border-emerald-100/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,252,248,0.97))] shadow-[0_22px_56px_-42px_rgba(15,84,43,0.2)] transition-all duration-500 hover:-translate-y-1.5 hover:border-primary/18 hover:shadow-[0_34px_84px_-44px_rgba(15,84,43,0.24)]"
                  style={{ animationDelay: `${120 + index * 70}ms` }}
                >
                  <div className="relative p-3.5 sm:p-4">
                    <div className={cn("absolute inset-x-10 top-9 h-24 rounded-full opacity-80 blur-3xl", linea.heroGlow)} />
                    <div className="rounded-[1.7rem] border border-white/70 bg-white/74 p-[1px] shadow-[0_20px_48px_-34px_rgba(15,84,43,0.18)]">
                      <div className="relative aspect-square overflow-hidden rounded-[1.6rem] border border-emerald-100/70 bg-[radial-gradient(circle_at_top,rgba(255,255,255,1),rgba(247,250,247,0.96)_56%,rgba(238,246,240,0.98))]">
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
                          <span className="rounded-full border border-white/85 bg-white/94 px-3.5 py-1.5 text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-emerald-700 shadow-[0_12px_24px_-18px_rgba(15,84,43,0.24)] backdrop-blur-md">
                            INHALEX
                          </span>
                          <span
                            className={cn(
                              "rounded-full border px-3.5 py-1.5 text-[0.64rem] font-semibold uppercase tracking-[0.22em] shadow-[0_12px_24px_-18px_rgba(15,84,43,0.18)] backdrop-blur-md",
                              linea.badgeSurface,
                            )}
                          >
                            {linea.name}
                          </span>
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
                        <p className="mt-3 text-xl font-semibold text-foreground">
                          {new Intl.NumberFormat("es-MX", {
                            style: "currency",
                            currency: product.currency || "MXN",
                          }).format(product.price)}
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

                    <div className="mt-6 flex items-center justify-between gap-3 border-t border-emerald-100/80 pt-4">
                      <span className="text-sm text-muted-foreground">
                        {product.inStock ? "Disponible ahora" : "Disponible bajo pedido"}
                      </span>
                      <Button asChild className="rounded-full px-5 shadow-[0_18px_32px_-24px_rgba(16,112,58,0.4)]">
                        <Link href={`/productos/${product.slug ?? product.id}`}>
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

        <section className="page-fade-up page-fade-up-delay-3 container mx-auto px-4 pb-16 lg:pb-24">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <span className="inline-flex rounded-full border border-primary/10 bg-primary/8 px-4 py-1.5 text-sm font-medium text-primary">
                Otras lineas
              </span>
              <h2 className="mt-4 text-3xl font-serif font-bold text-foreground">
                Sigue explorando INHALEX
              </h2>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {otherLineas.map((item, index) => (
              <Link
                key={item.id}
                href={getLineaHref(item.id)}
                className="page-fade-up group overflow-hidden rounded-[1.8rem] border border-emerald-100/70 bg-white shadow-[0_18px_50px_-40px_rgba(15,84,43,0.2)] transition-all duration-500 hover:-translate-y-1.5 hover:border-primary/20 hover:shadow-[0_30px_60px_-42px_rgba(15,84,43,0.28)]"
                style={{ animationDelay: `${180 + index * 80}ms` }}
              >
                <div className={cn("relative aspect-[4/3] overflow-hidden bg-gradient-to-br", item.heroGradient)}>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_38%)]" />
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-contain p-4 transition-transform duration-700 group-hover:scale-[1.04]"
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
                  />
                </div>
                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/70">
                    {item.label}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-foreground">{item.name}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.description}</p>
                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary">
                    Abrir linea
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
