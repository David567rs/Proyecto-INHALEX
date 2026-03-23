"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Droplets, Leaf, Wind } from "lucide-react"
import { PromoCarousel } from "@/components/sections/promo-carousel"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const features = [
  { icon: Leaf, text: "100% Natural" },
  { icon: Droplets, text: "Esencias Puras" },
  { icon: Wind, text: "Alivio Inmediato" },
]

export function Hero() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const scrollToCatalog = () => {
    const section = document.getElementById("catalogo")
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="/images/fondo.jpg"
          alt="Laboratorio de plantas naturales"
          fill
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.92),rgba(255,255,255,0.76)_34%,rgba(255,255,255,0.24)_68%,rgba(255,255,255,0.08)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-background/30" />
      </div>

      <div className="absolute inset-x-0 top-28 z-[1] hidden lg:block">
        <div className="container mx-auto px-4">
          <div className="h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        </div>
      </div>

      <div className="container relative z-10 mx-auto px-4 pb-16 pt-28 sm:pb-20 sm:pt-32 lg:pb-24 lg:pt-36">
        <div className="grid items-center gap-10 xl:grid-cols-[minmax(0,0.96fr)_minmax(440px,560px)] xl:gap-14">
          <div
            className={cn(
              "max-w-2xl space-y-8 transition-all duration-1000 ease-out",
              isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
            )}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/10 px-4 py-2 text-sm font-medium text-primary shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Productos 100% Naturales
            </div>

            <div className="space-y-5">
              <h1 className="max-w-[11ch] font-serif text-5xl leading-[0.95] text-balance text-foreground sm:text-6xl lg:text-7xl xl:text-[5.5rem]">
                <span className="block">El Respiro</span>
                <span className="block">Que</span>
                <span className="relative inline-block text-primary">
                  Alivia
                  <svg
                    className="absolute -bottom-3 left-0 h-4 w-full text-primary/35"
                    viewBox="0 0 200 12"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M0 8 Q50 0, 100 8 T200 8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </h1>

              <p className="max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">
                Descubre nuestra seleccion de productos naturales disenados para tu bienestar
                respiratorio. Cada esencia ofrece una experiencia fresca de alivio para
                congestion nasal, dolor de cabeza, resfriado, gripe y tos.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Button
                size="lg"
                onClick={scrollToCatalog}
                className="group h-14 rounded-2xl px-8 text-base font-medium shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25"
              >
                Ver Productos
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-14 rounded-2xl border-white/60 bg-white/65 px-8 text-base font-medium backdrop-blur-sm hover:bg-white/85"
              >
                <Link href="/nosotros">Conocer Mas</Link>
              </Button>
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              {features.map((feature, index) => (
                <div
                  key={feature.text}
                  className={cn(
                    "flex items-center gap-2 rounded-full border border-border/60 bg-white/82 px-4 py-2.5 shadow-sm backdrop-blur-sm transition-all duration-500",
                    isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
                  )}
                  style={{ transitionDelay: `${450 + index * 100}ms` }}
                >
                  <feature.icon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground/85">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div
            className={cn(
              "mx-auto w-full max-w-[560px] transition-all duration-1000 delay-150 ease-out xl:mx-0 xl:justify-self-end",
              isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0",
            )}
          >
            <PromoCarousel />
          </div>
        </div>
      </div>

      <div className="absolute bottom-7 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 lg:flex">
        <span className="text-xs text-muted-foreground">Descubre mas</span>
        <button
          type="button"
          onClick={scrollToCatalog}
          className="flex h-11 w-7 items-start justify-center rounded-full border border-primary/20 bg-white/70 pt-2 backdrop-blur-sm transition hover:border-primary/35 hover:bg-white"
          aria-label="Ir al catalogo"
        >
          <span className="h-3 w-1.5 rounded-full bg-primary animate-scroll-down" />
        </button>
      </div>

      <style jsx>{`
        @keyframes scroll-down {
          0%,
          100% {
            opacity: 1;
            transform: translateY(0);
          }
          50% {
            opacity: 0.45;
            transform: translateY(8px);
          }
        }

        .animate-scroll-down {
          animation: scroll-down 1.5s ease-in-out infinite;
        }
      `}</style>
    </section>
  )
}
