"use client"

import { useEffect, useState, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "./auth-provider"
import { Button } from "@/components/ui/button"

interface ProtectedPageProps {
  children: ReactNode
  requireAdmin?: boolean
}

export function ProtectedPage({
  children,
  requireAdmin = false,
}: ProtectedPageProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, isLoading, user, sessionStatus, refreshProfile } = useAuth()
  const [isRetrying, setIsRetrying] = useState(false)

  useEffect(() => {
    if (isLoading || sessionStatus === "unavailable") {
      return
    }

    if (!isAuthenticated) {
      const next = encodeURIComponent(pathname || "/")
      router.replace(`/auth/login?next=${next}`)
      return
    }

    if (requireAdmin && user?.role !== "admin") {
      router.replace("/")
    }
  }, [isAuthenticated, isLoading, pathname, requireAdmin, router, sessionStatus, user?.role])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
        Cargando sesion...
      </div>
    )
  }

  if (sessionStatus === "unavailable") {
    return (
      <section className="mx-auto max-w-lg px-4 py-24 text-center" aria-live="polite">
        <h1 className="text-xl font-semibold text-foreground">No pudimos verificar tu sesión</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Revisa tu conexión y vuelve a intentarlo para acceder a tu información de forma segura.
        </p>
        <Button
          type="button"
          className="mt-6"
          disabled={isRetrying}
          onClick={async () => {
            setIsRetrying(true)
            try {
              await refreshProfile()
            } finally {
              setIsRetrying(false)
            }
          }}
        >
          {isRetrying ? "Verificando…" : "Reintentar"}
        </Button>
      </section>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  if (requireAdmin && user?.role !== "admin") {
    return null
  }

  return <>{children}</>
}
