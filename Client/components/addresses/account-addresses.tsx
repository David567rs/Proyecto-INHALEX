"use client"

import { useState } from "react"
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react"
import { useAddresses } from "@/components/addresses/addresses-provider"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import type {
  ShippingAddress,
  ShippingAddressInput,
} from "@/lib/addresses/addresses-api"

const EMPTY_ADDRESS: ShippingAddressInput = {
  label: "",
  recipientName: "",
  phone: "",
  street: "",
  exteriorNumber: "",
  interiorNumber: "",
  neighborhood: "",
  municipality: "",
  state: "",
  postalCode: "",
  references: "",
  isDefault: false,
}

function formatAddress(address: ShippingAddress): string {
  const number = address.interiorNumber
    ? `${address.exteriorNumber}, int. ${address.interiorNumber}`
    : address.exteriorNumber
  return `${address.street} ${number}, ${address.neighborhood}, ${address.municipality}, ${address.state}, C.P. ${address.postalCode}`
}

export function AccountAddresses() {
  const {
    addresses,
    isLoading,
    createAddress,
    updateAddress,
    removeAddress,
    setDefaultAddress,
  } = useAddresses()
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ShippingAddressInput>(EMPTY_ADDRESS)
  const [isSaving, setIsSaving] = useState(false)
  const [addressToRemove, setAddressToRemove] =
    useState<ShippingAddress | null>(null)

  const openCreateDialog = () => {
    setEditingAddressId(null)
    setDraft(EMPTY_ADDRESS)
    setIsDialogOpen(true)
  }

  const openEditDialog = (address: ShippingAddress) => {
    setEditingAddressId(address.id)
    setDraft({
      label: address.label,
      recipientName: address.recipientName,
      phone: address.phone,
      street: address.street,
      exteriorNumber: address.exteriorNumber,
      interiorNumber: address.interiorNumber ?? "",
      neighborhood: address.neighborhood,
      municipality: address.municipality,
      state: address.state,
      postalCode: address.postalCode,
      references: address.references ?? "",
      isDefault: address.isDefault,
    })
    setIsDialogOpen(true)
  }

  const updateDraft = (
    field: keyof ShippingAddressInput,
    value: string | boolean,
  ) => {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      if (editingAddressId) {
        await updateAddress(editingAddressId, draft)
      } else {
        await createAddress(draft)
      }
      setIsDialogOpen(false)
      toast({
        title: editingAddressId ? "Direccion actualizada" : "Direccion guardada",
        description: "Tus datos de envio ya estan disponibles en tu cuenta.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo guardar",
        description:
          error instanceof Error ? error.message : "Revisa los datos e intenta nuevamente.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemove = async (address: ShippingAddress) => {
    try {
      await removeAddress(address.id)
      setAddressToRemove(null)
      toast({
        title: "Direccion eliminada",
        description: `${address.label} ya no aparece en tu cuenta.`,
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo eliminar",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
      })
    }
  }

  const handleSetDefault = async (address: ShippingAddress) => {
    try {
      await setDefaultAddress(address.id)
      toast({
        title: "Direccion principal actualizada",
        description: `${address.label} se seleccionara primero en tus pedidos.`,
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo actualizar",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
      })
    }
  }

  return (
    <>
      <section className="rounded-[1.6rem] border border-border/60 bg-card p-5 shadow-sm sm:p-6 lg:col-span-2">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="rounded-full bg-primary/10 p-2 text-primary">
              <MapPin className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Direcciones de envio
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Guarda hasta cinco domicilios para confirmar pedidos mas rapido.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={addresses.length >= 5}
            onClick={openCreateDialog}
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar direccion
          </Button>
        </div>

        {isLoading ? (
          <p className="mt-5 rounded-xl bg-secondary/30 px-4 py-5 text-sm text-muted-foreground">
            Cargando tus direcciones...
          </p>
        ) : addresses.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-border/70 bg-secondary/20 px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Todavia no guardaste domicilios de entrega.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {addresses.map((address) => (
              <article
                key={address.id}
                className="rounded-xl border border-border/60 bg-background/85 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-foreground">
                        {address.label}
                      </h3>
                      {address.isDefault ? (
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-primary">
                          Principal
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {address.recipientName}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {formatAddress(address)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {address.phone}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {!address.isDefault ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="rounded-full"
                      onClick={() => void handleSetDefault(address)}
                    >
                      <Star className="mr-2 h-3.5 w-3.5" />
                      Hacer principal
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="rounded-full"
                    onClick={() => openEditDialog(address)}
                  >
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    Editar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="rounded-full text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
                    onClick={() => setAddressToRemove(address)}
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Eliminar
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingAddressId ? "Editar direccion" : "Agregar direccion"}
            </DialogTitle>
            <DialogDescription>
              Registra los datos necesarios para preparar la entrega.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="address-label">Nombre corto</Label>
              <Input
                id="address-label"
                value={draft.label}
                onChange={(event) => updateDraft("label", event.target.value)}
                placeholder="Casa u oficina"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address-recipient">Quien recibe</Label>
              <Input
                id="address-recipient"
                value={draft.recipientName}
                onChange={(event) =>
                  updateDraft("recipientName", event.target.value)
                }
                placeholder="Nombre completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address-phone">Telefono</Label>
              <Input
                id="address-phone"
                value={draft.phone}
                onChange={(event) =>
                  updateDraft("phone", event.target.value.replace(/\D/g, ""))
                }
                placeholder="10 a 15 digitos"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address-street">Calle</Label>
              <Input
                id="address-street"
                value={draft.street}
                onChange={(event) => updateDraft("street", event.target.value)}
                placeholder="Nombre de la calle"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="address-exterior">Numero exterior</Label>
                <Input
                  id="address-exterior"
                  value={draft.exteriorNumber}
                  onChange={(event) =>
                    updateDraft("exteriorNumber", event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address-interior">Interior</Label>
                <Input
                  id="address-interior"
                  value={draft.interiorNumber}
                  onChange={(event) =>
                    updateDraft("interiorNumber", event.target.value)
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address-neighborhood">Colonia</Label>
              <Input
                id="address-neighborhood"
                value={draft.neighborhood}
                onChange={(event) =>
                  updateDraft("neighborhood", event.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address-municipality">Municipio o alcaldia</Label>
              <Input
                id="address-municipality"
                value={draft.municipality}
                onChange={(event) =>
                  updateDraft("municipality", event.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address-state">Estado</Label>
              <Input
                id="address-state"
                value={draft.state}
                onChange={(event) => updateDraft("state", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address-postal-code">Codigo postal</Label>
              <Input
                id="address-postal-code"
                value={draft.postalCode}
                maxLength={5}
                onChange={(event) =>
                  updateDraft(
                    "postalCode",
                    event.target.value.replace(/\D/g, ""),
                  )
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address-references">Referencias opcionales</Label>
              <Textarea
                id="address-references"
                value={draft.references}
                onChange={(event) =>
                  updateDraft("references", event.target.value)
                }
                placeholder="Entre calles, color de fachada o indicacion breve"
              />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Checkbox
                id="address-default"
                checked={draft.isDefault}
                onCheckedChange={(checked) =>
                  updateDraft("isDefault", checked === true)
                }
              />
              <Label htmlFor="address-default">
                Usar como direccion principal
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isSaving}
              onClick={() => void handleSave()}
            >
              {isSaving ? "Guardando..." : "Guardar direccion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(addressToRemove)}
        onOpenChange={(open) => {
          if (!open) setAddressToRemove(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar direccion?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion quitara el domicilio de tu cuenta. Los pedidos
              anteriores conservaran su informacion de envio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (addressToRemove) void handleRemove(addressToRemove)
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
