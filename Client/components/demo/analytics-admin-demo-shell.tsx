import type { ReactNode } from "react"
import Link from "next/link"
import {
  BarChart3,
  DatabaseBackup,
  ExternalLink,
  FileText,
  FlaskConical,
  History,
  LayoutDashboard,
  MessageSquareWarning,
  Package,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Tags,
  Users,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

type AnalyticsDemoModule = "ventas" | "usuarios"

interface AnalyticsAdminDemoShellProps {
  activeModule: AnalyticsDemoModule
  moduleTitle: string
  moduleDescription: string
  children: ReactNode
}

interface DemoNavigationItem {
  id: string
  label: string
  description: string
  icon: LucideIcon
  href?: string
}

const PRIMARY_MODULES: DemoNavigationItem[] = [
  {
    id: "resumen",
    label: "Resumen",
    description: "Vista general",
    icon: LayoutDashboard,
  },
  {
    id: "usuarios",
    label: "Usuarios",
    description: "Roles y segmentos",
    icon: Users,
    href: "/demo/segmentacion-clientes",
  },
  {
    id: "pedidos",
    label: "Pedidos",
    description: "Revisión y estados",
    icon: ShoppingBag,
  },
  {
    id: "reportes",
    label: "Reportes",
    description: "Incidencias y atención",
    icon: MessageSquareWarning,
  },
  {
    id: "ventas",
    label: "Ventas",
    description: "Reportes y predicción",
    icon: BarChart3,
    href: "/admin/ventas",
  },
]

const CATALOG_MODULES: DemoNavigationItem[] = [
  {
    id: "productos",
    label: "Productos",
    description: "Catálogo y precios",
    icon: Package,
  },
  {
    id: "categorias",
    label: "Categorías",
    description: "Líneas y orden",
    icon: Tags,
  },
  {
    id: "inventario",
    label: "Inventario",
    description: "Control de existencias",
    icon: PackageCheck,
  },
]

const SECONDARY_MODULES: DemoNavigationItem[] = [
  {
    id: "contenido",
    label: "Contenido",
    description: "Páginas y políticas",
    icon: FileText,
  },
  {
    id: "monitoreo",
    label: "Monitoreo",
    description: "Tiempo real y auditoría",
    icon: History,
  },
  {
    id: "respaldos",
    label: "Respaldos",
    description: "Base y colecciones",
    icon: DatabaseBackup,
  },
]

function DemoNavigationLink({
  item,
  activeModule,
  compact = false,
}: {
  item: DemoNavigationItem
  activeModule: AnalyticsDemoModule
  compact?: boolean
}) {
  const isActive = item.id === activeModule
  const content = (
    <div
      className={cn(
        "rounded-xl border transition-all",
        compact ? "px-3 py-2.5" : "px-2.5 py-2.5 xl:px-3 xl:py-3",
        isActive
          ? "border-primary/30 bg-primary text-primary-foreground shadow-md shadow-primary/20"
          : "border-transparent text-foreground hover:border-border/70 hover:bg-secondary/40",
      )}
    >
      <div className="flex items-center gap-2">
        <item.icon
          className={cn("shrink-0", compact ? "h-3.5 w-3.5" : "h-4 w-4")}
        />
        <span className={cn("font-semibold", compact ? "text-xs" : "text-xs xl:text-sm")}>
          {item.label}
        </span>
      </div>
      {!compact ? (
        <p
          className={cn(
            "mt-1 hidden text-xs 2xl:block",
            isActive ? "text-primary-foreground/85" : "text-muted-foreground",
          )}
        >
          {item.description}
        </p>
      ) : null}
    </div>
  )

  if (!item.href) {
    return <div aria-disabled="true">{content}</div>
  }

  return <Link href={item.href}>{content}</Link>
}

export function AnalyticsAdminDemoShell({
  activeModule,
  moduleTitle,
  moduleDescription,
  children,
}: AnalyticsAdminDemoShellProps) {
  return (
    <div className="admin-font-shell relative min-h-screen bg-background">
      <style>{`nextjs-portal { display: none !important; }`}</style>
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/3 -left-24 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl" />
      </div>

      <div className="container mx-auto px-3 py-4 sm:px-4 lg:h-[calc(100dvh-1.75rem)] lg:overflow-hidden lg:py-4">
        <div className="grid gap-3 lg:h-full lg:min-h-0 lg:grid-cols-[220px_1fr] lg:items-start xl:grid-cols-[236px_1fr]">
          <aside className="hidden space-y-3 lg:flex lg:h-full lg:min-h-0 lg:flex-col">
            <div className="space-y-2.5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-2">
              <div className="admin-section-card p-3">
                <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <ShieldCheck className="h-4 w-4" />
                  Administración
                </p>
                <h1 className="mt-2 text-base font-semibold tracking-tight text-foreground xl:text-lg">
                  Panel INHALEX
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Bienvenido, Administrador.
                </p>
              </div>

              <nav className="admin-section-card p-2.5 xl:p-3" aria-label="Módulos de demostración">
                <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Módulos
                </p>

                <div className="space-y-1.5">
                  {PRIMARY_MODULES.map((item) => (
                    <DemoNavigationLink
                      key={item.id}
                      item={item}
                      activeModule={activeModule}
                    />
                  ))}

                  <div className="rounded-xl border border-transparent px-2.5 py-2.5 xl:px-3 xl:py-3">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 shrink-0" />
                      <span className="text-xs font-semibold xl:text-sm">Catálogo</span>
                    </div>
                    <div className="mt-2 space-y-1 border-l border-border/70 pl-3">
                      {CATALOG_MODULES.map((item) => (
                        <DemoNavigationLink
                          key={item.id}
                          item={item}
                          activeModule={activeModule}
                          compact
                        />
                      ))}
                    </div>
                  </div>

                  {SECONDARY_MODULES.map((item) => (
                    <DemoNavigationLink
                      key={item.id}
                      item={item}
                      activeModule={activeModule}
                    />
                  ))}
                </div>
              </nav>

              <div className="admin-section-card p-3">
                <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Demostración
                </p>
                <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-3 text-amber-900">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="h-4 w-4" />
                    <p className="text-xs font-semibold">Vista académica</p>
                  </div>
                  <p className="mt-1 text-[11px] leading-4 text-amber-800/80">
                    Datos sintéticos, sin conexión al backend.
                  </p>
                </div>
                <Link
                  href="/"
                  className="mt-2 flex items-center gap-2 rounded-lg border border-border/70 bg-background/70 px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary/40"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Volver al sitio
                </Link>
              </div>
            </div>
          </aside>

          <section className="space-y-3 lg:flex lg:h-full lg:min-h-0 lg:flex-col">
            <header className="sticky top-3 z-20 shrink-0 lg:top-0">
              <div className="admin-section-card px-4 py-3 backdrop-blur-xl supports-[backdrop-filter]:bg-card/82">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Módulo activo
                    </p>
                    <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                      {moduleTitle}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {moduleDescription}
                    </p>
                  </div>

                  <div className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
                    <FlaskConical className="h-3.5 w-3.5" />
                    Demostración académica · datos sintéticos
                  </div>
                </div>

                <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
                  {PRIMARY_MODULES.filter((item) => item.href).map((item) => {
                    const isActive = item.id === activeModule
                    return (
                      <Link
                        key={`mobile-${item.id}`}
                        href={item.href ?? "/"}
                        className={cn(
                          "inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border px-3 text-sm font-medium transition-all",
                          isActive
                            ? "border-primary/20 bg-primary text-primary-foreground"
                            : "border-input bg-background/70",
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            </header>

            <main className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-2">
              {children}
            </main>
          </section>
        </div>
      </div>
    </div>
  )
}
