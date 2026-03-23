"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Cloud,
  Database,
  Download,
  HardDrive,
  HardDriveDownload,
  RefreshCw,
  Save,
  ShieldCheck,
  TimerReset,
  Upload,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getAccessToken } from "@/lib/auth/token-storage"
import {
  createAdminCollectionBackup,
  createAdminDatabaseBackup,
  exportAdminBackup,
  getAdminBackupSettings,
  getAdminBackupStatus,
  importAdminBackup,
  listAdminBackupCollections,
  listAdminBackups,
  runAdminBackupPolicy,
  updateAdminBackupSettings,
  type AdminBackupCollectionInfo,
  type AdminBackupImportMode,
  type AdminBackupItem,
  type AdminBackupSettings,
  type AdminBackupStatusSummary,
} from "@/lib/admin/admin-api"

type BackupSettingsDraft = {
  automaticEnabled: boolean
  rpoMinutes: string
  rtoMinutes: string
  backupScope: AdminBackupSettings["backupScope"]
  selectedCollections: string[]
  preferredStorage: AdminBackupSettings["preferredStorage"]
  localDownloadsEnabled: boolean
  keepLocalMirror: boolean
  retentionDays: string
  cloudFolder: string
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

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "-"
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(1)} MB`
  return `${(mb / 1024).toFixed(2)} GB`
}

function formatMinutes(value: string): string {
  const minutes = Number(value)
  if (!Number.isFinite(minutes) || minutes <= 0) return "-"
  if (minutes < 60) return `${minutes} min`
  if (minutes < 1440) {
    return `${(minutes / 60).toFixed(minutes % 60 === 0 ? 0 : 1)} h`
  }
  return `${(minutes / 1440).toFixed(minutes % 1440 === 0 ? 0 : 1)} dias`
}

function toDraft(settings: AdminBackupSettings): BackupSettingsDraft {
  return {
    automaticEnabled: settings.automaticEnabled,
    rpoMinutes: String(settings.rpoMinutes),
    rtoMinutes: String(settings.rtoMinutes),
    backupScope: settings.backupScope,
    selectedCollections: settings.selectedCollections,
    preferredStorage: settings.preferredStorage,
    localDownloadsEnabled: settings.localDownloadsEnabled,
    keepLocalMirror: settings.keepLocalMirror,
    retentionDays: String(settings.retentionDays),
    cloudFolder: settings.cloudFolder,
  }
}

function backupLabel(item: AdminBackupItem): string {
  if (item.kind === "database") return "Base completa"
  return item.collection
}

function totalBackupSize(item: AdminBackupItem): number {
  if (item.kind === "collection") return item.sizeBytes
  return item.bundleSizeBytes ?? 0
}

function statusVariant(status: AdminBackupItem["status"]): "default" | "secondary" | "destructive" | "outline" {
  if (status === "ready") return "default"
  if (status === "failed") return "destructive"
  if (status === "purged") return "outline"
  return "secondary"
}

function statusLabel(status: AdminBackupItem["status"]): string {
  if (status === "ready") return "Listo"
  if (status === "failed") return "Fallido"
  if (status === "purged") return "Purgado"
  return status
}

function triggerLabel(trigger: AdminBackupItem["trigger"]): string {
  return trigger === "automatic" ? "Automatico" : "Manual"
}

function storageLabel(storage: AdminBackupSettings["preferredStorage"]): string {
  return storage === "cloudinary" ? "Cloudinary" : "Local"
}

function isBackupReady(item: AdminBackupItem): boolean {
  return item.status === "ready"
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-36 animate-pulse rounded-3xl border border-border/60 bg-muted/40"
        />
      ))}
    </div>
  )
}

export function AdminBackupsSection() {
  const [collections, setCollections] = useState<AdminBackupCollectionInfo[]>([])
  const [backups, setBackups] = useState<AdminBackupItem[]>([])
  const [status, setStatus] = useState<AdminBackupStatusSummary | null>(null)
  const [settings, setSettings] = useState<AdminBackupSettings | null>(null)
  const [draft, setDraft] = useState<BackupSettingsDraft | null>(null)
  const [selectedCollection, setSelectedCollection] = useState("")
  const [selectedBackupId, setSelectedBackupId] = useState("")
  const [importMode, setImportMode] = useState<AdminBackupImportMode>("replace")
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [isCreatingDatabaseBackup, setIsCreatingDatabaseBackup] = useState(false)
  const [isCreatingCollectionBackup, setIsCreatingCollectionBackup] = useState(false)
  const [isRunningPolicy, setIsRunningPolicy] = useState(false)
  const [isImportingBackup, setIsImportingBackup] = useState(false)
  const [downloadingById, setDownloadingById] = useState<Record<string, boolean>>({})
  const [errorMessage, setErrorMessage] = useState("")
  const [resultMessage, setResultMessage] = useState("")

  const sortedCollections = useMemo(
    () => [...collections].sort((a, b) => a.name.localeCompare(b.name, "es-MX")),
    [collections],
  )

  const collectionDocumentCount = useMemo(
    () => sortedCollections.reduce((sum, collection) => sum + collection.count, 0),
    [sortedCollections],
  )

  const projectedProtectedDocuments = useMemo(() => {
    if (!draft) return 0
    if (draft.backupScope === "database") return collectionDocumentCount
    const active = new Set(draft.selectedCollections)
    return sortedCollections.reduce(
      (sum, collection) => sum + (active.has(collection.name) ? collection.count : 0),
      0,
    )
  }, [collectionDocumentCount, draft, sortedCollections])

  const selectedBackup = useMemo(
    () => backups.find((item) => item.id === selectedBackupId) ?? null,
    [backups, selectedBackupId],
  )

  const readyBackups = useMemo(
    () => backups.filter((item) => item.status === "ready"),
    [backups],
  )

  const loadAll = async (withLoadingState = true) => {
    if (withLoadingState) setIsLoading(true)
    else setIsRefreshing(true)

    const token = getAccessToken()
    if (!token) {
      setErrorMessage("No se encontro token de acceso")
      setIsLoading(false)
      setIsRefreshing(false)
      return
    }

    setErrorMessage("")

    try {
      const [collectionsResponse, backupsResponse, statusResponse, settingsResponse] = await Promise.all([
        listAdminBackupCollections(token),
        listAdminBackups(token, 50),
        getAdminBackupStatus(token),
        getAdminBackupSettings(token),
      ])

      setCollections(collectionsResponse.items)
      setBackups(backupsResponse.items)
      setStatus(statusResponse)
      setSettings(settingsResponse)
      setDraft((current) => current ?? toDraft(settingsResponse))
      setSelectedCollection((current) => {
        const exists = collectionsResponse.items.some((item) => item.name === current)
        if (exists) return current
        return collectionsResponse.items[0]?.name ?? ""
      })
      setSelectedBackupId((current) => {
        const exists = backupsResponse.items.some((item) => item.id === current)
        if (exists) return current
        return backupsResponse.items[0]?.id ?? ""
      })
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo cargar el centro de respaldos",
      )
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    void loadAll(true)
  }, [])

  const toggleCollection = (collectionName: string) => {
    if (!draft) return
    const exists = draft.selectedCollections.includes(collectionName)
    setDraft({
      ...draft,
      selectedCollections: exists
        ? draft.selectedCollections.filter((item) => item !== collectionName)
        : [...draft.selectedCollections, collectionName].sort((a, b) => a.localeCompare(b, "es-MX")),
    })
  }

  const saveSettings = async () => {
    if (!draft) return
    const token = getAccessToken()
    if (!token) {
      setErrorMessage("No se encontro token de acceso")
      return
    }

    const rpoMinutes = Number(draft.rpoMinutes)
    const rtoMinutes = Number(draft.rtoMinutes)
    const retentionDays = Number(draft.retentionDays)
    const cloudFolder = draft.cloudFolder.trim()

    if (!Number.isInteger(rpoMinutes) || rpoMinutes < 15 || rpoMinutes > 10080) {
      setErrorMessage("El RPO debe ser un entero entre 15 y 10080 minutos.")
      return
    }
    if (!Number.isInteger(rtoMinutes) || rtoMinutes < 5 || rtoMinutes > 1440) {
      setErrorMessage("El RTO debe ser un entero entre 5 y 1440 minutos.")
      return
    }
    if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 3650) {
      setErrorMessage("La retencion debe estar entre 1 y 3650 dias.")
      return
    }
    if (draft.backupScope === "selectedCollections" && draft.selectedCollections.length === 0) {
      setErrorMessage("Selecciona al menos una coleccion para la estrategia segmentada.")
      return
    }
    if (cloudFolder.length > 120) {
      setErrorMessage("La carpeta remota no puede exceder 120 caracteres.")
      return
    }

    setIsSavingSettings(true)
    setErrorMessage("")
    setResultMessage("")

    try {
      const updated = await updateAdminBackupSettings(
        {
          automaticEnabled: draft.automaticEnabled,
          rpoMinutes,
          rtoMinutes,
          backupScope: draft.backupScope,
          selectedCollections: draft.selectedCollections,
          preferredStorage: draft.preferredStorage,
          localDownloadsEnabled: draft.localDownloadsEnabled,
          keepLocalMirror: draft.keepLocalMirror,
          retentionDays,
          cloudFolder,
        },
        token,
      )
      setSettings(updated)
      setDraft(toDraft(updated))
      setResultMessage("La estrategia de continuidad se guardo correctamente.")
      await loadAll(false)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo guardar la configuracion")
    } finally {
      setIsSavingSettings(false)
    }
  }

  const createDatabaseBackup = async () => {
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
      setResultMessage(`Respaldo completo generado con ${created.totalCollections} colecciones.`)
      await loadAll(false)
      setSelectedBackupId(created.id)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo generar el respaldo completo")
    } finally {
      setIsCreatingDatabaseBackup(false)
    }
  }

  const createCollectionBackup = async () => {
    if (!selectedCollection) {
      setErrorMessage("Selecciona una coleccion para generar su respaldo.")
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
      setResultMessage(`Respaldo de ${created.collection} generado correctamente.`)
      await loadAll(false)
      setSelectedBackupId(created.id)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo generar el respaldo por coleccion")
    } finally {
      setIsCreatingCollectionBackup(false)
    }
  }

  const runPolicy = async () => {
    const token = getAccessToken()
    if (!token) {
      setErrorMessage("No se encontro token de acceso")
      return
    }

    setIsRunningPolicy(true)
    setErrorMessage("")
    setResultMessage("")

    try {
      const response = await runAdminBackupPolicy(token)
      setResultMessage(`Politica ejecutada. Respaldos creados: ${response.created.length}.`)
      await loadAll(false)
      if (response.created[0]) setSelectedBackupId(response.created[0].id)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo ejecutar la estrategia")
    } finally {
      setIsRunningPolicy(false)
    }
  }

  const downloadBackup = async (backupId: string) => {
    if (!settings?.localDownloadsEnabled) {
      setErrorMessage("La descarga local esta desactivada por politica.")
      return
    }

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
      setResultMessage(`Respaldo ${backupId} guardado en tu equipo.`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo descargar el respaldo")
    } finally {
      setDownloadingById((prev) => ({ ...prev, [backupId]: false }))
    }
  }

  const importBackup = async (backupId: string) => {
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
      const accepted = window.confirm("Se reemplazaran datos actuales con el contenido del respaldo. Deseas continuar?")
      if (!accepted) return
    }

    setIsImportingBackup(true)
    setErrorMessage("")
    setResultMessage("")

    try {
      const imported = await importAdminBackup(backupId, importMode, token)
      setResultMessage(`Importacion completada sobre ${imported.collections.length} colecciones.`)
      await loadAll(false)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo importar el respaldo")
    } finally {
      setIsImportingBackup(false)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card/95 p-6 shadow-[0_20px_80px_-50px_rgba(15,23,42,0.45)] backdrop-blur">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(22,163,74,0.14),transparent_34%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_35%)]" />
      <div className="relative z-10 space-y-6">
        <div className="space-y-3">
          <Badge variant="outline" className="border-primary/30 bg-primary/5 px-3 py-1 text-primary">
            Centro de recuperacion
          </Badge>
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              Respaldos y continuidad operacional
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Controla estrategia, ejecucion y restauracion desde un solo tablero.
            </p>
          </div>
        </div>

        <div className="admin-toolbar-surface px-4 py-4 lg:sticky lg:top-0 lg:z-20">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Centro operativo</span>
              <Badge variant="secondary">{status?.totalReady ?? readyBackups.length} listos</Badge>
              <Badge variant="outline">
                {draft?.automaticEnabled ? "Automatico activo" : "Automatico pausado"}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-full px-5"
                onClick={() => void loadAll(false)}
                disabled={isRefreshing || isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                Recargar tablero
              </Button>
              <Button
                type="button"
                className="rounded-full px-5 shadow-[0_14px_40px_-18px_rgba(22,163,74,0.8)]"
                onClick={runPolicy}
                disabled={isRunningPolicy || isLoading}
              >
                <Bot className={`h-4 w-4 ${isRunningPolicy ? "animate-pulse" : ""}`} />
                Ejecutar politica ahora
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <LoadingGrid />
        ) : (
          <div className="grid gap-4 xl:grid-cols-4">
            <Card className="group min-h-[11.5rem] border-primary/15 bg-primary/[0.04] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
              <CardHeader className="gap-1">
                <CardDescription>Destino activo</CardDescription>
                <CardTitle className="flex items-center gap-2 text-xl">
                  {settings?.preferredStorage === "cloudinary" ? (
                    <Cloud className="h-5 w-5 text-primary" />
                  ) : (
                    <HardDrive className="h-5 w-5 text-primary" />
                  )}
                  {settings?.preferredStorage === "cloudinary" ? "Nube prioritaria" : "Almacen local"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  {settings?.preferredStorage === "cloudinary"
                    ? settings?.cloudinaryConfigured
                      ? "Cloudinary esta listo para recibir nuevos respaldos."
                      : "Faltan credenciales de Cloudinary. Se mantendra el respaldo local como respaldo alterno."
                    : "La estrategia actual guarda los archivos dentro del servidor."}
                </p>
              </CardContent>
            </Card>

            <Card className="min-h-[11.5rem] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
              <CardHeader className="gap-1">
                <CardDescription>RPO objetivo</CardDescription>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <TimerReset className="h-5 w-5 text-primary" />
                  {draft ? formatMinutes(draft.rpoMinutes) : "-"}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Perdida maxima aceptada entre capturas.
              </CardContent>
            </Card>

            <Card className="min-h-[11.5rem] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
              <CardHeader className="gap-1">
                <CardDescription>RTO objetivo</CardDescription>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  {draft ? formatMinutes(draft.rtoMinutes) : "-"}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Tiempo maximo para volver a operar.
              </CardContent>
            </Card>

            <Card className="min-h-[11.5rem] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
              <CardHeader className="gap-1">
                <CardDescription>Proxima ejecucion</CardDescription>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Bot className="h-5 w-5 text-primary" />
                  {formatDate(status?.nextRunAt)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Listos: {status?.totalReady ?? 0} | Fallidos: {status?.totalFailed ?? 0} | Purgados: {status?.totalPurged ?? 0}
                </p>
                <p>Ultimo exito: {formatDate(settings?.lastSuccessfulRunAt)}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <p className="inline-flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </p>
          </div>
        )}

        {resultMessage && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
            <p className="inline-flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{resultMessage}</span>
            </p>
          </div>
        )}

        <Tabs defaultValue="strategy" className="space-y-5">
          <div className="lg:sticky lg:top-24 lg:z-10">
            <TabsList className="admin-toolbar-surface grid h-auto w-full grid-cols-3 p-1 lg:w-auto">
              <TabsTrigger value="strategy" className="rounded-xl px-4 py-2">
                Estrategia
              </TabsTrigger>
              <TabsTrigger value="execution" className="rounded-xl px-4 py-2">
                Ejecucion
              </TabsTrigger>
              <TabsTrigger value="history" className="rounded-xl px-4 py-2">
                Historial
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="strategy" className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[1.3fr_0.95fr]">
              <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg">
                <CardHeader>
                  <CardTitle>Estrategia de recuperacion</CardTitle>
                  <CardDescription>
                    Define objetivos de continuidad, alcance automatico y cobertura operativa.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {draft && (
                    <>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">RPO en minutos</label>
                          <Input
                            inputMode="numeric"
                            value={draft.rpoMinutes}
                            onChange={(event) => setDraft({ ...draft, rpoMinutes: event.target.value })}
                          />
                          <p className="text-xs text-muted-foreground">
                            Minimo 15 y maximo 10080. Define cada cuanto debe ejecutarse la politica automatica.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">RTO en minutos</label>
                          <Input
                            inputMode="numeric"
                            value={draft.rtoMinutes}
                            onChange={(event) => setDraft({ ...draft, rtoMinutes: event.target.value })}
                          />
                          <p className="text-xs text-muted-foreground">
                            Minimo 5 y maximo 1440. Sirve como meta interna de restauracion.
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Cobertura automatizada</label>
                          <Select
                            value={draft.backupScope}
                            onValueChange={(value) =>
                              setDraft({
                                ...draft,
                                backupScope: value as BackupSettingsDraft["backupScope"],
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="database">Base completa</SelectItem>
                              <SelectItem value="selectedCollections">Colecciones seleccionadas</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Retencion en dias</label>
                          <Input
                            inputMode="numeric"
                            value={draft.retentionDays}
                            onChange={(event) => setDraft({ ...draft, retentionDays: event.target.value })}
                          />
                          <p className="text-xs text-muted-foreground">
                            Despues de este tiempo, los respaldos viejos se purgan segun la politica.
                          </p>
                        </div>
                      </div>

                      <div className="rounded-[1.5rem] border border-border/60 bg-secondary/20 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-sm font-medium text-foreground">Automatizacion activa</p>
                            <p className="text-xs text-muted-foreground">
                              El servidor revisa cada minuto si el RPO se vencio y ejecuta la politica automaticamente.
                            </p>
                          </div>
                          <Switch
                            checked={draft.automaticEnabled}
                            onCheckedChange={(value) => setDraft({ ...draft, automaticEnabled: value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-foreground">Colecciones incluidas</p>
                            <p className="text-xs text-muted-foreground">
                              Si eliges modo segmentado, solo estas colecciones formaran parte de la politica.
                            </p>
                          </div>
                          <Badge variant="outline" className="rounded-full">
                            {draft.backupScope === "database"
                              ? `${sortedCollections.length} colecciones por respaldo`
                              : `${draft.selectedCollections.length} colecciones elegidas`}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {sortedCollections.length === 0 && (
                            <span className="text-sm text-muted-foreground">No se detectaron colecciones autorizadas.</span>
                          )}
                          {sortedCollections.map((collection) => {
                            const active = draft.selectedCollections.includes(collection.name)
                            const dimmed = draft.backupScope !== "selectedCollections"
                            return (
                              <button
                                key={collection.name}
                                type="button"
                                onClick={() => toggleCollection(collection.name)}
                                className={`rounded-full border px-3 py-1.5 text-xs transition-all duration-300 ${
                                  active
                                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                    : "border-border/60 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                                } ${dimmed ? "opacity-80" : ""}`}
                              >
                                {collection.name} ({collection.count})
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-primary/10 bg-[linear-gradient(180deg,rgba(22,163,74,0.04),transparent_42%)] transition-all duration-300 hover:shadow-lg">
                <CardHeader>
                  <CardTitle>Destino y politica de resguardo</CardTitle>
                  <CardDescription>
                    Decide donde viven los archivos y en que condiciones el admin puede descargarlos.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {draft && (
                    <>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Destino principal</label>
                          <Select
                            value={draft.preferredStorage}
                            onValueChange={(value) =>
                              setDraft({
                                ...draft,
                                preferredStorage: value as BackupSettingsDraft["preferredStorage"],
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="local">Servidor local</SelectItem>
                              <SelectItem value="cloudinary">Cloudinary</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Carpeta remota</label>
                          <Input
                            value={draft.cloudFolder}
                            onChange={(event) => setDraft({ ...draft, cloudFolder: event.target.value })}
                            placeholder="inhalex-respaldos"
                          />
                        </div>
                      </div>

                      <div className="grid gap-3">
                        <div className="flex items-center justify-between rounded-[1.4rem] border border-border/60 bg-background/70 px-4 py-3 transition-all duration-300 hover:border-primary/30">
                          <div>
                            <p className="text-sm font-medium text-foreground">Permitir descarga local</p>
                            <p className="text-xs text-muted-foreground">
                              El admin solo podra bajar un respaldo a su equipo si esta opcion esta activa.
                            </p>
                          </div>
                          <Switch
                            checked={draft.localDownloadsEnabled}
                            onCheckedChange={(value) =>
                              setDraft({ ...draft, localDownloadsEnabled: value })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between rounded-[1.4rem] border border-border/60 bg-background/70 px-4 py-3 transition-all duration-300 hover:border-primary/30">
                          <div>
                            <p className="text-sm font-medium text-foreground">Mantener espejo local</p>
                            <p className="text-xs text-muted-foreground">
                              Aunque el destino principal sea nube, el servidor conserva una copia local para contingencias.
                            </p>
                          </div>
                          <Switch
                            checked={draft.keepLocalMirror}
                            onCheckedChange={(value) => setDraft({ ...draft, keepLocalMirror: value })}
                          />
                        </div>
                      </div>

                      <div className="rounded-[1.5rem] border border-border/60 bg-muted/20 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-foreground">Resumen operativo</p>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <p>Colecciones cubiertas: {draft.backupScope === "database" ? sortedCollections.length : draft.selectedCollections.length}</p>
                              <p>Documentos estimados protegidos: {projectedProtectedDocuments}</p>
                              <p>Retencion aplicada: {draft.retentionDays} dias</p>
                              <p>Ultimo error registrado: {settings?.lastError?.trim() ? settings.lastError : "Sin incidencias"}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="rounded-full">
                              Destino {storageLabel(draft.preferredStorage)}
                            </Badge>
                            <Badge variant="secondary" className="rounded-full">
                              {draft.automaticEnabled ? "Automatico activo" : "Automatico pausado"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {draft.preferredStorage === "cloudinary" && !settings?.cloudinaryConfigured && (
                        <div className="rounded-[1.5rem] border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200">
                          <p className="inline-flex items-start gap-2 font-medium">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            Cloudinary aun no esta configurado.
                          </p>
                          <p className="mt-2 text-xs leading-6 text-amber-900/80 dark:text-amber-100/80">
                            Agrega las variables BACKUP_CLOUDINARY_CLOUD_NAME, BACKUP_CLOUDINARY_API_KEY y BACKUP_CLOUDINARY_API_SECRET en el backend para que los archivos se suban a la nube.
                          </p>
                        </div>
                      )}

                      <Button
                        type="button"
                        className="w-full rounded-full py-6 text-base shadow-[0_18px_45px_-22px_rgba(22,163,74,0.75)]"
                        onClick={saveSettings}
                        disabled={isSavingSettings}
                      >
                        <Save className="h-4 w-4" />
                        {isSavingSettings ? "Guardando estrategia..." : "Guardar estrategia"}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="execution" className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
              <Card className="transition-all duration-300 hover:shadow-lg">
                <CardHeader>
                  <CardTitle>Ejecucion manual</CardTitle>
                  <CardDescription>
                    Lanza respaldos puntuales sin esperar al siguiente ciclo automatico.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-[1.6rem] border border-border/60 bg-background/80 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30">
                      <div className="space-y-2">
                        <div className="inline-flex rounded-full bg-primary/10 p-2 text-primary">
                          <Database className="h-5 w-5" />
                        </div>
                        <h3 className="text-base font-semibold text-foreground">Base completa</h3>
                        <p className="text-sm leading-6 text-muted-foreground">
                          Genera un paquete con todas las colecciones autorizadas segun el usuario de Mongo actual.
                        </p>
                      </div>
                      <Button
                        type="button"
                        className="mt-4 w-full rounded-full"
                        onClick={createDatabaseBackup}
                        disabled={isCreatingDatabaseBackup || isLoading}
                      >
                        {isCreatingDatabaseBackup ? "Generando..." : "Respaldar base completa"}
                      </Button>
                    </div>

                    <div className="rounded-[1.6rem] border border-border/60 bg-background/80 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30">
                      <div className="space-y-2">
                        <div className="inline-flex rounded-full bg-primary/10 p-2 text-primary">
                          <HardDriveDownload className="h-5 w-5" />
                        </div>
                        <h3 className="text-base font-semibold text-foreground">Coleccion individual</h3>
                        <p className="text-sm leading-6 text-muted-foreground">
                          Ideal para capturas especificas de productos, usuarios o cualquier modulo puntual.
                        </p>
                      </div>

                      <div className="mt-4 space-y-3">
                        <Select value={selectedCollection || undefined} onValueChange={setSelectedCollection}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una coleccion" />
                          </SelectTrigger>
                          <SelectContent>
                            {sortedCollections.map((collection) => (
                              <SelectItem key={collection.name} value={collection.name}>
                                {collection.name} ({collection.count})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full rounded-full"
                          onClick={createCollectionBackup}
                          disabled={isCreatingCollectionBackup || !selectedCollection || isLoading}
                        >
                          {isCreatingCollectionBackup ? "Generando..." : "Respaldar coleccion"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.6rem] border border-border/60 bg-muted/20 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">Politica automatica actual</p>
                        <p className="text-sm text-muted-foreground">
                          {draft?.automaticEnabled
                            ? "La estrategia esta lista para ejecutarse en la proxima ventana programada."
                            : "La automatizacion esta pausada; solo se ejecutaran respaldos manuales."}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full"
                        onClick={runPolicy}
                        disabled={isRunningPolicy || isLoading}
                      >
                        <Bot className="h-4 w-4" />
                        {isRunningPolicy ? "Ejecutando..." : "Forzar politica"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="transition-all duration-300 hover:shadow-lg">
                <CardHeader>
                  <CardTitle>Restauracion y salida controlada</CardTitle>
                  <CardDescription>
                    Selecciona un respaldo existente, restauralo o guialo a una descarga local solo si la politica lo permite.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Respaldo disponible</label>
                    <Select value={selectedBackupId || undefined} onValueChange={setSelectedBackupId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un respaldo" />
                      </SelectTrigger>
                      <SelectContent>
                        {backups.map((backup) => (
                          <SelectItem key={backup.id} value={backup.id}>
                            {backupLabel(backup)} | {formatDate(backup.createdAt)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Modo de importacion</label>
                    <Select value={importMode} onValueChange={(value) => setImportMode(value as AdminBackupImportMode)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="replace">Reemplazar datos actuales</SelectItem>
                        <SelectItem value="append">Agregar sin eliminar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-[1.6rem] border border-border/60 bg-background/80 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-foreground">Detalle del respaldo seleccionado</p>
                        {selectedBackup ? (
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p>ID: {selectedBackup.id}</p>
                            <p>Tipo: {backupLabel(selectedBackup)}</p>
                            <p>Estado: {statusLabel(selectedBackup.status)}</p>
                            <p>Destino: {storageLabel(selectedBackup.storageProvider)}</p>
                            <p>Tamano: {formatBytes(totalBackupSize(selectedBackup))}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Aun no seleccionas un respaldo.</p>
                        )}
                      </div>

                      {selectedBackup?.remoteAvailable && selectedBackup.remoteUrl && (
                        <a
                          href={selectedBackup.remoteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                        >
                          Ver archivo remoto
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button
                      type="button"
                      className="rounded-full"
                      onClick={() => void importBackup(selectedBackupId)}
                      disabled={isImportingBackup || !selectedBackupId || isLoading}
                    >
                      <Upload className="h-4 w-4" />
                      {isImportingBackup ? "Importando..." : "Restaurar respaldo"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => void downloadBackup(selectedBackupId)}
                      disabled={
                        !selectedBackupId ||
                        !settings?.localDownloadsEnabled ||
                        Boolean(selectedBackupId && downloadingById[selectedBackupId]) ||
                        !selectedBackup ||
                        !isBackupReady(selectedBackup)
                      }
                    >
                      <Download className="h-4 w-4" />
                      {selectedBackupId && downloadingById[selectedBackupId]
                        ? "Guardando..."
                        : "Guardar en mi equipo"}
                    </Button>
                  </div>

                  <div className="rounded-[1.6rem] border border-dashed border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
                    <p>
                      La descarga no es obligatoria: el flujo principal es generar y conservar respaldos en nube o servidor. Solo se exportan localmente cuando el admin lo decide y la politica lo permite.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="border-primary/10 bg-primary/[0.03]">
                <CardHeader className="pb-3">
                  <CardDescription>Respaldos listos</CardDescription>
                  <CardTitle className="text-3xl">{readyBackups.length}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Ultimos respaldos disponibles para restauracion o descarga controlada.
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Espacio visible</CardDescription>
                  <CardTitle className="text-3xl">
                    {formatBytes(backups.reduce((sum, item) => sum + totalBackupSize(item), 0))}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Suma de los archivos listados en el tablero actual.
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Ultimo fallo</CardDescription>
                  <CardTitle className="text-base leading-6">{formatDate(status?.lastFailureAt)}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {status?.lastError?.trim() ? status.lastError : "Sin errores recientes en la automatizacion."}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              {backups.length === 0 ? (
                <Card className="border-dashed border-border/70 bg-muted/10">
                  <CardContent className="flex min-h-56 flex-col items-center justify-center space-y-3 text-center">
                    <div className="rounded-full bg-primary/10 p-4 text-primary">
                      <ShieldCheck className="h-8 w-8" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-foreground">Aun no hay respaldos registrados</p>
                      <p className="max-w-xl text-sm text-muted-foreground">
                        Genera el primer respaldo desde la pestaña de ejecucion o activa una politica automatica para empezar a poblar el historial.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                backups.map((backup) => {
                  const isSelected = selectedBackupId === backup.id
                  const allowLocalDownload =
                    Boolean(settings?.localDownloadsEnabled) && isBackupReady(backup)

                  return (
                    <Card
                      key={backup.id}
                      className={`overflow-hidden transition-all duration-300 ${
                        isSelected
                          ? "border-primary/50 bg-primary/[0.03] shadow-[0_18px_45px_-30px_rgba(22,163,74,0.55)]"
                          : "border-border/60 hover:-translate-y-0.5 hover:shadow-lg"
                      }`}
                    >
                      <CardContent className="space-y-5 p-5">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-semibold text-foreground">{backupLabel(backup)}</h3>
                              <Badge variant={statusVariant(backup.status)} className="rounded-full">
                                {statusLabel(backup.status)}
                              </Badge>
                              <Badge variant="outline" className="rounded-full">
                                {triggerLabel(backup.trigger)}
                              </Badge>
                              <Badge variant="secondary" className="rounded-full">
                                {storageLabel(backup.storageProvider)}
                              </Badge>
                            </div>
                            <div className="grid gap-1 text-sm text-muted-foreground">
                              <p>{formatDate(backup.createdAt)}</p>
                              <p>ID tecnico: {backup.id}</p>
                              <p>
                                {backup.kind === "database"
                                  ? `${backup.totalCollections} colecciones | ${backup.totalDocuments} documentos`
                                  : `${backup.count} documentos en ${backup.collection}`}
                              </p>
                              <p>Tamano estimado: {formatBytes(totalBackupSize(backup))}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant={isSelected ? "default" : "outline"}
                              className="rounded-full"
                              onClick={() => setSelectedBackupId(backup.id)}
                            >
                              Seleccionar
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-full"
                              onClick={() => void downloadBackup(backup.id)}
                              disabled={!allowLocalDownload || Boolean(downloadingById[backup.id])}
                            >
                              <Download className="h-4 w-4" />
                              {downloadingById[backup.id] ? "Guardando..." : "Guardar local"}
                            </Button>
                            <Button
                              type="button"
                              className="rounded-full"
                              onClick={() => void importBackup(backup.id)}
                              disabled={!isBackupReady(backup) || isImportingBackup}
                            >
                              <Upload className="h-4 w-4" />
                              Restaurar
                            </Button>
                          </div>
                        </div>

                        <div className="grid gap-3 lg:grid-cols-3">
                          <div className="rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-sm">
                            <p className="font-medium text-foreground">Disponibilidad</p>
                            <p className="mt-1 text-muted-foreground">
                              Local: {backup.localAvailable ? "Si" : "No"} | Remoto: {backup.remoteAvailable ? "Si" : "No"}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-sm">
                            <p className="font-medium text-foreground">Ruta o identificador</p>
                            <p className="mt-1 break-all text-muted-foreground">{backup.backupPath}</p>
                          </div>
                          <div className="rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-sm">
                            <p className="font-medium text-foreground">Cobertura</p>
                            <p className="mt-1 text-muted-foreground">
                              {backup.kind === "database"
                                ? backup.collections
                                    .slice(0, 3)
                                    .map((item) => `${item.collection} (${item.count})`)
                                    .join(" | ") || "Sin detalle"
                                : `${backup.collection} (${backup.count})`}
                            </p>
                          </div>
                        </div>

                        {backup.notes && (
                          <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
                            <p className="font-medium">Nota operativa</p>
                            <p className="mt-1 text-muted-foreground">{backup.notes}</p>
                          </div>
                        )}

                        {backup.errorMessage && (
                          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                            <p className="font-medium">Incidencia registrada</p>
                            <p className="mt-1">{backup.errorMessage}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

