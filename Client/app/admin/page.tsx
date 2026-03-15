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
    description:
      "Gestiona roles y estado de cuentas para controlar acceso y operacion del panel.",
    icon: Users,
  },
  {
    href: "/admin/productos",
    title: "Administracion de productos",
    description:
      "Edita catalogo, disponibilidad, precios y estado de publicacion de cada aroma.",
    icon: ShoppingBag,
  },
  {
    href: "/admin/catalogo/categorias",
    title: "Categorias del catalogo",
    description:
      "Organiza lineas, clasificacion y orden de visualizacion para filtros publicos.",
    icon: Tags,
  },
  {
    href: "/admin/catalogo/inventario",
    title: "Inventario",
    description:
      "Prepara control de existencias por producto con alertas y seguimiento interno.",
    icon: PackageCheck,
  },
  {
    href: "/admin/contenido",
    title: "Informacion de empresa",
    description:
      "Mantiene actualizados terminos, politicas y secciones corporativas visibles al cliente.",
    icon: FileText,
  },
  {
    href: "/admin/auditoria",
    title: "Auditoria de acciones",
    description:
      "Visualiza cada accion ejecutada en el panel admin: usuario, coleccion, resultado y hora.",
    icon: History,
  },
  {
    href: "/admin/respaldos",
    title: "Respaldos de base de datos",
    description:
      "Crea copias de seguridad de toda la base o por coleccion desde el panel.",
    icon: DatabaseBackup,
  },
]

export default function AdminPage() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/85 p-6 shadow-sm backdrop-blur">
      <div className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-primary/10 blur-2xl" />
      <div className="pointer-events-none absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-emerald-400/10 blur-2xl" />

      <div className="relative z-10">
        <h3 className="text-2xl font-semibold tracking-tight text-primary">Resumen general</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Elige un modulo para continuar. Cada seccion esta separada para mantener el panel
          ordenado y facil de operar.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {MODULE_CARDS.map((module) => (
            <article
              key={module.href}
              className="rounded-xl border border-border/60 bg-card/90 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <module.icon className="h-5 w-5" />
              </div>

              <h4 className="mt-4 text-base font-semibold text-foreground">{module.title}</h4>
              <p className="mt-2 text-sm text-muted-foreground">{module.description}</p>

              <Link
                href={module.href}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
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
