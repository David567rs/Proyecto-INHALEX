"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import {
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  DatabaseBackup,
  ExternalLink,
  FileText,
  History,
  LayoutDashboard,
  Layers3,
  LogOut,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Tags,
  UserCircle2,
  Users,
  type LucideIcon,
} from "lucide-react"
import { ProtectedPage } from "@/components/auth/protected-page"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface AdminLayoutProps {
  children: ReactNode
}

interface AdminNavLink {
  href: string
  label: string
  description: string
  icon: LucideIcon
  isActive: (pathname: string) => boolean
}

const RESUMEN_LINK: AdminNavLink = {
  href: "/admin",
  label: "Resumen",
  description: "Vista general",
  icon: LayoutDashboard,
  isActive: (pathname) => pathname === "/admin",
}

const USUARIOS_LINK: AdminNavLink = {
  href: "/admin/usuarios",
  label: "Usuarios",
  description: "Roles y accesos",
  icon: Users,
  isActive: (pathname) => pathname.startsWith("/admin/usuarios"),
}

const PEDIDOS_LINK: AdminNavLink = {
  href: "/admin/pedidos",
  label: "Pedidos",
  description: "Revision y estados",
  icon: ShoppingBag,
  isActive: (pathname) => pathname.startsWith("/admin/pedidos"),
}

const CONTENIDO_LINK: AdminNavLink = {
  href: "/admin/contenido",
  label: "Contenido",
  description: "Paginas y politicas",
  icon: FileText,
  isActive: (pathname) => pathname.startsWith("/admin/contenido"),
}

const AUDITORIA_LINK: AdminNavLink = {
  href: "/admin/auditoria",
  label: "Monitoreo",
  description: "Tiempo real y auditoria",
  icon: History,
  isActive: (pathname) => pathname.startsWith("/admin/auditoria"),
}

const RESPALDOS_LINK: AdminNavLink = {
  href: "/admin/respaldos",
  label: "Respaldos",
  description: "Base y colecciones",
  icon: DatabaseBackup,
  isActive: (pathname) => pathname.startsWith("/admin/respaldos"),
}

const CATALOGO_LINKS: AdminNavLink[] = [
  {
    href: "/admin/productos",
    label: "Productos",
    description: "Catalogo y precios",
    icon: ShoppingBag,
    isActive: (pathname) => pathname.startsWith("/admin/productos"),
  },
  {
    href: "/admin/catalogo/categorias",
    label: "Categorias",
    description: "Lineas y orden",
    icon: Tags,
    isActive: (pathname) => pathname.startsWith("/admin/catalogo/categorias"),
  },
  {
    href: "/admin/catalogo/inventario",
    label: "Inventario",
    description: "Control de existencias",
    icon: PackageCheck,
    isActive: (pathname) => pathname.startsWith("/admin/catalogo/inventario"),
  },
]

const DESKTOP_PRIMARY_LINKS: AdminNavLink[] = [RESUMEN_LINK, USUARIOS_LINK, PEDIDOS_LINK]
const DESKTOP_SECONDARY_LINKS: AdminNavLink[] = [CONTENIDO_LINK, AUDITORIA_LINK, RESPALDOS_LINK]
const MOBILE_LINKS: AdminNavLink[] = [
  RESUMEN_LINK,
  USUARIOS_LINK,
  PEDIDOS_LINK,
  ...CATALOGO_LINKS,
  CONTENIDO_LINK,
  AUDITORIA_LINK,
  RESPALDOS_LINK,
]
const SIDEBAR_COLLAPSED_STORAGE_KEY = "admin-sidebar-collapsed"

function isCatalogActive(pathname: string): boolean {
  return (
    pathname.startsWith("/admin/productos") || pathname.startsWith("/admin/catalogo")
  )
}

function SidebarLink({
  link,
  pathname,
  compact = false,
  collapsed = false,
}: {
  link: AdminNavLink
  pathname: string
  compact?: boolean
  collapsed?: boolean
}) {
  const active = link.isActive(pathname)

  const linkContent = (
    <Link
      href={link.href}
      className={cn(
        "block rounded-xl border transition-all",
        collapsed
          ? "px-2 py-2.5"
          : compact
            ? "px-3 py-2.5"
            : "px-2.5 py-2.5 xl:px-3 xl:py-3",
        active
          ? "border-primary/30 bg-primary text-primary-foreground shadow-md shadow-primary/20"
          : "border-transparent hover:border-border/70 hover:bg-secondary/40",
      )}
    >
      <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-2")}>
        <link.icon className={cn("shrink-0", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
        {collapsed ? (
          <span className="sr-only">{link.label}</span>
        ) : (
          <span className={cn("font-semibold", compact ? "text-xs" : "text-xs xl:text-sm")}>
            {link.label}
          </span>
        )}
      </div>
      {!compact && !collapsed && (
        <p
          className={cn(
            "mt-1 hidden text-xs 2xl:block",
            active ? "text-primary-foreground/85" : "text-muted-foreground",
          )}
        >
          {link.description}
        </p>
      )}
    </Link>
  )

  if (!collapsed) {
    return linkContent
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {link.label}
      </TooltipContent>
    </Tooltip>
  )
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  const [isCatalogOpen, setIsCatalogOpen] = useState(isCatalogActive(pathname))
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const visiblePrimaryLinks = DESKTOP_PRIMARY_LINKS
  const visibleCatalogLinks = CATALOGO_LINKS
  const visibleSecondaryLinks = DESKTOP_SECONDARY_LINKS
  const visibleMobileLinks = MOBILE_LINKS

  useEffect(() => {
    if (isCatalogActive(pathname)) {
      setIsCatalogOpen(true)
    }
  }, [pathname])

  useEffect(() => {
    const persistedValue = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)
    if (persistedValue === "true") {
      setIsSidebarCollapsed(true)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(
      SIDEBAR_COLLAPSED_STORAGE_KEY,
      isSidebarCollapsed ? "true" : "false",
    )
  }, [isSidebarCollapsed])

  const currentModule = useMemo(
    () =>
      visibleMobileLinks.find((module) => module.isActive(pathname)) ??
      visibleMobileLinks[0] ??
      RESUMEN_LINK,
    [pathname, visibleMobileLinks],
  )

  const handleLogout = () => {
    logout()
    router.push("/auth/login")
  }

  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/3 -left-24 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl" />
      </div>

      <ProtectedPage requireAdmin>
        <div className="container mx-auto px-3 py-6 sm:px-4 lg:h-[calc(100dvh-2.5rem)] lg:overflow-hidden lg:py-5">
          <div
            className={cn(
              "grid gap-5 lg:h-full lg:min-h-0 lg:items-start",
              isSidebarCollapsed
                ? "lg:grid-cols-[88px_1fr]"
                : "lg:grid-cols-[248px_1fr] xl:grid-cols-[272px_1fr]",
            )}
          >
            <aside className="space-y-3 lg:flex lg:h-full lg:min-h-0 lg:flex-col">
              <div className="hidden justify-end lg:flex">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                      className="h-9 w-9"
                    >
                      {isSidebarCollapsed ? (
                        <ChevronsRight className="h-4 w-4" />
                      ) : (
                        <ChevronsLeft className="h-4 w-4" />
                      )}
                      <span className="sr-only">
                        {isSidebarCollapsed ? "Expandir menu" : "Colapsar menu"}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {isSidebarCollapsed ? "Expandir menu" : "Colapsar menu"}
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="space-y-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-2">
                {!isSidebarCollapsed && (
                  <div className="admin-section-card p-4 xl:p-5">
                    <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      <ShieldCheck className="h-4 w-4" />
                      Administracion
                    </p>
                    <h1 className="mt-3 text-lg font-semibold tracking-tight text-foreground xl:text-xl">
                      Panel INHALEX
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Bienvenido, {user?.name ?? "Administrador"}.
                    </p>
                  </div>
                )}

                <nav
                  className={cn(
                    "admin-section-card",
                    isSidebarCollapsed ? "p-2" : "p-2.5 xl:p-3",
                  )}
                >
                  {!isSidebarCollapsed && (
                    <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Modulos
                    </p>
                  )}

                  <div className="space-y-1.5">
                    {isSidebarCollapsed ? (
                      visibleMobileLinks.map((link) => (
                        <SidebarLink
                          key={link.href}
                          link={link}
                          pathname={pathname}
                          collapsed
                        />
                      ))
                    ) : (
                      <>
                        {visiblePrimaryLinks.map((link) => (
                          <SidebarLink key={link.href} link={link} pathname={pathname} />
                        ))}

                        {visibleCatalogLinks.length > 0 && (
                          <Collapsible open={isCatalogOpen} onOpenChange={setIsCatalogOpen}>
                            <CollapsibleTrigger
                              className={cn(
                                "flex w-full items-center justify-between rounded-xl border px-2.5 py-2.5 text-left transition-all xl:px-3 xl:py-3",
                                isCatalogActive(pathname)
                                  ? "border-primary/30 bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                  : "border-transparent hover:border-border/70 hover:bg-secondary/40",
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <Layers3 className="h-4 w-4 shrink-0" />
                                <div>
                                  <p className="text-xs font-semibold xl:text-sm">Catalogo</p>
                                  <p
                                    className={cn(
                                      "hidden text-xs 2xl:block",
                                      isCatalogActive(pathname)
                                        ? "text-primary-foreground/85"
                                        : "text-muted-foreground",
                                    )}
                                  >
                                    Productos, categorias e inventario
                                  </p>
                                </div>
                              </div>
                              <ChevronDown
                                className={cn(
                                  "h-4 w-4 transition-transform",
                                  isCatalogOpen ? "rotate-180" : "",
                                )}
                              />
                            </CollapsibleTrigger>

                            <CollapsibleContent className="mt-2 pl-3 pr-1">
                              <div className="space-y-1.5 border-l border-border/70 pl-3">
                                {visibleCatalogLinks.map((link) => (
                                  <SidebarLink
                                    key={link.href}
                                    link={link}
                                    pathname={pathname}
                                    compact
                                  />
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}

                        {visibleSecondaryLinks.map((link) => (
                          <SidebarLink key={link.href} link={link} pathname={pathname} />
                        ))}
                      </>
                    )}
                  </div>
                </nav>

                <div
                  className={cn(
                    "admin-section-card",
                    isSidebarCollapsed ? "p-2" : "p-2.5 xl:p-3",
                  )}
                >
                  {!isSidebarCollapsed && (
                    <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Accesos
                    </p>
                  )}
                  <div className={cn("grid gap-2", isSidebarCollapsed && "place-items-center")}>
                    {isSidebarCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            className="h-9 w-9 p-0"
                            size="icon"
                            asChild
                          >
                            <Link href="/">
                              <ExternalLink className="h-4 w-4" />
                              <span className="sr-only">Ver sitio publico</span>
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={8}>
                          Ver sitio publico
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Button variant="outline" className="justify-start" asChild>
                        <Link href="/">
                          <ExternalLink className="h-4 w-4" />
                          Ver sitio publico
                        </Link>
                      </Button>
                    )}

                    {isSidebarCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            className="h-9 w-9 p-0"
                            size="icon"
                            asChild
                          >
                            <Link href="/cuenta">
                              <UserCircle2 className="h-4 w-4" />
                              <span className="sr-only">Mi cuenta</span>
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={8}>
                          Mi cuenta
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Button variant="outline" className="justify-start" asChild>
                        <Link href="/cuenta">
                          <UserCircle2 className="h-4 w-4" />
                          Mi cuenta
                        </Link>
                      </Button>
                    )}

                    {isSidebarCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="destructive"
                            className="h-9 w-9 p-0"
                            size="icon"
                            onClick={handleLogout}
                          >
                            <LogOut className="h-4 w-4" />
                            <span className="sr-only">Cerrar sesion</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={8}>
                          Cerrar sesion
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Button variant="destructive" className="justify-start" onClick={handleLogout}>
                        <LogOut className="h-4 w-4" />
                        Cerrar sesion
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </aside>

            <section className="space-y-4 lg:flex lg:h-full lg:min-h-0 lg:flex-col">
              <header className="sticky top-3 z-20 shrink-0 lg:top-0">
                <div className="admin-section-card px-5 py-4 backdrop-blur-xl supports-[backdrop-filter]:bg-card/82">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Modulo activo
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                  {currentModule.label}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{currentModule.description}</p>

                <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
                  {visibleMobileLinks.map((module) => (
                    <Link
                      key={`mobile-${module.href}`}
                      href={module.href}
                      className={cn(
                        "inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border px-3 text-sm font-medium transition-all",
                        module.isActive(pathname)
                          ? "border-primary/20 bg-primary text-primary-foreground"
                          : "border-input bg-background/70",
                      )}
                    >
                      <module.icon className="h-4 w-4" />
                      {module.label}
                    </Link>
                  ))}
                </div>
                </div>
              </header>

              <main className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-2">
                {children}
              </main>
            </section>
          </div>
        </div>
      </ProtectedPage>
    </div>
  )
}
