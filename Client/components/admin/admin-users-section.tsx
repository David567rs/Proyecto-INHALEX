"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertTriangle, RefreshCw, Save, Users } from "lucide-react"
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
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [savingByUserId, setSavingByUserId] = useState<Record<string, boolean>>({})
  const [rowMessageByUserId, setRowMessageByUserId] = useState<Record<string, string>>({})

  const totalAdmins = useMemo(
    () => users.filter((currentUser) => currentUser.role === "admin").length,
    [users],
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

  const hasChanges = (currentUser: AuthUser): boolean => {
    const draft = draftsById[currentUser._id]
    if (!draft) return false
    return draft.role !== currentUser.role || draft.status !== currentUser.status
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
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/85 p-6 shadow-sm backdrop-blur">
      <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
      <div className="pointer-events-none absolute -left-6 bottom-0 h-24 w-24 rounded-full bg-emerald-400/10 blur-xl" />

      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-primary">Usuarios</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Gestión de usuarios conectada a <code>GET/PATCH /api/admin/users</code>
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

      <div className="relative z-10 mt-6 flex flex-wrap gap-3">
        <div className="rounded-xl border border-border/60 bg-secondary/25 px-4 py-3 text-sm transition-all hover:-translate-y-0.5 hover:bg-secondary/35">
          <span className="font-medium">Total usuarios:</span> {users.length}
        </div>
        <div className="rounded-xl border border-border/60 bg-secondary/25 px-4 py-3 text-sm transition-all hover:-translate-y-0.5 hover:bg-secondary/35">
          <span className="font-medium">Total administradores:</span> {totalAdmins}
        </div>
        <div className="rounded-xl border border-border/60 bg-secondary/25 px-4 py-3 text-sm transition-all hover:-translate-y-0.5 hover:bg-secondary/35">
          <span className="font-medium">Tu rol:</span> {user?.role ? roleLabel(user.role) : "-"}
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

      <div className="relative z-10 mt-6 overflow-hidden rounded-xl border border-border/60 bg-card/80">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/30">
              <TableHead>Usuario</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`user-skeleton-${index}`} className="animate-pulse">
                  <TableCell>
                    <div className="h-4 w-36 rounded bg-secondary/60" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-52 rounded bg-secondary/60" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-28 rounded-md bg-secondary/60" />
                      <div className="h-6 w-24 rounded-full bg-secondary/60" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-32 rounded-md bg-secondary/60" />
                      <div className="h-6 w-24 rounded-full bg-secondary/60" />
                    </div>
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
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-3 rounded-xl border border-dashed border-border/70 bg-secondary/20 px-6 py-8">
                    <div className="rounded-full bg-primary/10 p-3 text-primary">
                      <Users className="h-5 w-5" />
                    </div>
                    <p className="font-medium text-foreground">No hay usuarios para mostrar</p>
                    <p className="text-xs">Cuando existan usuarios registrados apareceran aqui.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              users.map((currentUser, index) => {
                const draft = draftsById[currentUser._id]
                const isSaving = Boolean(savingByUserId[currentUser._id])
                const rowMessage = rowMessageByUserId[currentUser._id]

                return (
                  <TableRow
                    key={currentUser._id}
                    className="transition-colors hover:bg-secondary/20 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500"
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <TableCell className="font-medium">{currentUser.name}</TableCell>
                    <TableCell>{currentUser.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          value={draft?.role ?? currentUser.role}
                          onValueChange={(value) =>
                            updateDraft(currentUser._id, { role: value as AuthUser["role"] })
                          }
                          disabled={isSaving}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">{roleLabel("user")}</SelectItem>
                            <SelectItem value="admin">{roleLabel("admin")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Badge variant={(draft?.role ?? currentUser.role) === "admin" ? "default" : "secondary"}>
                          {roleLabel(draft?.role ?? currentUser.role)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          value={draft?.status ?? currentUser.status}
                          onValueChange={(value) =>
                            updateDraft(currentUser._id, { status: value as AuthUser["status"] })
                          }
                          disabled={isSaving}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">{userStatusLabel("active")}</SelectItem>
                            <SelectItem value="inactive">{userStatusLabel("inactive")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Badge variant={(draft?.status ?? currentUser.status) === "active" ? "outline" : "destructive"}>
                          {userStatusLabel(draft?.status ?? currentUser.status)}
                        </Badge>
                      </div>
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
  )
}
