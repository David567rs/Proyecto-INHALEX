"use client"

import Link from "next/link"
import Image from "next/image"
import {
  ArrowRight,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  Phone,
  Twitter,
} from "lucide-react"
import {
  CONTACT_CITY,
  CONTACT_EMAIL,
  CONTACT_EMAIL_HREF,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_HREF,
  HELP_LINKS,
  PAYMENT_METHODS,
  SOCIAL_LINKS,
} from "@/lib/company/contact-info"

const socialIcons = {
  Facebook,
  Instagram,
  Twitter,
}

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-border/70 bg-[linear-gradient(180deg,rgba(243,249,244,0.98),rgba(255,255,255,1))]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[8%] top-10 h-52 w-52 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute bottom-0 right-[10%] h-64 w-64 rounded-full bg-emerald-200/30 blur-3xl" />
      </div>

      <div className="container relative z-10 mx-auto px-4 py-10 lg:py-12">
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr_0.8fr_0.9fr]">
          <section className="page-fade-up page-fade-up-delay-1 public-soft-surface rounded-[2rem] p-5 lg:p-6">
            <Link
              href="/"
              className="inline-flex w-full justify-center transition-all duration-500 hover:-translate-y-1 hover:scale-[1.01] lg:justify-start"
            >
              <div className="relative aspect-[3.18/1] w-[15rem] sm:w-[16.75rem] lg:w-[17.5rem]">
                <Image
                  src="/images/NuevoLogo.png"
                  alt="INHALEX - El Respiro Que Alivia"
                  fill
                  className="object-cover drop-shadow-[0_12px_24px_rgba(15,84,43,0.06)]"
                  style={{ objectPosition: "50% 50.6%" }}
                />
              </div>
            </Link>

            <p className="mt-4 max-w-sm text-[0.97rem] leading-7 text-muted-foreground">
              Productos aromaticos para respirar con mas calma, claridad y bienestar, con
              una experiencia visual y sensorial mas cuidada en cada linea.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-emerald-100/80 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700">
                100% Natural
              </span>
              <span className="rounded-full border border-emerald-100/80 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700">
                Aromas por linea
              </span>
              <span className="rounded-full border border-emerald-100/80 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700">
                Bienestar diario
              </span>
            </div>
          </section>

          <section className="page-fade-up page-fade-up-delay-2 public-soft-surface rounded-[2rem] p-5 lg:p-6">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-foreground/72">
              Contacto
            </p>
            <div className="mt-4 space-y-3">
              <a
                href={CONTACT_EMAIL_HREF}
                className="group flex items-start gap-3 rounded-[1.2rem] border border-emerald-100/80 bg-white/84 px-4 py-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_16px_32px_-24px_rgba(15,84,43,0.18)]"
              >
                <span className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
                  <Mail className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">Correo</span>
                  <span className="mt-1 block text-sm text-muted-foreground group-hover:text-foreground/80">
                    {CONTACT_EMAIL}
                  </span>
                </span>
              </a>

              <a
                href={CONTACT_PHONE_HREF}
                className="group flex items-start gap-3 rounded-[1.2rem] border border-emerald-100/80 bg-white/84 px-4 py-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_16px_32px_-24px_rgba(15,84,43,0.18)]"
              >
                <span className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
                  <Phone className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">Telefono</span>
                  <span className="mt-1 block text-sm text-muted-foreground group-hover:text-foreground/80">
                    {CONTACT_PHONE_DISPLAY}
                  </span>
                </span>
              </a>

              <div className="flex items-start gap-3 rounded-[1.2rem] border border-emerald-100/80 bg-white/84 px-4 py-3.5">
                <span className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
                  <MapPin className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">Ubicacion</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{CONTACT_CITY}</span>
                </span>
              </div>
            </div>
          </section>

          <section className="page-fade-up page-fade-up-delay-3 public-soft-surface rounded-[2rem] p-5 lg:p-6">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-foreground/72">
              Ayuda
            </p>
            <nav className="mt-4 space-y-1.5">
              {HELP_LINKS.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="group flex items-center justify-between rounded-[1.05rem] border border-transparent px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-300 hover:border-emerald-100/80 hover:bg-white/86 hover:text-primary"
                >
                  {link.name}
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              ))}
            </nav>
          </section>

          <section className="page-fade-up page-fade-up-delay-4 public-soft-surface rounded-[2rem] p-5 lg:p-6">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-foreground/72">
              Comunidad
            </p>
            <div className="mt-4 flex items-center gap-2.5">
              {SOCIAL_LINKS.map((social) => {
                const Icon = socialIcons[social.name]

                return (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-emerald-100/80 bg-white/90 text-muted-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:bg-primary hover:text-primary-foreground hover:shadow-[0_16px_28px_-20px_rgba(16,112,58,0.38)]"
                    aria-label={social.name}
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                )
              })}
            </div>

            <p className="mt-5 text-sm leading-7 text-muted-foreground">
              Sigue los lanzamientos, nuevas lineas y noticias del proyecto desde nuestros
              canales oficiales.
            </p>

            <div className="mt-5">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-foreground/72">
                Metodos de pago
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <span
                    key={method}
                    className="rounded-full border border-emerald-100/80 bg-white px-3 py-1.5 text-xs font-semibold text-foreground/75"
                  >
                    {method}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="page-fade-up page-fade-up-delay-4 mt-6 flex flex-col items-center justify-between gap-2.5 border-t border-emerald-100/80 pt-5 text-center sm:flex-row sm:text-left">
          <p className="text-sm text-muted-foreground">
            {new Date().getFullYear()} INHALEX. Todos los derechos reservados.
          </p>
          <p className="text-sm text-muted-foreground">
            Diseno natural, limpio y pensado para explorar con calma.
          </p>
        </div>
      </div>
    </footer>
  )
}
