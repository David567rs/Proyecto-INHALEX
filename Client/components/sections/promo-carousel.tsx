"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Hand,
  Sparkles,
  Tag,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Slide {
  id: number
  image: string
  title: string
  eyebrow: string
  description: string
  icon: ReactNode
  highlights: string[]
  cta: string
  href: string
  gradient: string
  displayMode?: "background" | "feature-image"
  featureLabel?: string
  imageClassName?: string
  featurePanelClassName?: string
  featureInnerClassName?: string
}

const unifiedGradient = "from-emerald-900/94 via-emerald-800/88 to-green-700/82"

const slides: Slide[] = [
  {
    id: 1,
    image: "/images/modo-de-uso.png",
    title: "Modo de uso",
    eyebrow: "Aplicacion correcta",
    description: "La imagen queda al frente para mostrar el paso a paso con mayor claridad.",
    icon: <Hand className="h-4 w-4" />,
    highlights: [],
    cta: "Ver productos",
    href: "/productos",
    gradient: unifiedGradient,
    displayMode: "feature-image",
    featureLabel: "Guia visual",
    imageClassName: "object-contain object-center p-1 sm:p-1.5 scale-[1.04]",
  },
  {
    id: 2,
    image: "/images/fondo.jpg",
    title: "Promociones activas",
    eyebrow: "Precios especiales",
    description:
      "Agrupa tus compras y destaca las ofertas que quieres mostrar en la portada publica.",
    icon: <Tag className="h-4 w-4" />,
    highlights: ["1 x $60", "2 x $100", "5 x $200"],
    cta: "Ir al catalogo",
    href: "/productos",
    gradient: unifiedGradient,
  },
  {
    id: 3,
    image: "/images/Proximos-productos.png",
    title: "Proximos productos",
    eyebrow: "Muy pronto",
    description:
      "La imagen queda al frente para anticipar nuevas lineas sin perder la elegancia del hero.",
    icon: <Sparkles className="h-4 w-4" />,
    highlights: [],
    cta: "Conocer marca",
    href: "/nosotros",
    gradient: unifiedGradient,
    displayMode: "feature-image",
    featureLabel: "Vista previa",
    imageClassName: "object-contain object-center scale-[1.03]",
    featurePanelClassName: "h-[208px] bg-white/90 p-2 sm:h-[234px]",
    featureInnerClassName: "bg-white p-1",
  },
  {
    id: 4,
    image: "/images/fondo.jpg",
    title: "Talleres y cursos",
    eyebrow: "Aprende con nosotros",
    description:
      "Tambien puede funcionar para anunciar talleres, contenido educativo o eventos de la marca.",
    icon: <GraduationCap className="h-4 w-4" />,
    highlights: ["Bionegocios", "Marketing", "Emprendimiento"],
    cta: "Saber mas",
    href: "/nosotros",
    gradient: unifiedGradient,
  },
]

export function PromoCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [direction, setDirection] = useState<"left" | "right">("right")
  const [isTransitioning, setIsTransitioning] = useState(false)

  const nextSlide = useCallback(() => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setDirection("right")
    setCurrentSlide((prev) => (prev + 1) % slides.length)
    window.setTimeout(() => setIsTransitioning(false), 450)
  }, [isTransitioning])

  const prevSlide = useCallback(() => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setDirection("left")
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
    window.setTimeout(() => setIsTransitioning(false), 450)
  }, [isTransitioning])

  const goToSlide = (index: number) => {
    if (isTransitioning || index === currentSlide) return
    setIsTransitioning(true)
    setDirection(index > currentSlide ? "right" : "left")
    setCurrentSlide(index)
    window.setTimeout(() => setIsTransitioning(false), 450)
  }

  useEffect(() => {
    if (!isAutoPlaying) return

    const interval = window.setInterval(nextSlide, 5000)
    return () => window.clearInterval(interval)
  }, [isAutoPlaying, nextSlide])

  const slide = slides[currentSlide]

  return (
    <div
      className="group relative min-h-[360px] overflow-hidden rounded-[2rem] border border-white/30 bg-white/10 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.75)] backdrop-blur-sm sm:min-h-[420px]"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      <div className="absolute inset-0">
        {slides.map((item, index) => (
          <div
            key={item.id}
            className={cn(
              "absolute inset-0 transition-all duration-700 ease-out",
              index === currentSlide
                ? "translate-x-0 scale-100 opacity-100"
                : direction === "right"
                  ? "translate-x-4 scale-[1.03] opacity-0"
                  : "-translate-x-4 scale-[1.03] opacity-0",
            )}
          >
            {item.displayMode !== "feature-image" && (
              <Image
                src={item.image}
                alt={item.title}
                fill
                priority={index === 0}
                className={cn("object-cover object-center", item.imageClassName)}
              />
            )}
            <div className={cn("absolute inset-0 bg-gradient-to-br", item.gradient)} />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.18),transparent_32%)]" />
          </div>
        ))}
      </div>

      <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-white/8 backdrop-blur-[2px] lg:block" />

      <div className="relative z-10 flex h-full min-h-[360px] flex-col justify-between p-5 text-white sm:min-h-[420px] sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div className="relative h-9 w-28 sm:h-10 sm:w-32">
            <Image
              src="/images/logoletras.png"
              alt="INHALEX"
              fill
              className="object-contain brightness-0 invert"
            />
          </div>

          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/14 px-3 py-1.5 text-[11px] font-medium tracking-[0.18em] uppercase backdrop-blur-md transition-all duration-500",
              isTransitioning ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100",
            )}
          >
            {slide.icon}
            <span>{slide.eyebrow}</span>
          </div>
        </div>

        {slide.displayMode === "feature-image" ? (
          <div
            className={cn(
              "flex-1 py-2 transition-all duration-500",
              isTransitioning ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100",
            )}
          >
            <div className="mb-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/75">
                {slide.featureLabel ?? "Guia visual"}
              </p>
              <h3 className="font-serif text-3xl leading-tight text-balance sm:text-[2.35rem]">
                {slide.title}
              </h3>
            </div>

            <div
              className={cn(
                "relative h-[238px] overflow-hidden rounded-[1.8rem] border border-white/45 bg-white/88 p-2.5 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.55)] backdrop-blur-sm sm:h-[286px] sm:p-2",
                slide.featurePanelClassName,
              )}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(22,163,74,0.14),transparent_48%)]" />
              <div
                className={cn(
                  "relative h-full w-full overflow-hidden rounded-[1.35rem] bg-white",
                  slide.featureInnerClassName,
                )}
              >
                <Image
                  src={slide.image}
                  alt={slide.title}
                  fill
                  priority
                  className={cn("object-contain object-center", slide.imageClassName)}
                />
              </div>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "max-w-sm space-y-4 transition-all duration-500",
              isTransitioning ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100",
            )}
          >
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/75">
                Coleccion destacada
              </p>
              <h3 className="font-serif text-3xl leading-tight text-balance sm:text-[2.35rem]">
                {slide.title}
              </h3>
            </div>

            <p className="max-w-[30ch] text-sm leading-7 text-white/88 sm:text-[15px]">
              {slide.description}
            </p>

            {slide.highlights.length > 0 && (
              <div className="flex flex-wrap gap-2.5">
                {slide.highlights.map((highlight, index) => (
                  <span
                    key={highlight}
                    className={cn(
                      "rounded-full border border-white/25 bg-white/16 px-3 py-1.5 text-xs font-medium text-white/95 backdrop-blur-sm transition-all duration-300",
                      isTransitioning ? "scale-95 opacity-0" : "scale-100 opacity-100",
                    )}
                    style={{ transitionDelay: `${120 + index * 45}ms` }}
                  >
                    {highlight}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-4">
            <div className="flex gap-2">
              {slides.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goToSlide(index)}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    index === currentSlide
                      ? "w-8 bg-white"
                      : "w-2 bg-white/40 hover:bg-white/70",
                  )}
                  aria-label={`Ir a la tarjeta ${index + 1}`}
                />
              ))}
            </div>

            <p className="text-xs uppercase tracking-[0.24em] text-white/70">
              {String(currentSlide + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={prevSlide}
              className="h-11 w-11 rounded-full border border-white/25 bg-white/12 text-white hover:bg-white/22"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Anterior</span>
            </Button>

            <Button
              asChild
              size="lg"
              className="rounded-full bg-white text-slate-900 shadow-lg shadow-black/20 hover:bg-white/90"
            >
              <Link href={slide.href}>{slide.cta}</Link>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={nextSlide}
              className="h-11 w-11 rounded-full border border-white/25 bg-white/12 text-white hover:bg-white/22"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Siguiente</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-1 bg-white/15">
        <div
          key={currentSlide}
          className={cn(
            "h-full rounded-full bg-white/75",
            isAutoPlaying ? "transition-[width] duration-[5000ms] ease-linear" : "transition-[width] duration-300",
          )}
          style={{ width: isAutoPlaying ? "100%" : "0%" }}
        />
      </div>
    </div>
  )
}
