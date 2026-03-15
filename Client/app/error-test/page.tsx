"use client"

import { useState } from "react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"

export default function ErrorTestPage() {
  const [shouldThrow, setShouldThrow] = useState(false)

  if (shouldThrow) {
    throw new Error("Test error 500")
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <section className="pt-28 pb-16 lg:pt-36 lg:pb-24 bg-secondary/30 border-b border-border">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-foreground">
                Prueba de error 500
              </h1>
              <p className="text-muted-foreground text-lg">
                Presiona el bot&oacute;n para lanzar un error y ver la p&aacute;gina 500.
              </p>
              <Button onClick={() => setShouldThrow(true)} className="px-8">
                Provocar error 500
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
