"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  Database,
  Download,
  HardDriveDownload,
  RefreshCw,
  ShieldCheck,
  Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getAccessToken } from "@/lib/auth/token-storage"
import {
  createAdminCollectionBackup,
  createAdminDatabaseBackup,
  exportAdminBackup,
  importAdminBackup,
  listAdminBackupCollections,
  listAdminBackups,
  type AdminBackupImportMode,
  type AdminBackupItem,
  type AdminBackupCollectionInfo,
} from "@/lib/admin/admin-api"

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "-"
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(1)} MB`
  return `${(mb / 1024).toFixed(2)} GB`
}

function totalBackupSize(item: AdminBackupItem): number {
  if (item.kind === "collection") return item.sizeBytes
  if (typeof item.bundleSizeBytes === "number") return item.bundleSizeBytes
  return item.collections.reduce((sum, current) => sum + current.sizeBytes, 0)
}

function backupLabel(item: AdminBackupItem): string {
  return item.kind === "database"
    ? `${item.id} - Base completa`
    : `${item.id} - Coleccion ${item.collection}`
}

export function AdminBackupsSection() {
  const [collections, setCollections] = useState<AdminBackupCollectionInfo[]>([])
  const [selectedCollection, setSelectedCollection] = useState("")
  const [backups, setBackups] = useState<AdminBackupItem[]>([])
  const [selectedBackupId, setSelectedBackupId] = useState("")
  const [importMode, setImportMode] = useState<AdminBackupImportMode>("replace")
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isCreatingDatabaseBackup, setIsCreatingDatabaseBackup] = useState(false)
  const [isCreatingCollectionBackup, setIsCreatingCollectionBackup] = useState(false)
  const [isImportingBackup, setIsImportingBackup] = useState(false)
  const [downloadingById, setDownloadingById] = useState<Record<string, boolean>>({})
  const [errorMessage, setErrorMessage] = useState("")
  const [resultMessage, setResultMessage] = useState("")

  const collectionsByName = useMemo(
    () => [...collections].sort((a, b) => a.name.localeCompare(b.name, "es-MX")),
    [collections],
  )

  const loadAll = useCallback(async (withLoadingState = true) => {
    if (withLoadingState) {
      setIsLoading(true)
    } else {
      setIsRefreshing(true)
    }

    setErrorMessage("")

    const token = getAccessToken()
    if (!token) {
      setErrorMessage("No se encontro token de acceso")
      setCollections([])
      setBackups([])
      setIsLoading(false)
      setIsRefreshing(false)
      return
    }

    try {
      const [collectionsResponse, backupsResponse] = await Promise.all([
        listAdminBackupCollections(token),
        listAdminBackups(token, 30),
      ])
      setCollections(collectionsResponse.items)
      setBackups(backupsResponse.items)

      if (!selectedCollection && collectionsResponse.items.length > 0) {
        setSelectedCollection(collectionsResponse.items[0].name)
      } else if (
        selectedCollection &&
        !collectionsResponse.items.some((item) => item.name === selectedCollection)
      ) {
        setSelectedCollection(collectionsResponse.items[0]?.name ?? "")
      }

      if (!selectedBackupId && backupsResponse.items.length > 0) {
        setSelectedBackupId(backupsResponse.items[0].id)
      } else if (
        selectedBackupId &&
        !backupsResponse.items.some((item) => item.id === selectedBackupId)
      ) {
        setSelectedBackupId(backupsResponse.items[0]?.id ?? "")
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo cargar la seccion de respaldos"
      setErrorMessage(message)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [selectedBackupId, selectedCollection])

  useEffect(() => {
    void loadAll(true)
  }, [loadAll])

  const handleDatabaseBackup = async () => {
    const token = getAccessToken()
    if (!token) {
      setErrorMessage("No se encontro token de acceso")
      return
    }

    setIsCreatingDatabaseBackup(true)
    setErrorMessage("")
    setResultMessage("")

    try {
      const created = await createAdminDatabaseBackup(token)
      setResultMessage(
        `Respaldo completo creado (${created.totalCollections} colecciones, ${created.totalDocuments} documentos).`,
      )
      await loadAll(false)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo crear el respaldo completo"
      setErrorMessage(message)
    } finally {
      setIsCreatingDatabaseBackup(false)
    }
  }

  const handleCollectionBackup = async () => {
    if (!selectedCollection) {
      setErrorMessage("Selecciona una coleccion para crear respaldo")
      return
    }

    const token = getAccessToken()
    if (!token) {
      setErrorMessage("No se encontro token de acceso")
      return
    }

    setIsCreatingCollectionBackup(true)
    setErrorMessage("")
    setResultMessage("")

    try {
      const created = await createAdminCollectionBackup(selectedCollection, token)
      setResultMessage(
        `Respaldo de "${created.collection}" creado con ${created.count} documentos.`,
      )
      await loadAll(false)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo crear el respaldo por coleccion"
      setErrorMessage(message)
    } finally {
      setIsCreatingCollectionBackup(false)
    }
  }

  const handleExportBackup = async (backupId: string) => {
    const token = getAccessToken()
    if (!token) {
      setErrorMessage("No se encontro token de acceso")
      return
    }

    setDownloadingById((prev) => ({ ...prev, [backupId]: true }))
    setErrorMessage("")

    try {
      const exported = await exportAdminBackup(backupId, token)
      const url = URL.createObjectURL(exported.blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = exported.fileName
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      setResultMessage(`Respaldo ${backupId} exportado en JSON.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo exportar el respaldo"
      setErrorMessage(message)
    } finally {
      setDownloadingById((prev) => ({ ...prev, [backupId]: false }))
    }
  }

  const runImportBackup = async (backupId: string) => {
    const token = getAccessToken()
    if (!token) {
      setErrorMessage("No se encontro token de acceso")
      return
    }

    if (!backupId) {
      setErrorMessage("Selecciona un respaldo para importar")
      return
    }

    if (importMode === "replace") {
      const accepted = window.confirm(
        "Esta accion reemplazara datos actuales con el contenido del respaldo. Deseas continuar?",
      )
      if (!accepted) return
    }

    setIsImportingBackup(true)
    setErrorMessage("")
    setResultMessage("")

    try {
      const imported = await importAdminBackup(backupId, importMode, token)
      const collectionsCount = imported.collections.length
      const insertedTotal = imported.collections.reduce((sum, current) => sum + current.inserted, 0)
      const replacedTotal = imported.collections.reduce((sum, current) => sum + current.replaced, 0)
      const skippedTotal = imported.collections.reduce((sum, current) => sum + current.skipped, 0)

      setResultMessage(
        `Importacion completada (${collectionsCount} colecciones, insertados: ${insertedTotal}, reemplazados: ${replacedTotal}, omitidos: ${skippedTotal}).`,
      )
      await loadAll(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo importar el respaldo"
      setErrorMessage(message)
    } finally {
      setIsImportingBackup(false)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/85 p-6 shadow-sm backdrop-blur">
      <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/10 blur-2xl" />
      <div className="pointer-events-none absolute -left-8 bottom-0 h-28 w-28 rounded-full bg-emerald-400/10 blur-2xl" />

      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-primary">Respaldos</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Exporta e importa respaldos de base completa o por coleccion.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="transition-all hover:-translate-y-0.5"
          onClick={() => void loadAll(false)}
          disabled={isRefreshing || isLoading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Recargar
        </Button>
      </div>

      <div className="relative z-10 mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border/60 bg-secondary/25 px-4 py-3 text-sm">
          <span className="font-medium">Colecciones detectadas:</span> {collections.length}
        </div>
        <div className="rounded-xl border border-border/60 bg-secondary/25 px-4 py-3 text-sm">
          <span className="font-medium">Respaldos registrados:</span> {backups.length}
        </div>
        <div className="rounded-xl border border-border/60 bg-secondary/25 px-4 py-3 text-sm">
          <span className="font-medium">Seleccion actual:</span> {selectedCollection || "-"}
        </div>
      </div>

      <div className="relative z-10 mt-6 grid gap-3 rounded-xl border border-border/60 bg-card/80 p-4 lg:grid-cols-[1fr_auto_auto]">
        <Select
          value={selectedCollection}
          onValueChange={setSelectedCollection}
          disabled={isLoading || collectionsByName.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona una coleccion" />
          </SelectTrigger>
          <SelectContent>
            {collectionsByName.map((collection) => (
              <SelectItem key={collection.name} value={collection.name}>
                {collection.name} ({collection.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          onClick={() => void handleCollectionBackup()}
          disabled={isCreatingCollectionBackup || isLoading || !selectedCollection}
        >
          <HardDriveDownload
            className={`mr-2 h-4 w-4 ${isCreatingCollectionBackup ? "animate-spin" : ""}`}
          />
          {isCreatingCollectionBackup ? "Respaldando..." : "Respaldar coleccion"}
        </Button>

        <Button
          type="button"
          onClick={() => void handleDatabaseBackup()}
          disabled={isCreatingDatabaseBackup || isLoading}
        >
          <Database className={`mr-2 h-4 w-4 ${isCreatingDatabaseBackup ? "animate-spin" : ""}`} />
          {isCreatingDatabaseBackup ? "Respaldando..." : "Respaldar base completa"}
        </Button>
      </div>

      <div className="relative z-10 mt-4 grid gap-3 rounded-xl border border-border/60 bg-card/80 p-4 lg:grid-cols-[1fr_190px_auto]">
        <Select
          value={selectedBackupId}
          onValueChange={setSelectedBackupId}
          disabled={isLoading || backups.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un respaldo para importar" />
          </SelectTrigger>
          <SelectContent>
            {backups.map((backup) => (
              <SelectItem key={`import-${backup.id}`} value={backup.id}>
                {backupLabel(backup)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={importMode}
          onValueChange={(value) => setImportMode(value as AdminBackupImportMode)}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Modo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="replace">Reemplazar datos</SelectItem>
            <SelectItem value="append">Agregar sin borrar</SelectItem>
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="secondary"
          onClick={() => void runImportBackup(selectedBackupId)}
          disabled={isImportingBackup || isLoading || !selectedBackupId}
        >
          <Upload className={`mr-2 h-4 w-4 ${isImportingBackup ? "animate-spin" : ""}`} />
          {isImportingBackup ? "Importando..." : "Importar respaldo"}
        </Button>
      </div>

      {errorMessage && (
        <div className="relative z-10 mt-6 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <p className="inline-flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </p>
        </div>
      )}

      {resultMessage && (
        <div className="relative z-10 mt-4 rounded-xl border border-border/60 bg-secondary/30 px-4 py-3 text-sm text-foreground">
          <p className="inline-flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{resultMessage}</span>
          </p>
        </div>
      )}

      <div className="relative z-10 mt-6 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`backup-skeleton-${index}`}
              className="h-24 animate-pulse rounded-xl border border-border/60 bg-secondary/20"
            />
          ))
        ) : backups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-secondary/15 p-6 text-center">
            <p className="font-medium text-foreground">Aun no hay respaldos registrados</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Crea tu primer respaldo completo o por coleccion.
            </p>
          </div>
        ) : (
          backups.map((backup) => {
            const isDownloading = Boolean(downloadingById[backup.id])

            return (
              <article
                key={`${backup.kind}-${backup.id}`}
                className="rounded-xl border border-border/60 bg-card/85 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {backup.kind === "database"
                        ? "Respaldo completo de base"
                        : `Respaldo de coleccion: ${backup.collection}`}
                    </h3>
                    <p className="text-xs text-muted-foreground">ID: {backup.id}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDate(backup.createdAt)}</p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-border/60 bg-secondary/30 px-2.5 py-1">
                    Tipo: {backup.kind === "database" ? "Base completa" : "Coleccion"}
                  </span>
                  {backup.kind === "database" ? (
                    <>
                      <span className="rounded-full border border-border/60 bg-secondary/30 px-2.5 py-1">
                        Colecciones: {backup.totalCollections}
                      </span>
                      <span className="rounded-full border border-border/60 bg-secondary/30 px-2.5 py-1">
                        Documentos: {backup.totalDocuments}
                      </span>
                    </>
                  ) : (
                    <span className="rounded-full border border-border/60 bg-secondary/30 px-2.5 py-1">
                      Documentos: {backup.count}
                    </span>
                  )}
                  <span className="rounded-full border border-border/60 bg-secondary/30 px-2.5 py-1">
                    Tamano: {formatBytes(totalBackupSize(backup))}
                  </span>
                </div>

                <p className="mt-3 text-xs text-muted-foreground">
                  Ruta relativa: <code>{backup.backupPath}</code>
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void handleExportBackup(backup.id)}
                    disabled={isDownloading}
                  >
                    <Download
                      className={`mr-2 h-4 w-4 ${isDownloading ? "animate-spin" : ""}`}
                    />
                    {isDownloading ? "Exportando..." : "Exportar JSON"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => void runImportBackup(backup.id)}
                    disabled={isImportingBackup}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Importar este respaldo
                  </Button>
                </div>
              </article>
            )
          })
        )}
      </div>
    </div>
  )
}
