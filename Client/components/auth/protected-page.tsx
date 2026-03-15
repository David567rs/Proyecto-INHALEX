"use client"

import { useEffect, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "./auth-provider"

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
  const { isAuthenticated, isLoading, user } = useAuth()

  useEffect(() => {
    if (isLoading) {
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
  }, [isAuthenticated, isLoading, pathname, requireAdmin, router, user?.role])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
        Cargando sesion...
      </div>
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
