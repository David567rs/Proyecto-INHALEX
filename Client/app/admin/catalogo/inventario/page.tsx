import { PackageCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AdminCatalogInventoryPage() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/85 p-6 shadow-sm backdrop-blur">
      <div className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-primary/10 blur-2xl" />
      <div className="pointer-events-none absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-emerald-400/10 blur-2xl" />

      <div className="relative z-10 max-w-3xl">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <PackageCheck className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-2xl font-semibold tracking-tight text-primary">
          Modulo de inventario
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Aqui podremos gestionar existencias por producto, alertas de stock bajo y movimientos de
          entrada/salida.
        </p>

        <div className="mt-6 rounded-xl border border-dashed border-border/70 bg-secondary/20 px-5 py-4">
          <p className="text-sm text-muted-foreground">
            Siguiente paso sugerido: agregar entidad de movimientos para historico de inventario y
            conciliacion en panel admin.
          </p>
        </div>

        <div className="mt-5">
          <Button type="button" disabled>
            Proximamente
          </Button>
        </div>
      </div>
    </section>
  )
}
