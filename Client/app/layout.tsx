import React from "react";
import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { AuthProvider } from "@/components/auth/auth-provider";
import { CartProvider } from "@/components/cart/cart-provider";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "INHALEX | El Respiro Que Alivia",
  description:
    "Descubre nuestra selección de productos naturales diseñados para tu bienestar respiratorio. Auxiliar de macerado de plantas para congestión nasal, dolor de cabeza, resfriado, gripe y tos.",
  keywords: [
    "INHALEX",
    "productos naturales",
    "bienestar respiratorio",
    "congestión nasal",
    "remedios naturales",
    "aromaterapia",
  ],
  authors: [{ name: "INHALEX SAS de CV" }],
  openGraph: {
    title: "INHALEX | El Respiro Que Alivia",
    description: "Productos naturales para tu bienestar respiratorio",
    type: "website",
    locale: "es_MX",
  },
  generator: "v0.app",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#16a34a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${manrope.variable}`}
    >
      <body className="font-sans antialiased">
        <AuthProvider>
          <CartProvider>
            {children}
            <Toaster />
            <Analytics />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
