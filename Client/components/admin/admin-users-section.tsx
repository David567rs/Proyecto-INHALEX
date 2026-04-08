"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  RefreshCw,
  Save,
  ShieldCheck,
  Users,
} from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getAccessToken } from "@/lib/auth/token-storage"
import { listAdminUsers, updateAdminUser } from "@/lib/admin/admin-api"
import type { AuthUser } from "@/lib/auth/types"
import { cn } from "@/lib/utils"

interface UserDraft {
  role: AuthUser["role"]
  status: AuthUser["status"]
}

function formatDate(value?: string): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function roleLabel(role: AuthUser["role"]): string {
  return role === "admin" ? "Administrador" : "Usuario"
}

function userStatusLabel(status: AuthUser["status"]): string {
  return status === "active" ? "Activo" : "Inactivo"
}

export function AdminUsersSection() {
  const { user } = useAuth()
  const [users, setUsers] = useState<AuthUser[]>([])
  const [draftsById, setDraftsById] = useState<Record<string, UserDraft>>({})
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [savingByUserId, setSavingByUserId] = useState<Record<string, boolean>>({})
  const [rowMessageByUserId, setRowMessageByUserId] = useState<Record<string, string>>({})

  const hasChanges = useCallback(
    (currentUser: AuthUser): boolean => {
      const draft = draftsById[currentUser._id]
      if (!draft) return false
      return draft.role !== currentUser.role || draft.status !== currentUser.status
    },
    [draftsById],
  )

  const totalAdmins = useMemo(
    () => users.filter((currentUser) => currentUser.role === "admin").length,
    [users],
  )
  const totalActive = useMemo(
    () => users.filter((currentUser) => currentUser.status === "active").length,
    [users],
  )
  const totalInactive = useMemo(
    () => users.filter((currentUser) => currentUser.status === "inactive").length,
    [users],
  )
  const pendingChangesCount = useMemo(
    () => users.filter((currentUser) => hasChanges(currentUser)).length,
    [hasChanges, users],
  )
  const editingUser = useMemo(
    () => users.find((currentUser) => currentUser._id === editingUserId) ?? null,
    [editingUserId, users],
  )

  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage("")

    const token = getAccessToken()
    if (!token) {
      setUsers([])
      setErrorMessage("No se encontro token de acceso")
      setIsLoading(false)
      return
    }

    try {
      const response = await listAdminUsers(token)
      setUsers(response)
      setDraftsById(
        response.reduce<Record<string, UserDraft>>((acc, currentUser) => {
          acc[currentUser._id] = {
            role: currentUser.role,
            status: currentUser.status,
          }
          return acc
        }, {}),
      )
      setEditingUserId((prev) =>
        prev && response.some((currentUser) => currentUser._id === prev) ? prev : null,
      )
      setRowMessageByUserId({})
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudieron cargar los usuarios"
      setErrorMessage(message)
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user?.role === "admin") {
      void loadUsers()
    }
  }, [loadUsers, user?.role])

  const updateDraft = (userId: string, draft: Partial<UserDraft>) => {
    setEditingUserId(userId)
    setDraftsById((prev) => {
      const previous = prev[userId]
      if (!previous) return prev
      return {
        ...prev,
        [userId]: {
          ...previous,
          ...draft,
        },
      }
    })

    setRowMessageByUserId((prev) => ({
      ...prev,
      [userId]: "",
    }))
  }

  const saveUser = async (currentUser: AuthUser) => {
    const token = getAccessToken()
    if (!token) {
      setRowMessageByUserId((prev) => ({
        ...prev,
        [currentUser._id]: "No se encontro token",
      }))
      return
    }

    const draft = draftsById[currentUser._id]
    if (!draft) return

    const payload: Partial<UserDraft> = {}
    if (draft.role !== currentUser.role) payload.role = draft.role
    if (draft.status !== currentUser.status) payload.status = draft.status

    if (Object.keys(payload).length === 0) {
      setRowMessageByUserId((prev) => ({
        ...prev,
        [currentUser._id]: "No hay cambios",
      }))
      return
    }

    setSavingByUserId((prev) => ({
      ...prev,
      [currentUser._id]: true,
    }))

    try {
      const updatedUser = await updateAdminUser(currentUser._id, payload, token)

      setUsers((prev) =>
        prev.map((existingUser) =>
          existingUser._id === updatedUser._id ? updatedUser : existingUser,
        ),
      )

      setDraftsById((prev) => ({
        ...prev,
        [currentUser._id]: {
          role: updatedUser.role,
          status: updatedUser.status,
        },
      }))

      setRowMessageByUserId((prev) => ({
        ...prev,
        [currentUser._id]: "Guardado",
      }))
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo actualizar el usuario"
      setRowMessageByUserId((prev) => ({
        ...prev,
        [currentUser._id]: message,
      }))
    } finally {
      setSavingByUserId((prev) => ({
        ...prev,
        [currentUser._id]: false,
      }))
    }
  }

  return (
    <div className="admin-panel-shell admin-animate-card">
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-primary">Usuarios</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Gestion conectada a <code>GET/PATCH /api/admin/users</code>.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="transition-all hover:-translate-y-0.5"
          onClick={() => void loadUsers()}
          disabled={isLoading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Recargar usuarios
        </Button>
      </div>

      <div className="relative z-10 mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="admin-metric-card">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Total de cuentas
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {users.length}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Cuentas registradas.
          </p>
        </div>

        <div className="admin-metric-card">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Administradores
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {totalAdmins}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Con acceso al panel.
          </p>
        </div>

        <div className="admin-metric-card">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Estado operativo
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {totalActive}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {totalInactive} inactivos.
          </p>
        </div>

        <div className="admin-metric-card">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Cambios pendientes
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {pendingChangesCount}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Filas sin guardar.
          </p>
        </div>
      </div>

      <div className="relative z-10 mt-6 grid gap-4 xl:grid-cols-[0.96fr_1.04fr]">
        <div className="admin-form-card">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="h-4 w-4" />
            Controles del modulo
          </p>
          <h3 className="mt-3 text-xl font-semibold tracking-tight text-foreground">
            Roles y estados del panel
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Gestiona acceso operativo sin tocar informacion comercial del usuario.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="admin-stat-chip">
              <span className="font-medium">Tu rol:</span> {user?.role ? roleLabel(user.role) : "-"}
            </div>
            <div className="admin-stat-chip">
              <span className="font-medium">Tu estado:</span>{" "}
              {user?.status ? userStatusLabel(user.status) : "-"}
            </div>
            <div className="admin-stat-chip">
              <span className="font-medium">Seguridad:</span> solo admin puede editar
            </div>
            <div className="admin-stat-chip">
              <span className="font-medium">Flujo:</span> cambios por fila
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-primary/15 bg-primary/[0.05] px-4 py-3 text-sm text-muted-foreground">
            Usa este modulo para ajustar permisos y estado de acceso. Los cambios se aplican
            usuario por usuario para evitar errores masivos.
          </div>
        </div>

        <div className="admin-form-card">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Estado de edicion
          </p>
          <h3 className="mt-3 text-xl font-semibold tracking-tight text-foreground">
            {editingUser ? editingUser.name : "Sin usuario en foco"}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {editingUser
              ? "Resumen del usuario en foco."
              : "Al editar una fila, aparece aqui para darte contexto inmediato."}
          </p>

          {editingUser ? (
            <div className="mt-5 grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="admin-stat-chip">
                  <span className="font-medium">Correo:</span> {editingUser.email}
                </div>
                <div className="admin-stat-chip">
                  <span className="font-medium">Creado:</span> {formatDate(editingUser.createdAt)}
                </div>
                <div className="admin-stat-chip">
                  <span className="font-medium">Rol:</span> {roleLabel(editingUser.role)}
                </div>
                <div className="admin-stat-chip">
                  <span className="font-medium">Estado:</span>{" "}
                  {userStatusLabel(editingUser.status)}
                </div>
              </div>

              {hasChanges(editingUser) && (
                <Badge className="w-fit shadow-[0_10px_28px_-18px_rgba(22,163,74,0.75)]">
                  Cambio pendiente
                </Badge>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingUserId(null)}
                >
                  Limpiar foco
                </Button>
              </div>
            </div>
          ) : (
            <div className="admin-empty-state mt-5 max-w-none items-start text-left">
              <div className="rounded-full bg-primary/10 p-3 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-foreground">Todavia no hay un usuario en edicion</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Al editar una fila, veras su resumen.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="relative z-10 mt-6 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <p className="inline-flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </p>
        </div>
      )}

      <div className="admin-table-shell relative z-10 mt-6">
        <div className="flex flex-col gap-3 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Listado principal
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
              Cuentas registradas
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Revisa correos, define rol y actualiza estado operativo desde una sola tabla.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{users.length} cuentas</Badge>
            <Badge variant="secondary">{pendingChangesCount} pendientes</Badge>
          </div>
        </div>
        <div className="admin-table-scroll">
          <Table>
            <TableHeader>
              <TableRow className="admin-table-head-row">
                <TableHead className="admin-table-head-cell">Usuario</TableHead>
                <TableHead className="admin-table-head-cell">Email</TableHead>
                <TableHead className="admin-table-head-cell">Rol</TableHead>
                <TableHead className="admin-table-head-cell">Estado</TableHead>
                <TableHead className="admin-table-head-cell">Creado</TableHead>
                <TableHead className="admin-table-head-cell">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="admin-table-body-compact">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={`user-skeleton-${index}`} className="animate-pulse bg-background/40">
                    <TableCell>
                      <div className="h-4 w-36 rounded bg-secondary/60" />
                    </TableCell>
                    <TableCell>
                      <div className="h-4 w-52 rounded bg-secondary/60" />
                    </TableCell>
                    <TableCell>
                      <div className="h-9 w-36 rounded-md bg-secondary/60" />
                    </TableCell>
                    <TableCell>
                      <div className="h-9 w-32 rounded-md bg-secondary/60" />
                    </TableCell>
                    <TableCell>
                      <div className="h-4 w-40 rounded bg-secondary/60" />
                    </TableCell>
                    <TableCell>
                      <div className="h-9 w-28 rounded-md bg-secondary/60" />
                    </TableCell>
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    <div className="admin-empty-state">
                      <div className="rounded-full bg-primary/10 p-3 text-primary">
                        <Users className="h-5 w-5" />
                      </div>
                      <p className="font-medium text-foreground">No hay usuarios para mostrar</p>
                      <p className="text-xs">Los usuarios registrados apareceran aqui.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((currentUser, index) => {
                  const draft = draftsById[currentUser._id]
                  const isSaving = Boolean(savingByUserId[currentUser._id])
                  const rowMessage = rowMessageByUserId[currentUser._id]
                  const hasPendingChanges = hasChanges(currentUser)
                  const currentRole = draft?.role ?? currentUser.role
                  const currentStatus = draft?.status ?? currentUser.status

                  return (
                    <TableRow
                      key={currentUser._id}
                      className={cn(
                        "transition-colors hover:bg-secondary/20 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500",
                        hasPendingChanges && "bg-primary/[0.035]",
                      )}
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{currentUser.name}</p>
                          {hasPendingChanges && (
                            <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                              Cambio pendiente
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>{currentUser.email}</TableCell>

                      <TableCell>
                        <Select
                          value={currentRole}
                          onValueChange={(value) =>
                            updateDraft(currentUser._id, { role: value as AuthUser["role"] })
                          }
                          disabled={isSaving}
                        >
                          <SelectTrigger className="admin-input-surface w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">{roleLabel("user")}</SelectItem>
                            <SelectItem value="admin">{roleLabel("admin")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell>
                        <Select
                          value={currentStatus}
                          onValueChange={(value) =>
                            updateDraft(currentUser._id, { status: value as AuthUser["status"] })
                          }
                          disabled={isSaving}
                        >
                          <SelectTrigger className="admin-input-surface w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">{userStatusLabel("active")}</SelectItem>
                            <SelectItem value="inactive">{userStatusLabel("inactive")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell>{formatDate(currentUser.createdAt)}</TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            type="button"
                            className="transition-all hover:-translate-y-0.5"
                            onClick={() => void saveUser(currentUser)}
                            disabled={!hasChanges(currentUser) || isSaving}
                          >
                            <Save className="mr-1 h-4 w-4" />
                            {isSaving ? "Guardando..." : "Guardar"}
                          </Button>
                          {rowMessage && <span className="text-xs text-muted-foreground">{rowMessage}</span>}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
