"use client"

import React from "react"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Mail, ArrowRight, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [email, setEmail] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simula el envio de correo. Reemplazar con logica real.
    await new Promise((resolve) => setTimeout(resolve, 1500))

    setIsLoading(false)
    setIsSubmitted(true)
  }

  return (
    <div className="flex-1 flex min-h-[calc(100vh-200px)]">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-secondary/20">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl shadow-lg border border-border/50 p-8">
            {isSubmitted ? (
              /* Success State */
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <h1 className="mb-2 text-2xl font-bold text-foreground">
                  Correo enviado
                </h1>
                <p className="text-sm text-muted-foreground mb-6">
                  Hemos enviado un enlace de recuperacion a <strong>{email}</strong>.
                  Revisa tu bandeja de entrada.
                </p>
                <Link href="/auth/login">
                  <Button
                    className={cn(
                      "w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium",
                      "shadow-lg shadow-primary/25 transition-all duration-300"
                    )}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver a iniciar sesion
                  </Button>
                </Link>
              </div>
            ) : (
              /* Estado del formulario */
              <>
                {/* Encabezado */}
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold mb-2 text-primary font-sans">
                    Recuperar contrasena
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Te enviaremos un enlace para restablecerla
                  </p>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Campo de correo */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-foreground">
                      Correo electronico
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="tu@email.com"
                        className="pl-10 h-11 bg-background border-input focus:border-primary focus:ring-primary/20"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Boton de envio */}
                  <Button
                    type="submit"
                    disabled={isLoading}
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
                        Enviar enlace
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>

                {/* Volver al inicio de sesion */}
                <div className="text-center mt-6">
                  <Link
                    href="/auth/login"
                    className="text-sm text-primary hover:text-primary/80 transition-colors inline-flex items-center"
                  >
                    Volver a iniciar sesion
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right Side - Brand Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background Image */}
        <Image
          src="/images/login-bg.jpg"
          alt="Laboratorio INHALEX"
          fill
          className="object-cover"
          priority
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/60 to-accent/70" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
          {/* Logo */}
          <div className="relative w-92 h-64 mb-8">
            <Image
              src="/images/logoletras.png"
              alt="INHALEX - El Respiro Que Alivia"
              fill
              className="object-contain drop-shadow-lg"
            />
          </div>

          {/* Text */}
          <div className="text-center text-white">
            <h2 className="text-4xl font-bold mb-4 drop-shadow-lg font-sans">
              Recupera tu acceso
            </h2>
            <p className="text-lg opacity-90 drop-shadow">
              Te enviaremos un enlace a tu correo
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
