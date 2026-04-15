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
  surfaceTone: string
  ambientTone: string
  badgeTone: string
  chipTone: string
  displayMode?: "background" | "feature-image"
  featureLabel?: string
  imageClassName?: string
  visualPanelClassName?: string
  visualInnerClassName?: string
}

const slides: Slide[] = [
  {
    id: 1,
    image: "/images/modo-de-uso.png",
    title: "Modo de uso",
    eyebrow: "Aplicacion correcta",
    description:
      "Aplica en tus manos, frota con suavidad e inhala profundamente para acompanar tu respiracion en cualquier momento del dia.",
    icon: <Hand className="h-4 w-4" />,
    highlights: ["Aplica", "Frota", "Inhala"],
    cta: "Ver productos",
    href: "/productos",
    surfaceTone: "from-white/98 via-emerald-50/62 to-white/92",
    ambientTone:
      "bg-[radial-gradient(circle_at_top_left,rgba(16,112,58,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.08),transparent_30%)]",
    badgeTone: "border-primary/12 bg-white/84 text-primary",
    chipTone: "border-white/70 bg-white/84 text-foreground/80",
    displayMode: "feature-image",
    featureLabel: "Guia esencial",
    imageClassName: "object-contain object-center p-1 sm:p-1.5 scale-[1.01]",
    visualPanelClassName:
      "bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(235,250,243,0.88))]",
    visualInnerClassName: "bg-white/98",
  },
  {
    id: 2,
    image: "/images/fondo.jpg",
    title: "Promociones activas",
    eyebrow: "Precios especiales",
    description:
      "Aprovecha combinaciones pensadas para que tus aromas favoritos esten siempre a la mano y listos para acompanarte.",
    icon: <Tag className="h-4 w-4" />,
    highlights: ["1 por $60", "2 por $100", "5 por $200"],
    cta: "Ir al catalogo",
    href: "/productos",
    surfaceTone: "from-white/98 via-white/95 to-rose-50/28",
    ambientTone:
      "bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.11),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(16,112,58,0.09),transparent_32%)]",
    badgeTone: "border-primary/10 bg-white/84 text-primary",
    chipTone: "border-white/70 bg-white/90 text-foreground/82",
    visualPanelClassName:
      "bg-[linear-gradient(150deg,rgba(255,255,255,0.96),rgba(255,247,237,0.82))]",
    visualInnerClassName: "bg-white/96",
  },
  {
    id: 3,
    image: "/images/Proximos-productos.png",
    title: "Proximos productos",
    eyebrow: "Muy pronto",
    description:
      "Descubre la siguiente seleccion de esencias que estamos preparando para ampliar tu ritual de bienestar natural.",
    icon: <Sparkles className="h-4 w-4" />,
    highlights: ["Nuevas lineas", "Nuevas esencias"],
    cta: "Conocer marca",
    href: "/nosotros",
    surfaceTone: "from-white/98 via-sky-50/40 to-emerald-50/36",
    ambientTone:
      "bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.1),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(16,112,58,0.09),transparent_30%)]",
    badgeTone: "border-primary/10 bg-white/82 text-primary",
    chipTone: "border-white/70 bg-white/86 text-foreground/82",
    displayMode: "feature-image",
    featureLabel: "Vista previa",
    imageClassName: "object-contain object-center p-2 sm:p-3 scale-[1.01]",
    visualPanelClassName:
      "bg-[linear-gradient(140deg,rgba(255,255,255,0.96),rgba(240,249,255,0.86))]",
    visualInnerClassName: "bg-white/98",
  },
  {
    id: 4,
    image: "/images/fondo.jpg",
    title: "Talleres y cursos",
    eyebrow: "Aprende con nosotros",
    description:
      "Conecta con experiencias pensadas para quienes quieren conocer mejor el bienestar natural y su aplicacion diaria.",
    icon: <GraduationCap className="h-4 w-4" />,
    highlights: ["Bionegocios", "Marketing", "Emprendimiento"],
    cta: "Saber mas",
    href: "/nosotros",
    surfaceTone: "from-white/98 via-emerald-50/56 to-white/94",
    ambientTone:
      "bg-[radial-gradient(circle_at_top_left,rgba(16,112,58,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.08),transparent_30%)]",
    badgeTone: "border-primary/10 bg-white/84 text-primary",
    chipTone: "border-white/70 bg-white/90 text-foreground/82",
    visualPanelClassName:
      "bg-[linear-gradient(150deg,rgba(255,255,255,0.96),rgba(236,253,245,0.82))]",
    visualInnerClassName: "bg-white/96",
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
    window.setTimeout(() => setIsTransitioning(false), 520)
  }, [isTransitioning])

  const prevSlide = useCallback(() => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setDirection("left")
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
    window.setTimeout(() => setIsTransitioning(false), 520)
  }, [isTransitioning])

  const goToSlide = (index: number) => {
    if (isTransitioning || index === currentSlide) return
    setIsTransitioning(true)
    setDirection(index > currentSlide ? "right" : "left")
    setCurrentSlide(index)
    window.setTimeout(() => setIsTransitioning(false), 520)
  }

  useEffect(() => {
    if (!isAutoPlaying) return

    const interval = window.setInterval(nextSlide, 5200)
    return () => window.clearInterval(interval)
  }, [isAutoPlaying, nextSlide])

  const slide = slides[currentSlide]

  return (
    <div
      className="group relative min-h-[350px] overflow-hidden rounded-[2.2rem] border border-white/80 bg-white/72 shadow-[0_40px_96px_-56px_rgba(15,84,43,0.2)] backdrop-blur-2xl sm:min-h-[392px]"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      <div className="absolute inset-0">
        {slides.map((item, index) => (
          <div
            key={item.id}
            className={cn(
              "absolute inset-0 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
              index === currentSlide
                ? "translate-x-0 scale-100 opacity-100"
                : direction === "right"
                  ? "translate-x-5 scale-[1.015] opacity-0"
                  : "-translate-x-5 scale-[1.015] opacity-0",
            )}
          >
            <div className={cn("absolute inset-0 bg-gradient-to-br", item.surfaceTone)} />
            <div className={cn("absolute inset-0", item.ambientTone)} />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.28),transparent_26%,rgba(255,255,255,0.1))]" />

            {item.displayMode !== "feature-image" && (
              <div className="absolute inset-y-0 right-0 hidden w-[44%] overflow-hidden lg:block">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  priority={index === 0}
                  className="object-cover object-center opacity-[0.14] scale-[1.06]"
                />
                <div className="absolute inset-0 bg-gradient-to-l from-white/16 via-white/48 to-white/78" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-[1px] rounded-[calc(2.2rem-1px)] border border-white/30" />

      <div className="relative z-10 flex h-full min-h-[350px] flex-col p-5 text-foreground sm:min-h-[392px] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="relative h-8 w-28 sm:h-9 sm:w-32">
            <Image
              src="/images/inhalex-logonegro.png"
              alt="INHALEX"
              fill
              className="object-contain object-left"
            />
          </div>

          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase shadow-[0_14px_30px_-28px_rgba(15,84,43,0.36)] backdrop-blur-md transition-all duration-500",
              slide.badgeTone,
              isTransitioning ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100",
            )}
          >
            {slide.icon}
            <span>{slide.eyebrow}</span>
          </div>
        </div>

        <div
          className={cn(
            "mt-4 max-w-[40rem] space-y-4 transition-all duration-500",
            isTransitioning ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100",
          )}
        >
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/58">
              {slide.featureLabel ?? "Momento destacado"}
            </p>
            <h3 className="text-balance text-[clamp(1.95rem,4.5vw,3.35rem)] font-semibold leading-[0.95] tracking-tight text-foreground">
              {slide.title}
            </h3>
            <p className="max-w-[44ch] text-sm leading-7 text-muted-foreground sm:text-[15px]">
              {slide.description}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {slide.highlights.map((highlight, index) => (
              <span
                key={highlight}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium shadow-[0_10px_26px_-24px_rgba(15,84,43,0.18)] backdrop-blur-sm transition-all duration-300",
                  slide.chipTone,
                  isTransitioning ? "scale-95 opacity-0" : "scale-100 opacity-100",
                )}
                style={{ transitionDelay: `${120 + index * 45}ms` }}
              >
                {highlight}
              </span>
            ))}
          </div>
        </div>

        <div
          className={cn(
            "mt-4 transition-all duration-500",
            isTransitioning ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100",
          )}
        >
          <div
            className={cn(
              "relative overflow-hidden rounded-[1.9rem] border border-white/85 p-3 shadow-[0_28px_70px_-44px_rgba(15,23,42,0.18)] backdrop-blur-md sm:p-3.5",
              slide.visualPanelClassName,
            )}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.6),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(16,112,58,0.08),transparent_38%)]" />

            <div
              className={cn(
                "relative h-[198px] overflow-hidden rounded-[1.5rem] border border-white/80 shadow-[0_18px_52px_-36px_rgba(15,23,42,0.18)] sm:h-[238px]",
                slide.visualInnerClassName,
              )}
            >
              <Image
                src={slide.image}
                alt={slide.title}
                fill
                priority
                className={cn(
                  slide.displayMode === "feature-image"
                    ? "object-contain object-center"
                    : "object-cover object-center",
                  slide.imageClassName,
                )}
              />

              {slide.displayMode !== "feature-image" && (
                <>
                  <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.12),rgba(255,255,255,0.72))]" />
                  <div className="absolute inset-x-4 bottom-4 rounded-[1.2rem] border border-white/85 bg-white/88 px-4 py-3 shadow-[0_18px_40px_-28px_rgba(15,84,43,0.24)] backdrop-blur-md">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/58">
                      {slide.eyebrow}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {slide.highlights.map((highlight) => (
                        <span
                          key={highlight}
                          className="rounded-full border border-primary/10 bg-primary/[0.05] px-3 py-1 text-xs font-medium text-foreground/82"
                        >
                          {highlight}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="absolute left-4 top-4 rounded-full border border-white/85 bg-white/92 px-3 py-1.5 text-[0.72rem] font-semibold text-foreground shadow-[0_14px_32px_-26px_rgba(15,23,42,0.2)] backdrop-blur-sm">
                {slide.featureLabel ?? "Vista destacada"}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-4 border-t border-primary/10 pt-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-3">
              <div className="flex gap-2">
                {slides.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => goToSlide(index)}
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      index === currentSlide
                        ? "w-9 bg-primary"
                        : "w-2 bg-primary/20 hover:bg-primary/42",
                    )}
                    aria-label={`Ir a la tarjeta ${index + 1}`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-3">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  {String(currentSlide + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
                </p>
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {slide.eyebrow}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={prevSlide}
              className="h-11 w-11 rounded-full border border-white/80 bg-white/78 text-foreground shadow-[0_14px_32px_-28px_rgba(15,23,42,0.18)] backdrop-blur-sm hover:bg-white"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Anterior</span>
            </Button>

            <Button
              asChild
              size="lg"
              className="rounded-full bg-primary px-7 text-primary-foreground shadow-[0_18px_42px_-28px_rgba(15,84,43,0.34)] hover:bg-primary/92"
            >
              <Link href={slide.href}>{slide.cta}</Link>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={nextSlide}
              className="h-11 w-11 rounded-full border border-white/80 bg-white/78 text-foreground shadow-[0_14px_32px_-28px_rgba(15,23,42,0.18)] backdrop-blur-sm hover:bg-white"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Siguiente</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-1 bg-primary/[0.08]">
        <div
          key={currentSlide}
          className={cn(
            "h-full rounded-full bg-primary/65",
            isAutoPlaying
              ? "transition-[width] duration-[5200ms] ease-linear"
              : "transition-[width] duration-300",
          )}
          style={{ width: isAutoPlaying ? "100%" : "0%" }}
        />
      </div>
    </div>
  )
}
