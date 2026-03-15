"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Leaf, Droplets, Wind } from "lucide-react"
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

  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/images/fondo.jpg"
          alt="Laboratorio de plantas naturales"
          fill
          className="object-cover object-center"
          priority
        />
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />
      </div>

      <div className="container mx-auto py-20 relative z-10 px-4 lg:py-32 opacity-100">
        <div className="max-w-2xl">
          {/* Content Side */}
          <div
            className={cn(
              "space-y-8 transition-all duration-1000 ease-out",
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            )}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-sm font-medium text-primary animate-in fade-in slide-in-from-bottom-4 duration-700">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              Productos 100% Naturales
            </div>

            {/* Headline */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-serif leading-tight text-balance">
                <span className="block text-foreground">El Respiro</span>
                <span className="block text-foreground">Que{" "}</span>
                <span className="relative inline-block">
                  <span className="text-primary">Alivia</span>
                  <svg
                    className="absolute -bottom-2 left-0 w-full h-3 text-primary/30"
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
            </div>

            {/* Description */}
            <p className="text-lg text-muted-foreground max-w-lg leading-relaxed text-pretty">
              Descubre nuestra selección de productos naturales diseñados para tu
              bienestar respiratorio. Cada esencia, una experiencia única de
              alivio y frescura para la congestión nasal, dolor de cabeza, 
              resfriado, gripe y tos.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <Button
                size="lg"
                className="group bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-base font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:-translate-y-0.5"
              >
                Ver Productos
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="px-8 py-6 text-base font-medium border-2 hover:bg-primary/5 hover:border-primary transition-all duration-300 bg-transparent"
              >
                <Link href="/nosotros">Conocer Más</Link>
              </Button>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-4 pt-4">
              {features.map((feature, index) => (
                <div
                  key={feature.text}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 bg-card rounded-full shadow-sm border border-border/50 transition-all duration-500",
                    isVisible
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-4"
                  )}
                  style={{ transitionDelay: `${600 + index * 100}ms` }}
                >
                  <feature.icon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground/80">
                    {feature.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
        <span className="text-xs text-muted-foreground">Descubre más</span>
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2">
          <div className="w-1.5 h-3 bg-primary rounded-full animate-scroll-down" />
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes scroll-down {
          0%, 100% { opacity: 1; transform: translateY(0); }
          50% { opacity: 0.5; transform: translateY(8px); }
        }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 4s ease-in-out infinite; }
        .animate-bounce-slow { animation: bounce-slow 2.5s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
        .animate-scroll-down { animation: scroll-down 1.5s ease-in-out infinite; }
      `}</style>
    </section>
  )
}

