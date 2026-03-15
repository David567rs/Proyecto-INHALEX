import React from "react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex pt-24 lg:pt-28">
        {children}
      </main>
      <Footer />
    </div>
  )
}
