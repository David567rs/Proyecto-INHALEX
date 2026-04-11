"use client"

import { useRef, useState, useEffect } from "react"
import { Leaf, Shield, Heart, Sparkles, Droplets, Wind } from "lucide-react"
import { cn } from "@/lib/utils"

const benefits = [
  {
    icon: Leaf,
    title: "100% Natural",
    description: "Todos nuestros productos están elaborados con ingredientes naturales, sin químicos ni aditivos artificiales.",
  },
  {
    icon: Shield,
    title: "Calidad Garantizada",
    description: "Cada producto pasa por estrictos controles de calidad para asegurar su pureza y efectividad.",
  },
  {
    icon: Heart,
    title: "Bienestar Integral",
    description: "Diseñados para promover tu salud respiratoria y equilibrio emocional de manera natural.",
  },
  {
    icon: Sparkles,
    title: "Fórmulas Únicas",
    description: "Combinaciones exclusivas de plantas medicinales desarrolladas por expertos en aromaterapia.",
  },
  {
    icon: Droplets,
    title: "Fácil Aplicación",
    description: "Spray práctico que puedes usar en cualquier momento: frota en tus manos e inhala profundamente.",
  },
  {
    icon: Wind,
    title: "Alivio Inmediato",
    description: "Siente el efecto refrescante y descongestionante desde la primera inhalación.",
  },
]

export function BenefitsSection() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="py-20 lg:py-32 bg-secondary/30 relative overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div
          className={cn(
            "text-center mb-12 lg:mb-16 transition-all duration-1000",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <span className="inline-block px-4 py-1.5 bg-primary/10 rounded-full text-sm font-medium text-primary mb-4">
            Por Qué Elegirnos
          </span>
          <h2 className="public-display-heading mb-4 text-3xl text-foreground text-balance sm:text-4xl lg:text-5xl">
            Beneficios de INHALEX
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-pretty">
            Descubre por qué miles de personas confían en nuestros productos naturales
            para su bienestar respiratorio diario.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {benefits.map((benefit, index) => (
            <div
              key={benefit.title}
              className={cn(
                "public-card-lift group relative rounded-2xl border border-border/50 bg-card p-6 lg:p-8",
                "hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5",
                "transition-all duration-500 ease-out",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {/* Icon */}
              <div className="mb-5">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                  <benefit.icon className="w-7 h-7 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
                </div>
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors duration-300">
                {benefit.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {benefit.description}
              </p>

              {/* Hover decoration */}
              <div className="absolute top-4 right-4 w-20 h-20 bg-primary/5 rounded-full opacity-0 group-hover:opacity-100 blur-2xl transition-all duration-500" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
