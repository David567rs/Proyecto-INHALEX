import React from "react";
import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { AuthProvider } from "@/components/auth/auth-provider";
import { AddressesProvider } from "@/components/addresses/addresses-provider";
import { CartProvider } from "@/components/cart/cart-provider";
import { FavoritesProvider } from "@/components/favorites/favorites-provider";
import { CatalogProvider } from "@/components/products/catalog-provider";
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
    "Explora el catálogo de inhaladores aromáticos INHALEX, organizado por líneas y perfiles para acompañar pausas y rutinas cotidianas.",
  keywords: [
    "INHALEX",
    "inhaladores aromáticos",
    "aromas de uso personal",
    "perfiles aromáticos",
    "bienestar cotidiano",
    "aromaterapia",
  ],
  authors: [{ name: "INHALEX SAS de CV" }],
  openGraph: {
    title: "INHALEX | El Respiro Que Alivia",
    description:
      "Inhaladores aromáticos personales organizados por líneas y perfiles.",
    type: "website",
    locale: "es_MX",
  },
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
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${manrope.variable}`}
    >
      <body className="font-sans antialiased">
        <AuthProvider>
          <AddressesProvider>
            <FavoritesProvider>
              <CartProvider>
                <CatalogProvider>
                  {children}
                  <Toaster />
                  <Analytics />
                </CatalogProvider>
              </CartProvider>
            </FavoritesProvider>
          </AddressesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
