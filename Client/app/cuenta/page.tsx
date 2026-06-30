"use client"

import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { ProtectedPage } from "@/components/auth/protected-page"
import { useAuth } from "@/components/auth/auth-provider"
import { AccountFavorites } from "@/components/favorites/account-favorites"
import { AccountAddresses } from "@/components/addresses/account-addresses"
import { AccountNotices } from "@/components/account/account-notices"
import { AccountReports } from "@/components/account/account-reports"
import { AccountReviews } from "@/components/account/account-reviews"

export default function CuentaPage() {
  const { user } = useAuth()
  const roleLabel = user?.role === "admin" ? "Administrador" : "Usuario"

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-24 lg:pt-28">
        <ProtectedPage>
          <section className="container mx-auto px-4 py-10">
            <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[0.88fr_1.12fr]">
              <div className="rounded-[1.6rem] border border-border/60 bg-card p-6 shadow-sm">
                <h1 className="text-2xl font-semibold text-primary">Mi cuenta</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Perfil, avisos y seguimiento de tus compras.
                </p>

                <div className="mt-6 grid gap-3 text-sm">
                  <div className="rounded-lg bg-secondary/30 px-4 py-3">
                    <span className="font-medium">Nombre:</span> {user?.name}
                  </div>
                  <div className="rounded-lg bg-secondary/30 px-4 py-3">
                    <span className="font-medium">Correo:</span> {user?.email}
                  </div>
                  <div className="rounded-lg bg-secondary/30 px-4 py-3">
                    <span className="font-medium">Rol:</span> {roleLabel}
                  </div>
                </div>
              </div>

              <AccountNotices />
              <AccountReviews />
              <AccountReports />
              <AccountFavorites />
              <AccountAddresses />
            </div>
          </section>
        </ProtectedPage>
      </main>
      <Footer />
    </div>
  )
}
