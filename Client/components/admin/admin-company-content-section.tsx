"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertTriangle, FileText, RefreshCw, RotateCcw, Save } from "lucide-react"
import { MarkdownContent } from "@/components/common/markdown-content"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  getAdminCompanyContent,
  updateAdminCompanyContent,
} from "@/lib/admin/admin-api"
import { getAccessToken } from "@/lib/auth/token-storage"
import { useAuth } from "@/components/auth/auth-provider"
import { DEFAULT_COMPANY_CONTENT } from "@/lib/company/default-company-content"
import type { CompanyContent } from "@/lib/company/company-content.types"

function formatDate(value?: string): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function normalizeValuesInput(rawValue: string): string[] {
  return [...new Set(rawValue.split("\n").map((value) => value.trim()).filter(Boolean))]
}

function normalizeContent(content: CompanyContent): CompanyContent {
  return {
    ...content,
    privacyPolicy: {
      title: content.privacyPolicy.title.trim(),
      content: content.privacyPolicy.content.trim(),
    },
    termsAndConditions: {
      title: content.termsAndConditions.title.trim(),
      content: content.termsAndConditions.content.trim(),
    },
    about: {
      mission: content.about.mission.trim(),
      vision: content.about.vision.trim(),
      values: [...new Set(content.about.values.map((value) => value.trim()).filter(Boolean))],
    },
  }
}

interface MarkdownEditorFieldProps {
  value: string
  placeholder: string
  minHeightClassName?: string
  disabled?: boolean
  onChange: (value: string) => void
}

function MarkdownEditorField({
  value,
  placeholder,
  minHeightClassName = "min-h-[220px]",
  disabled,
  onChange,
}: MarkdownEditorFieldProps) {
  return (
    <Tabs defaultValue="editor" className="w-full">
      <div className="flex items-center justify-between gap-3">
        <TabsList className="admin-tab-surface h-9">
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="preview">Vista previa</TabsTrigger>
        </TabsList>
        <span className="text-xs text-muted-foreground">
          Soporta Markdown (titulos, listas, links, tablas y citas)
        </span>
      </div>

      <TabsContent value="editor" className="mt-3">
        <Textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`admin-input-surface ${minHeightClassName}`}
          placeholder={placeholder}
          disabled={disabled}
        />
      </TabsContent>

      <TabsContent value="preview" className="mt-3">
        <div
          className={`
            ${minHeightClassName}
            admin-section-card rounded-xl bg-secondary/20 px-4 py-3
          `}
        >
          {value.trim().length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay contenido para previsualizar.
            </p>
          ) : (
            <MarkdownContent content={value} />
          )}
        </div>
      </TabsContent>
    </Tabs>
  )
}

export function AdminCompanyContentSection() {
  const { user } = useAuth()
  const [content, setContent] = useState<CompanyContent>(DEFAULT_COMPANY_CONTENT)
  const [draft, setDraft] = useState<CompanyContent>(DEFAULT_COMPANY_CONTENT)
  const [valuesInput, setValuesInput] = useState(DEFAULT_COMPANY_CONTENT.about.values.join("\n"))
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [resultMessage, setResultMessage] = useState("")
  const canManageContent = user?.role === "admin"

  const loadContent = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage("")
    setResultMessage("")

    const token = getAccessToken()
    if (!token) {
      setErrorMessage("No se encontro token de acceso")
      setIsLoading(false)
      return
    }

    try {
      const response = await getAdminCompanyContent(token)
      setContent(response)
      setDraft(response)
      setValuesInput(response.about.values.join("\n"))
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo cargar el contenido de la empresa"
      setErrorMessage(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadContent()
  }, [loadContent])

  const normalizedDraft = useMemo(
    () =>
      normalizeContent({
        ...draft,
        about: {
          ...draft.about,
          values: normalizeValuesInput(valuesInput),
        },
      }),
    [draft, valuesInput],
  )

  const hasChanges = useMemo(() => {
    return JSON.stringify(normalizedDraft) !== JSON.stringify(normalizeContent(content))
  }, [content, normalizedDraft])

  const totalValues = useMemo(() => normalizeValuesInput(valuesInput).length, [valuesInput])

  const handleSave = async () => {
    const token = getAccessToken()
    if (!token) {
      setErrorMessage("No se encontro token de acceso")
      return
    }

    setIsSaving(true)
    setErrorMessage("")
    setResultMessage("")

    try {
      const response = await updateAdminCompanyContent(
        {
          privacyPolicy: normalizedDraft.privacyPolicy,
          termsAndConditions: normalizedDraft.termsAndConditions,
          about: normalizedDraft.about,
        },
        token,
      )

      setContent(response)
      setDraft(response)
      setValuesInput(response.about.values.join("\n"))
      setResultMessage("Informacion actualizada correctamente")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo guardar la informacion"
      setErrorMessage(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleLoadSuggestedTemplate = () => {
    setDraft(DEFAULT_COMPANY_CONTENT)
    setValuesInput(DEFAULT_COMPANY_CONTENT.about.values.join("\n"))
    setResultMessage("Plantilla completa cargada. Guarda cambios para aplicarla en la base de datos.")
    setErrorMessage("")
  }

  return (
    <div className="admin-panel-shell admin-animate-card">
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Badge variant="secondary" className="w-fit">
            Contenido institucional
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight text-primary">
            Informacion de empresa
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Edita politicas, terminos, mision, vision y valores.
          </p>
        </div>

        <div className="flex gap-2">
          {canManageContent && (
            <Button
              type="button"
              variant="secondary"
              className="transition-all hover:-translate-y-0.5"
              onClick={handleLoadSuggestedTemplate}
              disabled={isLoading || isSaving || !canManageContent}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Cargar plantilla completa
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            className="transition-all hover:-translate-y-0.5"
            onClick={() => void loadContent()}
            disabled={isLoading || isSaving || !canManageContent}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Recargar
          </Button>
          {canManageContent && (
            <Button
              type="button"
              className="transition-all hover:-translate-y-0.5"
              disabled={isLoading || isSaving || !hasChanges}
              onClick={() => void handleSave()}
            >
              <Save className={`mr-2 h-4 w-4 ${isSaving ? "animate-spin" : ""}`} />
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </Button>
          )}
        </div>
      </div>

      <div className="relative z-10 mt-6 grid gap-4 md:grid-cols-3">
        <div className="admin-metric-card">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Ultima actualizacion
          </p>
          <p className="mt-3 text-lg font-semibold tracking-tight text-foreground">
            {formatDate(content.updatedAt)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Ultimo guardado en base de datos.
          </p>
        </div>
        <div className="admin-metric-card">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Estado editorial
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {hasChanges ? "Pendiente" : "En orden"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {hasChanges ? "Hay cambios sin guardar." : "Todo esta sincronizado."}
          </p>
        </div>
        <div className="admin-metric-card">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Bloques editables
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">3</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {totalValues} valores activos definidos.
          </p>
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

      {resultMessage && (
        <div className="relative z-10 mt-4 rounded-xl border border-border/60 bg-secondary/30 px-4 py-3 text-sm text-foreground">
          <p className="inline-flex items-start gap-2">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{resultMessage}</span>
          </p>
        </div>
      )}

      <div className="relative z-10 mt-6 grid gap-5 xl:grid-cols-[1.06fr_0.94fr]">
        <div className="space-y-5">
        <div className="admin-form-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Badge variant="outline">Legal</Badge>
              <h3 className="mt-3 text-lg font-semibold text-foreground">Politicas de privacidad</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Este bloque alimenta la pagina publica de privacidad y el tratamiento de datos.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            <Input
              className="admin-input-surface"
              value={draft.privacyPolicy.title}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  privacyPolicy: {
                    ...prev.privacyPolicy,
                    title: event.target.value,
                  },
                }))
              }
              placeholder="Titulo de politicas"
              disabled={isLoading || isSaving || !canManageContent}
            />
            <MarkdownEditorField
              value={draft.privacyPolicy.content}
              onChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  privacyPolicy: {
                    ...prev.privacyPolicy,
                    content: value,
                  },
                }))
              }
              placeholder="Contenido de politicas de privacidad"
              disabled={isLoading || isSaving || !canManageContent}
            />
          </div>
        </div>

        <div className="admin-form-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Badge variant="outline">Legal</Badge>
              <h3 className="mt-3 text-lg font-semibold text-foreground">Terminos y condiciones</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Define las condiciones comerciales y legales visibles para el cliente.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            <Input
              className="admin-input-surface"
              value={draft.termsAndConditions.title}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  termsAndConditions: {
                    ...prev.termsAndConditions,
                    title: event.target.value,
                  },
                }))
              }
              placeholder="Titulo de terminos"
              disabled={isLoading || isSaving || !canManageContent}
            />
            <MarkdownEditorField
              value={draft.termsAndConditions.content}
              onChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  termsAndConditions: {
                    ...prev.termsAndConditions,
                    content: value,
                  },
                }))
              }
              placeholder="Contenido de terminos y condiciones"
              disabled={isLoading || isSaving || !canManageContent}
            />
          </div>
        </div>

        <div className="admin-form-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Badge variant="outline">Marca</Badge>
              <h3 className="mt-3 text-lg font-semibold text-foreground">Mision, vision y valores</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Sirve para el bloque institucional de la marca y el discurso editorial del sitio.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            <MarkdownEditorField
              value={draft.about.mission}
              onChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  about: {
                    ...prev.about,
                    mission: value,
                  },
                }))
              }
              minHeightClassName="min-h-[150px]"
              placeholder="Mision de la empresa"
              disabled={isLoading || isSaving || !canManageContent}
            />
            <MarkdownEditorField
              value={draft.about.vision}
              onChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  about: {
                    ...prev.about,
                    vision: value,
                  },
                }))
              }
              minHeightClassName="min-h-[150px]"
              placeholder="Vision de la empresa"
              disabled={isLoading || isSaving || !canManageContent}
            />
            <div className="grid gap-2">
              <p className="text-sm font-medium text-foreground">Valores (uno por linea)</p>
              <Textarea
                value={valuesInput}
                onChange={(event) => setValuesInput(event.target.value)}
                className="admin-input-surface min-h-[130px]"
                placeholder={"Innovacion\nCalidad\nBienestar"}
                disabled={isLoading || isSaving || !canManageContent}
              />
            </div>
          </div>
        </div>
        </div>

        <div className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <div className="admin-form-card">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Estado editorial
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
              {hasChanges ? "Cambios listos para revisar" : "Contenido sincronizado"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Desde aqui puedes validar rapidamente si hace falta guardar, recargar desde base o
              restaurar la plantilla sugerida.
            </p>

            <div className="mt-5 grid gap-3">
              <div className="admin-stat-chip">
                <span className="font-medium">Ultimo guardado:</span> {formatDate(content.updatedAt)}
              </div>
              <div className="admin-stat-chip">
                <span className="font-medium">Cambios pendientes:</span> {hasChanges ? "Si" : "No"}
              </div>
              <div className="admin-stat-chip">
                <span className="font-medium">Valores registrados:</span> {totalValues}
              </div>
              <div className="admin-stat-chip">
                <span className="font-medium">Permiso:</span> {canManageContent ? "Edicion completa" : "Solo lectura"}
              </div>
            </div>
          </div>

          <div className="admin-form-card">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Guia rapida
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
              Buenas practicas de edicion
            </h3>

            <div className="mt-5 grid gap-3">
              <div className="rounded-xl border border-border/60 bg-background/80 px-4 py-3">
                <p className="text-sm font-medium text-foreground">Usa titulos cortos</p>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                  Facilitan lectura en paginas legales y bloques institucionales.
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/80 px-4 py-3">
                <p className="text-sm font-medium text-foreground">Aprovecha Markdown</p>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                  Puedes usar listas, subtitulos, enlaces y tablas para ordenar mejor el texto.
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/80 px-4 py-3">
                <p className="text-sm font-medium text-foreground">Edita por bloques</p>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                  Cambia una seccion, revisa la vista previa y luego guarda para mantener control.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
