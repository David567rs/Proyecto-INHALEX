"use client"

import Link from "next/link"
import Image from "next/image"
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from "lucide-react"

const helpLinks = [
  { name: "Politica de privacidad", href: "/politicas" },
  { name: "Terminos y Condiciones", href: "/terminos" },
  { name: "Preguntas Frecuentes", href: "/faq" },
]

const socialLinks = [
  { name: "Facebook", icon: Facebook, href: "https://facebook.com/inhalex" },
  { name: "Instagram", icon: Instagram, href: "https://instagram.com/inhalex" },
  { name: "Twitter", icon: Twitter, href: "https://twitter.com/inhalex" },
]

const paymentMethods = ["VISA", "MC", "Mercado Pago", "PayPal"]

export function Footer() {
  return (
    <footer className="bg-secondary/30 border-t border-border">
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-10 lg:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 items-start">
          {/* Brand Column */}
          <div className="flex flex-col items-start">
            <Link
              href="/"
              className="inline-block group transition-transform duration-300 hover:scale-105"
            >
              <div className="relative w-44 h-40">
                <Image
                  src="/images/inhalex-logonegro.png"
                  alt="INHALEX SAS de CV"
                  fill
                  className="object-contain"
                />
              </div>
            </Link>
          </div>

          {/* Contact Column */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
              Contacto
            </h3>
            <a
              href="mailto:danielcruzhernandezinhalex@gmail.com"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Mail className="w-4 h-4" />
              danielcruzhernandezinhalex@gmail.com
            </a>
            <a
              href="tel:+527712034573"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Phone className="w-4 h-4" />
              +52 77 1203 4573
            </a>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Huejutla de Reyes, Hgo. Mexico</span>
            </div>
          </div>

          {/* Help Column */}
          <div className="lg:pl-4">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
              Ayuda
            </h3>
            <ul className="space-y-2.5">
              {helpLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors duration-300 inline-block"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social & Payment Column */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
              Siguenos
            </h3>
            <div className="flex items-center gap-2.5 mb-6">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary hover:bg-primary/5 transition-all duration-300"
                  aria-label={social.name}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>

            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
              Metodos de pago
            </h3>
            <div className="flex flex-wrap gap-2">
              {paymentMethods.map((method) => (
                <div
                  key={method}
                  className="px-2.5 py-1 bg-card border border-border rounded text-xs font-medium text-muted-foreground"
                >
                  {method}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border">
        <div className="container mx-auto px-4 py-5">
          <p className="text-sm text-muted-foreground text-center">
            {new Date().getFullYear()} INHALEX. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}

