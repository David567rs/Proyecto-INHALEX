"use client"

import { useRef, useState, useEffect } from "react"
import Link from "next/link"
import { ArrowRight, Leaf } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface CTASectionProps {
  productCount: number
  categoryCount: number
  availableCount: number
  isLoading?: boolean
}

export function CTASection({
  productCount,
  categoryCount,
  availableCount,
  isLoading = false,
}: CTASectionProps) {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.2 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="py-20 lg:py-32 bg-primary relative overflow-hidden"
    >
      {/* Background patterns */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/2 -left-1/4 w-full h-full bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/4 w-full h-full bg-black/10 rounded-full blur-3xl" />
        
        {/* Floating leaves decoration */}
        <div className="absolute top-10 left-10 opacity-10">
          <Leaf className="w-24 h-24 text-white animate-float" />
        </div>
        <div className="absolute bottom-10 right-10 opacity-10">
          <Leaf className="w-32 h-32 text-white animate-float-delayed" />
        </div>
        <div className="absolute top-1/2 right-1/4 opacity-5">
          <Leaf className="w-20 h-20 text-white animate-bounce-slow" />
        </div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div
          className={cn(
            "max-w-3xl mx-auto text-center transition-all duration-1000",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <h2 className="public-display-heading mb-6 text-3xl text-balance text-primary-foreground sm:text-4xl lg:text-5xl">
            Encuentra un aroma para tu momento
          </h2>
          <p className="text-lg lg:text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto text-pretty leading-relaxed">
            Recorre el catálogo de INHALEX, compara sus perfiles aromáticos y conoce la
            disponibilidad de cada opción antes de elegir.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="group bg-white px-8 py-6 text-base font-medium text-primary shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/90 hover:shadow-2xl"
            >
              <Link href="/productos">
                Explorar productos
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="px-8 py-6 text-base font-medium border-2 border-white/30 text-primary-foreground hover:bg-white/10 hover:border-white/50 bg-transparent transition-all duration-300"
            >
              <Link href="/nosotros">Conoce nuestra historia</Link>
            </Button>
          </div>

          {/* Stats */}
          <div
            className={cn(
              "mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 border-t border-white/20 pt-10 transition-all delay-300 duration-1000 sm:grid-cols-3",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            {[
              {
                value: isLoading ? "—" : productCount,
                label: "Aromas en catálogo",
              },
              {
                value: isLoading ? "—" : categoryCount,
                label: "Líneas para explorar",
              },
              {
                value: isLoading ? "—" : availableCount,
                label: "Opciones disponibles",
              },
            ].map((stat) => (
              <div key={stat.label} className="text-center transition-transform duration-500 hover:-translate-y-1">
                <p className="text-3xl lg:text-4xl font-bold text-primary-foreground mb-1">
                  {stat.value}
                </p>
                <p className="text-sm text-primary-foreground/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(-5deg); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 5s ease-in-out infinite; }
        .animate-bounce-slow { animation: bounce-slow 3s ease-in-out infinite; }
      `}</style>
    </section>
  )
}
