"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Mail, Lock, Eye, EyeOff, ArrowRight, User, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth/auth-provider"

const NAME_REGEX = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü' -]+$/
const PHONE_REGEX = /^\d{10,15}$/
const SPECIAL_CHAR_REGEX = /[^A-Za-z0-9\s]/

function sanitizeName(value: string): string {
  return value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü' -]/g, "")
}

function sanitizePhone(value: string): string {
  return value.replace(/\D/g, "").slice(0, 15)
}

function getPasswordChecks(password: string) {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: SPECIAL_CHAR_REGEX.test(password),
    lowercase: /[a-z]/.test(password),
  }
}

function getPasswordStrength(password: string): {
  label: "Debil" | "Regular" | "Segura" | "Muy segura"
  level: 1 | 2 | 3 | 4
  colorClassName: string
} {
  const checks = getPasswordChecks(password)
  let score = 0
  if (checks.length) score += 1
  if (checks.uppercase) score += 1
  if (checks.number) score += 1
  if (checks.special) score += 1
  if (checks.lowercase) score += 1
  if (password.length >= 12) score += 1

  if (score <= 1) {
    return { label: "Debil", level: 1, colorClassName: "bg-red-500" }
  }
  if (score <= 3) {
    return { label: "Regular", level: 2, colorClassName: "bg-amber-500" }
  }
  if (score <= 4) {
    return { label: "Segura", level: 3, colorClassName: "bg-lime-600" }
  }
  return { label: "Muy segura", level: 4, colorClassName: "bg-emerald-600" }
}

export default function RegisterPage() {
  const router = useRouter()
  const { register, isAuthenticated, isLoading: isAuthLoading } = useAuth()

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  })

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      router.replace("/cuenta")
    }
  }, [isAuthLoading, isAuthenticated, router])

  const passwordChecks = useMemo(
    () => getPasswordChecks(formData.password),
    [formData.password],
  )
  const passwordStrength = useMemo(
    () => getPasswordStrength(formData.password),
    [formData.password],
  )

  const isPasswordValid =
    passwordChecks.length &&
    passwordChecks.uppercase &&
    passwordChecks.number &&
    passwordChecks.special

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage("")

    const firstName = formData.firstName.trim()
    const lastName = formData.lastName.trim()
    const email = formData.email.trim().toLowerCase()
    const phone = formData.phone.trim()
    const password = formData.password
    const confirmPassword = formData.confirmPassword

    if (!NAME_REGEX.test(firstName) || firstName.length < 2) {
      setErrorMessage("El nombre solo debe contener letras y minimo 2 caracteres")
      return
    }

    if (!NAME_REGEX.test(lastName) || lastName.length < 2) {
      setErrorMessage("El apellido solo debe contener letras y minimo 2 caracteres")
      return
    }

    if (!PHONE_REGEX.test(phone)) {
      setErrorMessage("El telefono debe tener solo numeros (10 a 15 digitos)")
      return
    }

    if (!isPasswordValid) {
      setErrorMessage("La contrasena no cumple los requisitos de seguridad")
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage("Las contrasenas no coinciden")
      return
    }

    setIsLoading(true)

    try {
      await register({
        firstName,
        lastName,
        email,
        phone,
        password,
      })

      router.replace("/cuenta")
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear la cuenta"
      setErrorMessage(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleRegister = () => {
    setErrorMessage("El inicio de sesion con Google aun no esta configurado")
  }

  return (
    <div className="flex-1 flex min-h-[calc(100vh-200px)]">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-secondary/20">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl shadow-lg border border-border/50 p-8">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-2 font-sans text-primary">Crear cuenta</h1>
              <p className="text-sm text-muted-foreground">Completa tus datos para registrarte</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium text-foreground">
                    Nombre
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="firstName"
                      type="text"
                      maxLength={50}
                      placeholder="Tu nombre"
                      className="pl-10 h-11 bg-background border-input focus:border-primary focus:ring-primary/20"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, firstName: sanitizeName(e.target.value) }))
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-medium text-foreground">
                    Apellido
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="lastName"
                      type="text"
                      maxLength={50}
                      placeholder="Tu apellido"
                      className="pl-10 h-11 bg-background border-input focus:border-primary focus:ring-primary/20"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, lastName: sanitizeName(e.target.value) }))
                      }
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Correo electrónico
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    className="pl-10 h-11 bg-background border-input focus:border-primary focus:ring-primary/20"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-foreground">
                  Número telefónico
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={15}
                    placeholder="5512345678"
                    className="pl-10 h-11 bg-background border-input focus:border-primary focus:ring-primary/20"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, phone: sanitizePhone(e.target.value) }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Contraseña
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
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

                <div className="rounded-md border border-border/60 bg-secondary/15 p-3">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Complejidad</span>
                    <span className="font-semibold">{passwordStrength.label}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={`password-strength-${index}`}
                        className={cn(
                          "h-1.5 rounded-full bg-border",
                          index < passwordStrength.level && passwordStrength.colorClassName,
                        )}
                      />
                    ))}
                  </div>
                  <ul className="mt-3 space-y-1 text-xs">
                    <li className={passwordChecks.length ? "text-emerald-700" : "text-muted-foreground"}>
                      Mínimo 8 caracteres
                    </li>
                    <li className={passwordChecks.uppercase ? "text-emerald-700" : "text-muted-foreground"}>
                      Al menos una mayúscula
                    </li>
                    <li className={passwordChecks.number ? "text-emerald-700" : "text-muted-foreground"}>
                      Al menos un número
                    </li>
                    <li className={passwordChecks.special ? "text-emerald-700" : "text-muted-foreground"}>
                      Al menos un caracter especial
                    </li>
                  </ul>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                  Confirmar contraseña
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="********"
                    className="pl-10 pr-10 h-11 bg-background border-input focus:border-primary focus:ring-primary/20"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
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
                  "hover:shadow-xl hover:shadow-primary/30",
                )}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    Crear cuenta
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">O registrate con</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleRegister}
                className="w-full h-11 bg-transparent border-input hover:bg-secondary/50 transition-all duration-300"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Ya tienes una cuenta?{" "}
              <Link
                href="/auth/login"
                className="text-primary font-medium hover:text-primary/80 transition-colors underline underline-offset-2"
              >
                Inicia sesion aqui
              </Link>
            </p>
          </div>

          <p className="text-xs text-center text-muted-foreground mt-4">
            Al registrarte, aceptas nuestros{" "}
            <Link href="/terminos" className="text-primary hover:underline">
              Terminos de Servicio
            </Link>{" "}
            y{" "}
            <Link href="/politicas" className="text-primary hover:underline">
              Politica de Privacidad
            </Link>
          </p>
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
            <h2 className="text-4xl font-bold mb-4 drop-shadow-lg font-sans">Crea tu cuenta</h2>
            <p className="text-lg opacity-90 drop-shadow">
              Unete a INHALEX para mejorar tu bienestar respiratorio
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

