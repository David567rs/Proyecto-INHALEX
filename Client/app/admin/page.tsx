"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  DatabaseBackup,
  FileText,
  History,
  Package,
  PackageCheck,
  ShoppingBag,
  Tags,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

type ModuleGroup = "operacion" | "soporte";

interface AdminModuleCard {
  href: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  group: ModuleGroup;
}

const MODULE_CARDS: AdminModuleCard[] = [
  {
    href: "/admin/productos",
    title: "Administracion de productos",
    description: "Edita catalogo, precios y visibilidad del escaparate.",
    icon: Package,
    group: "operacion",
  },
  {
    href: "/admin/catalogo/categorias",
    title: "Categorias del catalogo",
    description: "Ordena lineas y estructura la navegacion del catalogo.",
    icon: Tags,
    group: "operacion",
  },
  {
    href: "/admin/catalogo/inventario",
    title: "Inventario",
    description: "Controla existencias, reservas y alertas operativas.",
    icon: PackageCheck,
    group: "operacion",
  },
  {
    href: "/admin/pedidos",
    title: "Pedidos",
    description: "Revisa compras, estados y acciones del equipo comercial.",
    icon: ShoppingBag,
    group: "operacion",
  },
  {
    href: "/admin/ventas",
    title: "Ventas y Reportes",
    description:
      "Analiza tendencias, historial y proyecciones de ventas por producto.",
    icon: BarChart3,
    group: "operacion",
  },
  {
    href: "/admin/contenido",
    title: "Informacion de empresa",
    description: "Actualiza politicas, terminos, mision, vision y valores.",
    icon: FileText,
    group: "operacion",
  },
  {
    href: "/admin/usuarios",
    title: "Administracion de usuarios",
    description: "Gestiona roles, estado y acceso al panel administrativo.",
    icon: Users,
    group: "soporte",
  },
  {
    href: "/admin/auditoria",
    title: "Monitoreo y auditoria",
    description: "Supervisa actividad, recursos y trazabilidad del sistema.",
    icon: History,
    group: "soporte",
  },
  {
    href: "/admin/respaldos",
    title: "Respaldos de base de datos",
    description: "Crea y restaura copias de seguridad del proyecto.",
    icon: DatabaseBackup,
    group: "soporte",
  },
];

const OPERATION_MODULES = MODULE_CARDS.filter(
  (module) => module.group === "operacion",
);
const SUPPORT_MODULES = MODULE_CARDS.filter(
  (module) => module.group === "soporte",
);

const SUMMARY_STATS = [
  {
    label: "Modulos activos",
    value: String(MODULE_CARDS.length),
    helper: "Panel completo disponible",
  },
  {
    label: "Operacion comercial",
    value: String(OPERATION_MODULES.length),
    helper: "Catalogo, pedidos y contenido",
  },
  {
    label: "Control y soporte",
    value: String(SUPPORT_MODULES.length),
    helper: "Usuarios, auditoria y respaldos",
  },
];

function groupLabel(group: ModuleGroup) {
  return group === "operacion" ? "Operacion" : "Soporte";
}

function ModuleCard({ module }: { module: AdminModuleCard }) {
  return (
    <article className="admin-section-card flex min-h-[10.5rem] flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <module.icon className="h-4 w-4" />
        </div>
        <Badge variant={module.group === "operacion" ? "secondary" : "outline"}>
          {groupLabel(module.group)}
        </Badge>
      </div>

      <h4 className="mt-3 text-base font-semibold text-foreground">
        {module.title}
      </h4>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {module.description}
      </p>

      <Link
        href={module.href}
        className="mt-auto inline-flex items-center gap-2 pt-4 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
      >
        Abrir modulo
        <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  );
}

export default function AdminPage() {
  return (
    <section className="admin-panel-shell admin-animate-card">
      <div className="relative z-10">
        <Badge variant="secondary" className="w-fit">
          Centro operativo
        </Badge>
        <h3 className="mt-3 text-xl font-semibold tracking-tight text-primary">
          Resumen general del panel
        </h3>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
          Usa esta portada para entrar rapido a cada modulo. Dejamos juntos los
          flujos comerciales del sitio y, aparte, los modulos de control y
          soporte.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {SUMMARY_STATS.map((item) => (
            <div key={item.label} className="admin-metric-card">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                {item.value}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {item.helper}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
          <div className="admin-table-shell">
            <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Ruta principal
                </p>
                <h4 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                  Operacion comercial
                </h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Modulos para administrar catalogo, stock, pedidos y contenido
                  publico.
                </p>
              </div>
              <Badge variant="secondary">
                {OPERATION_MODULES.length} modulos
              </Badge>
            </div>

            <div className="grid gap-3 p-4 md:grid-cols-2">
              {OPERATION_MODULES.map((module) => (
                <ModuleCard key={module.href} module={module} />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="admin-form-card">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Orden sugerido
              </p>
              <h4 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                Flujo recomendado de trabajo
              </h4>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Si vas a operar el negocio dia a dia, normalmente conviene
                revisar primero inventario y pedidos, luego productos y al final
                contenido si hubo cambios editoriales.
              </p>

              <div className="mt-4 grid gap-2">
                <div className="admin-stat-chip">
                  <span className="font-medium">1.</span> Inventario y alertas
                </div>
                <div className="admin-stat-chip">
                  <span className="font-medium">2.</span> Pedidos y estados
                </div>
                <div className="admin-stat-chip">
                  <span className="font-medium">3.</span> Productos y catalogo
                </div>
                <div className="admin-stat-chip">
                  <span className="font-medium">4.</span> Contenido y textos
                  legales
                </div>
              </div>
            </div>

            <div className="admin-table-shell">
              <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Gobierno y soporte
                  </p>
                  <h4 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                    Control del sistema
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Accesos, trazabilidad y respaldo tecnico del proyecto.
                  </p>
                </div>
                <Badge variant="outline">
                  {SUPPORT_MODULES.length} modulos
                </Badge>
              </div>

              <div className="grid gap-3 p-4">
                {SUPPORT_MODULES.map((module) => (
                  <ModuleCard key={module.href} module={module} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
