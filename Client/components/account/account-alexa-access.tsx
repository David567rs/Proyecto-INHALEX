"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  Mic2,
  RefreshCw,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { getAccessToken } from "@/lib/auth/token-storage"
import {
  generateAlexaLinkCode,
  revokeAlexaLinkCode,
  type AlexaLinkCodeResponse,
} from "@/lib/auth/alexa-link-api"
import { cn } from "@/lib/utils"

function formatRemaining(seconds: number) {
  const safeSeconds = Math.max(0, seconds)
  const minutes = Math.floor(safeSeconds / 60)
  const remainingSeconds = safeSeconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

export function AccountAlexaAccess() {
  const { toast } = useToast()
  const [linkCode, setLinkCode] = useState<AlexaLinkCodeResponse | null>(null)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false)

  const hasActiveCode = useMemo(() => {
    if (!linkCode) return false
    return remainingSeconds > 0
  }, [linkCode, remainingSeconds])

  useEffect(() => {
    if (!linkCode) {
      setRemainingSeconds(0)
      return
    }

    const updateRemainingTime = () => {
      const expiresAt = new Date(linkCode.expiresAt).getTime()
      const nextRemainingSeconds = Math.max(
        0,
        Math.ceil((expiresAt - Date.now()) / 1000),
      )
      setRemainingSeconds(nextRemainingSeconds)

      if (nextRemainingSeconds === 0) {
        setLinkCode(null)
      }
    }

    updateRemainingTime()
    const intervalId = window.setInterval(updateRemainingTime, 1000)

    return () => window.clearInterval(intervalId)
  }, [linkCode])

  const handleGenerate = async () => {
    const token = getAccessToken()
    if (!token) return

    setIsGenerating(true)
    try {
      const response = await generateAlexaLinkCode(token)
      setLinkCode(response)
      toast({
        title: "Codigo listo",
        description: "Tu acceso temporal para Alexa esta activo.",
      })
    } catch (error) {
      toast({
        title: "No se pudo generar",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async () => {
    if (!linkCode) return

    try {
      await navigator.clipboard.writeText(linkCode.code)
      toast({
        title: "Copiado",
        description: "Codigo listo para compartir con la skill.",
      })
    } catch {
      toast({
        title: "No se pudo copiar",
        description: "Selecciona el codigo manualmente.",
        variant: "destructive",
      })
    }
  }

  const handleRevoke = async () => {
    const token = getAccessToken()
    if (!token) return

    setIsRevoking(true)
    try {
      await revokeAlexaLinkCode(token)
      setLinkCode(null)
      toast({
        title: "Codigo cancelado",
        description: "El acceso temporal ya no se puede usar.",
      })
    } catch (error) {
      toast({
        title: "No se pudo cancelar",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "destructive",
      })
    } finally {
      setIsRevoking(false)
    }
  }

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/8 via-white to-emerald-50/80 p-4 shadow-[0_16px_34px_-30px_rgba(16,112,58,0.35)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="rounded-full bg-white p-2 text-primary shadow-sm">
            <Mic2 className="h-4 w-4" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">
                Acceso Alexa
              </h2>
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full border-primary/15 bg-white/80 text-[0.65rem] uppercase tracking-[0.14em]",
                  hasActiveCode ? "text-primary" : "text-muted-foreground",
                )}
              >
                {hasActiveCode ? "Activo" : "Temporal"}
              </Badge>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Vincula la skill sin compartir correo ni contrasena.
            </p>
          </div>
        </div>
        <KeyRound className="mt-1 h-4 w-4 text-primary/60" />
      </div>

      <div className="mt-4 rounded-xl border border-primary/10 bg-white/85 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Codigo de vinculacion
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold tracking-[0.2em] text-foreground">
              {hasActiveCode ? linkCode?.code : "---- ----"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {hasActiveCode ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full bg-white"
                  onClick={handleCopy}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copiar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="rounded-full text-muted-foreground hover:text-destructive"
                  onClick={handleRevoke}
                  disabled={isRevoking}
                >
                  {isRevoking ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                  Cancelar
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                className="rounded-full"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Generar
              </Button>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          {hasActiveCode ? (
            <span>Expira en {formatRemaining(remainingSeconds)}</span>
          ) : (
            <span>Disponible cuando necesites vincular la skill.</span>
          )}
        </div>
      </div>
    </section>
  )
}
