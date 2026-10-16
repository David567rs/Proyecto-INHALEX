"use client"

import { createContext, useContext, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"

const PublicShellContext = createContext(false)
const SEPARATE_LAYOUT_PREFIXES = ["/admin", "/auth", "/demo"]

export function useHasPublicAppShell() {
  return useContext(PublicShellContext)
}

interface PublicAppShellProps {
  children: ReactNode
  /** Error and loading boundaries can replace a route's own layout. */
  force?: boolean
}

export function PublicAppShell({ children, force = false }: PublicAppShellProps) {
  const pathname = usePathname()
  const hasParentShell = useContext(PublicShellContext)
  const hasSeparateLayout = SEPARATE_LAYOUT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname?.startsWith(`${prefix}/`),
  )

  if (hasParentShell || (!force && hasSeparateLayout)) {
    return children
  }

  return (
    <PublicShellContext.Provider value={true}>
      <div className="flex min-h-dvh flex-col">
        <Header />
        <div className="flex min-w-0 flex-1 flex-col [&>.page-transition-shell]:flex [&>.page-transition-shell]:flex-1 [&>.page-transition-shell]:flex-col">
          {children}
        </div>
        <Footer />
      </div>
    </PublicShellContext.Provider>
  )
}
