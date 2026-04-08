export const CONTACT_EMAIL = "danielcruzhernandezinhalex@gmail.com"
export const CONTACT_EMAIL_HREF = `mailto:${CONTACT_EMAIL}`
export const CONTACT_PHONE_DISPLAY = "+52 77 1203 4573"
export const CONTACT_PHONE_HREF = "tel:+527712034573"
export const CONTACT_CITY = "Huejutla de Reyes, Hgo. Mexico"
export const CONTACT_ADDRESS = "Atencion digital y acompanamiento desde Huejutla de Reyes, Hidalgo."
export const CONTACT_HOURS = "Lunes a viernes, de 9:00 a 18:00 hrs."

export const SOCIAL_LINKS = [
  { name: "Facebook", href: "https://facebook.com/inhalex" },
  { name: "Instagram", href: "https://instagram.com/inhalex" },
  { name: "Twitter", href: "https://twitter.com/inhalex" },
] as const

export const HELP_LINKS = [
  { name: "Politica de privacidad", href: "/politicas" },
  { name: "Terminos y Condiciones", href: "/terminos" },
  { name: "Preguntas Frecuentes", href: "/faq" },
  { name: "Contacto", href: "/contacto" },
] as const

export const PAYMENT_METHODS = ["VISA", "MC", "Mercado Pago", "PayPal"] as const
