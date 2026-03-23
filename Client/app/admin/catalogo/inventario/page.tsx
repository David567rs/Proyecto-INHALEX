import { PackageCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AdminCatalogInventoryPage() {
  return (
    <section className="admin-panel-shell admin-animate-card">
      <div className="relative z-10 max-w-3xl">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <PackageCheck className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-2xl font-semibold tracking-tight text-primary">
          Modulo de inventario
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Aqui se gestionaran existencias, alertas y movimientos.
        </p>

        <div className="admin-section-card mt-6 border-dashed bg-secondary/20 px-5 py-4">
          <p className="text-sm text-muted-foreground">
            Siguiente paso: agregar movimientos e historial de inventario.
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
