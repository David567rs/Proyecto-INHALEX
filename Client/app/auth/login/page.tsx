"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth/auth-provider"

export default function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated, isLoading: isAuthLoading } = useAuth()

  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [nextUrl, setNextUrl] = useState("/cuenta")
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    remember: false,
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setNextUrl(params.get("next") || "/cuenta")
  }, [])

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      router.replace(nextUrl)
    }
  }, [isAuthLoading, isAuthenticated, nextUrl, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage("")

    const email = formData.email.trim().toLowerCase()
    const password = formData.password

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMessage("Ingresa un correo electronico valido")
      return
    }

    if (password.length < 8) {
      setErrorMessage("La contrasena debe tener al menos 8 caracteres")
      return
    }

    setIsLoading(true)

    try {
      await login({
        email,
        password,
      })

      router.replace(nextUrl)
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo iniciar la sesion"
      setErrorMessage(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex-1 flex min-h-[calc(100vh-200px)]">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-secondary/20">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl shadow-lg border border-border/50 p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2 font-sans text-primary">Iniciar sesion</h1>
              <p className="text-sm text-muted-foreground">Ingresa tus credenciales para acceder</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Correo electronico
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    maxLength={120}
                    placeholder="tu@email.com"
                    className="pl-10 h-11 bg-background border-input focus:border-primary focus:ring-primary/20"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Contrasena
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    minLength={8}
                    maxLength={128}
                    placeholder="********"
                    className="pl-10 pr-10 h-11 bg-background border-input focus:border-primary focus:ring-primary/20"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={formData.remember}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, remember: checked as boolean })
                    }
                  />
                  <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                    Recordarme
                  </Label>
                </div>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  Olvidaste tu contrasena?
                </Link>
              </div>

              {errorMessage && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {errorMessage}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading || isAuthLoading}
                className={cn(
                  "w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium",
                  "shadow-lg shadow-primary/25 transition-all duration-300",
                  "hover:shadow-xl hover:shadow-primary/30"
                )}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    Iniciar sesion
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              No tienes una cuenta?{" "}
              <Link
                href="/auth/register"
                className="text-primary font-medium hover:text-primary/80 transition-colors underline underline-offset-2"
              >
                Registrate aqui
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <Image
          src="/images/login-bg.jpg"
          alt="Laboratorio INHALEX"
          fill
          className="object-cover"
          priority
        />

        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/60 to-accent/70" />

        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
          <div className="relative w-92 h-64 mb-8">
            <Image
              src="/images/logoletras.png"
              alt="INHALEX - El Respiro Que Alivia"
              fill
              className="object-contain drop-shadow-lg"
            />
          </div>

          <div className="text-center text-white">
            <h2 className="mb-4 drop-shadow-lg text-balance leading-10 tracking-tighter text-3xl font-sans font-normal">
              Bienvenido a tu plataforma de bienestar respiratorio
            </h2>
          </div>
        </div>
      </div>
    </div>
  )
}
