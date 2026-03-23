"use client"

import Link from "next/link"
import {
  ArrowRight,
  DatabaseBackup,
  FileText,
  History,
  PackageCheck,
  ShoppingBag,
  Tags,
  Users,
} from "lucide-react"

const MODULE_CARDS = [
  {
    href: "/admin/usuarios",
    title: "Administracion de usuarios",
    description: "Gestiona roles, estado y acceso al panel.",
    icon: Users,
  },
  {
    href: "/admin/productos",
    title: "Administracion de productos",
    description: "Edita catalogo, precios y visibilidad.",
    icon: ShoppingBag,
  },
  {
    href: "/admin/catalogo/categorias",
    title: "Categorias del catalogo",
    description: "Ordena lineas y filtros del catalogo.",
    icon: Tags,
  },
  {
    href: "/admin/catalogo/inventario",
    title: "Inventario",
    description: "Control de existencias y alertas.",
    icon: PackageCheck,
  },
  {
    href: "/admin/contenido",
    title: "Informacion de empresa",
    description: "Actualiza paginas, terminos y politicas.",
    icon: FileText,
  },
  {
    href: "/admin/auditoria",
    title: "Monitoreo y auditoria",
    description: "Supervisa actividad, recursos y bitacora.",
    icon: History,
  },
  {
    href: "/admin/respaldos",
    title: "Respaldos de base de datos",
    description: "Crea y restaura copias de seguridad.",
    icon: DatabaseBackup,
  },
]

export default function AdminPage() {
  return (
    <section className="admin-panel-shell admin-animate-card">
      <div className="relative z-10">
        <h3 className="text-2xl font-semibold tracking-tight text-primary">Resumen general</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Elige un modulo. Cada seccion concentra una operacion del panel.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {MODULE_CARDS.map((module) => (
            <article
              key={module.href}
              className="admin-section-card flex min-h-[13.25rem] flex-col p-5"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <module.icon className="h-5 w-5" />
              </div>

              <h4 className="mt-4 text-base font-semibold text-foreground">{module.title}</h4>
              <p className="mt-2 text-sm text-muted-foreground">{module.description}</p>

              <Link
                href={module.href}
                className="mt-auto pt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
              >
                Abrir modulo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
