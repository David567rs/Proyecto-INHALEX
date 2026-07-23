"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  ChevronDown,
  LogOut,
  Menu,
  ShieldCheck,
  ShoppingBag,
  User,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CartSheet } from "@/components/cart/cart-sheet"
import { useCart } from "@/components/cart/cart-provider"
import { GlobalProductSearch } from "@/components/layout/global-product-search"
import { useCatalog } from "@/components/products/catalog-provider"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth/auth-provider"
import { PRODUCT_CATEGORIES } from "@/lib/products/categories"
import { getLineaHref } from "@/lib/products/lineas"

const navLinks = [
  { name: "Inicio", href: "/" },
  { name: "Productos", href: "/productos" },
  { name: "Sobre Nosotros", href: "/nosotros" },
  { name: "Contacto", href: "/contacto" },
]

interface HeaderProps {
  cartCount?: number
}

export function Header({ cartCount = 0 }: HeaderProps) {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: isAuthLoading, logout } = useAuth()
  const { itemCount, isSheetOpen, setSheetOpen } = useCart()
  const { categories: catalogCategories, ensureLoaded } = useCatalog()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isHeaderVisible, setIsHeaderVisible] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const lastScrollYRef = useRef(0)

  const categoryOptions = (catalogCategories.length > 0
    ? catalogCategories
    : PRODUCT_CATEGORIES
  ).filter((category) => category.id !== "all")
  const effectiveCartCount = cartCount || itemCount

  useEffect(() => {
    void ensureLoaded()
  }, [ensureLoaded])

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const previousScrollY = lastScrollYRef.current
      const isMovingDown = currentScrollY > previousScrollY

      setIsScrolled(currentScrollY > 20)

      if (currentScrollY <= 24) {
        setIsHeaderVisible(true)
      } else if (isMovingDown && currentScrollY > 140) {
        setIsHeaderVisible(false)
      } else if (!isMovingDown) {
        setIsHeaderVisible(true)
      }

      lastScrollYRef.current = currentScrollY
    }

    handleScroll()
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    if (isMobileMenuOpen || isSearchOpen || isSheetOpen) {
      setIsHeaderVisible(true)
    }
  }, [isMobileMenuOpen, isSearchOpen, isSheetOpen])

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform",
        isHeaderVisible
          ? "translate-y-0 opacity-100"
          : "-translate-y-[calc(100%+1rem)] opacity-0",
        isScrolled
          ? "border-b border-white/50 bg-card/88 py-1.5 shadow-[0_18px_44px_-32px_rgba(15,84,43,0.28)] backdrop-blur-2xl"
          : "bg-transparent py-4",
      )}
    >
      <div className="container mx-auto px-4">
        <div
          className={cn(
            "flex items-center justify-between transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            isScrolled ? "gap-3" : "gap-4",
          )}
        >
          <Link
            href="/"
            className="flex shrink-0 items-center transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:scale-[1.02]"
          >
            <div
              className={cn(
                "relative aspect-[3.18/1] transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
                isScrolled
                  ? "w-[10rem] sm:w-[11rem] md:w-[13rem]"
                  : "w-[11.5rem] sm:w-[12.75rem] md:w-[15.25rem]",
              )}
            >
              <Image
                src="/images/NuevoLogo.png"
                alt="INHALEX - El Respiro Que Alivia"
                fill
                className="object-cover drop-shadow-[0_12px_24px_rgba(15,84,43,0.06)]"
                style={{ objectPosition: "50% 50.6%" }}
                priority
              />
            </div>
          </Link>

          <div
            className={cn(
              "hidden md:flex flex-1 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
              isScrolled ? "mx-5 max-w-sm" : "mx-8 max-w-md",
            )}
          >
            <GlobalProductSearch onOpenChange={setIsSearchOpen} />
          </div>

          <nav
            className={cn(
              "hidden lg:flex items-center transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
              isScrolled ? "gap-0.5" : "gap-1",
            )}
          >
              <Link
              href="/"
              className={cn(
                "group relative rounded-full font-medium text-foreground/80 transition-all duration-300 hover:bg-white/72 hover:text-primary",
                isScrolled ? "px-3.5 py-1.5 text-[0.82rem]" : "px-4 py-2 text-sm",
              )}
            >
              Inicio
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-3/4" />
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-1 rounded-full font-medium text-foreground/80 transition-all duration-300 hover:bg-white/72 hover:text-primary",
                    isScrolled
                      ? "px-3.5 py-1.5 text-[0.82rem]"
                      : "px-4 py-2 text-sm",
                  )}
                >
                  Lineas
                  <ChevronDown className="h-4 w-4 transition-transform duration-300 group-data-[state=open]:rotate-180" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="center"
                className="w-52 rounded-2xl border border-border/60 bg-card/96 p-1 shadow-[0_22px_48px_-30px_rgba(15,84,43,0.25)] backdrop-blur-xl animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-300"
              >
                {categoryOptions.map((category) => (
                  <DropdownMenuItem key={category.id} asChild>
                    <Link
                      href={getLineaHref(category.id)}
                      className="cursor-pointer transition-colors hover:text-primary"
                    >
                      {category.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

              <Link
              href="/productos"
              className={cn(
                "group relative rounded-full font-medium text-foreground/80 transition-all duration-300 hover:bg-white/72 hover:text-primary",
                isScrolled ? "px-3.5 py-1.5 text-[0.82rem]" : "px-4 py-2 text-sm",
              )}
            >
              Productos
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-3/4" />
            </Link>

              <Link
              href="/nosotros"
              className={cn(
                "group relative rounded-full font-medium text-foreground/80 transition-all duration-300 hover:bg-white/72 hover:text-primary",
                isScrolled ? "px-3.5 py-1.5 text-[0.82rem]" : "px-4 py-2 text-sm",
              )}
            >
              Sobre Nosotros
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-3/4" />
            </Link>

              <Link
              href="/contacto"
              className={cn(
                "group relative rounded-full font-medium text-foreground/80 transition-all duration-300 hover:bg-white/72 hover:text-primary",
                isScrolled ? "px-3.5 py-1.5 text-[0.82rem]" : "px-4 py-2 text-sm",
              )}
            >
              Contacto
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-3/4" />
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "relative transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary/10",
                isScrolled ? "h-9 w-9" : "h-10 w-10",
              )}
              onClick={() => setSheetOpen(!isSheetOpen)}
            >
              <ShoppingBag className="h-5 w-5" />
              {effectiveCartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground animate-in zoom-in-50 duration-300">
                  {effectiveCartCount > 99 ? "99+" : effectiveCartCount}
                </span>
              )}
              <span className="sr-only">Bolsa de compras</span>
            </Button>

            {isAuthLoading ? (
              <Button
                variant="ghost"
                size="icon"
                disabled
                className={cn(
                  "transition-all duration-300 hover:bg-primary/10",
                  isScrolled ? "h-9 w-9" : "h-10 w-10",
                )}
              >
                <User className="h-5 w-5" />
                <span className="sr-only">Cargando sesion</span>
              </Button>
            ) : isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary/10",
                      isScrolled ? "h-9 w-9" : "h-10 w-10",
                    )}
                  >
                    <User className="h-5 w-5" />
                    <span className="sr-only">Mi cuenta</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex flex-col">
                    <span className="font-medium">{user?.name}</span>
                    <span className="text-xs text-muted-foreground">{user?.email}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/cuenta" className="cursor-pointer">
                      Mi cuenta
                    </Link>
                  </DropdownMenuItem>
                  {user?.role === "admin" && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer">
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Panel de administracion
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar sesion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/auth/login">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary/10",
                    isScrolled ? "h-9 w-9" : "h-10 w-10",
                  )}
                >
                  <User className="h-5 w-5" />
                  <span className="sr-only">Iniciar sesion</span>
                </Button>
              </Link>
            )}

            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary/10 lg:hidden",
                isScrolled ? "h-9 w-9" : "h-10 w-10",
              )}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5 animate-in spin-in-90 duration-300" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
              <span className="sr-only">Menu</span>
            </Button>
          </div>
        </div>

        <div
          className={cn(
            "lg:hidden overflow-y-auto transition-all duration-500 ease-out",
            isMobileMenuOpen
              ? "mt-4 max-h-[calc(100dvh-7rem)] opacity-100"
              : "max-h-0 opacity-0",
          )}
        >
          <div className="public-soft-surface rounded-[1.8rem] px-3 py-3">
          <div className="mb-4">
            <GlobalProductSearch
              variant="mobile"
              onOpenChange={setIsSearchOpen}
              onNavigate={() => setIsMobileMenuOpen(false)}
            />
          </div>

          <nav className="flex flex-col gap-1 pb-4">
            {navLinks.map((link, index) => (
              <Link
                key={link.name}
                href={link.href}
                className="px-4 py-3 text-sm font-medium text-foreground/80 hover:text-primary hover:bg-primary/5 rounded-lg transition-all duration-300"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animation: isMobileMenuOpen ? "slideInFromLeft 0.3s ease-out forwards" : "none",
                }}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}

            {!isAuthLoading &&
              (isAuthenticated ? (
                <>
                  <Link
                    href="/cuenta"
                    className="px-4 py-3 text-sm font-medium text-foreground/80 hover:text-primary hover:bg-primary/5 rounded-lg transition-all duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Mi cuenta
                  </Link>
                  {user?.role === "admin" && (
                    <Link
                      href="/admin"
                      className="px-4 py-3 text-sm font-medium text-foreground/80 hover:text-primary hover:bg-primary/5 rounded-lg transition-all duration-300"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Panel de administracion
                    </Link>
                  )}
                  <button
                    className="px-4 py-3 text-left text-sm font-medium text-destructive hover:bg-primary/5 rounded-lg transition-all duration-300"
                    onClick={() => {
                      handleLogout()
                      setIsMobileMenuOpen(false)
                    }}
                  >
                    Cerrar sesion
                  </button>
                </>
              ) : (
                <Link
                  href="/auth/login"
                  className="px-4 py-3 text-sm font-medium text-foreground/80 hover:text-primary hover:bg-primary/5 rounded-lg transition-all duration-300"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Iniciar sesion
                </Link>
              ))}

            <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Lineas
            </div>
            {categoryOptions.map((category, index) => (
              <Link
                key={category.id}
                href={getLineaHref(category.id)}
                className="px-6 py-2 text-sm text-foreground/70 hover:text-primary hover:bg-primary/5 rounded-lg transition-all duration-300"
                style={{
                  animationDelay: `${(navLinks.length + index) * 50}ms`,
                  animation: isMobileMenuOpen ? "slideInFromLeft 0.3s ease-out forwards" : "none",
                }}
                onClick={() => {
                  setIsMobileMenuOpen(false)
                }}
              >
                {category.name}
              </Link>
            ))}
          </nav>
          </div>
        </div>
      </div>

      <CartSheet />

      <style jsx>{`
        @keyframes slideInFromLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </header>
  )
}
