"use client"

import { useLayoutEffect } from "react"

interface ProductDetailScrollResetProps {
  routeKey: string
}

export function ProductDetailScrollReset({
  routeKey,
}: ProductDetailScrollResetProps) {
  useLayoutEffect(() => {
    const root = document.documentElement
    const body = document.body
    const previousRootBehavior = root.style.scrollBehavior
    const previousBodyBehavior = body.style.scrollBehavior

    const resetScroll = () => {
      root.style.scrollBehavior = "auto"
      body.style.scrollBehavior = "auto"

      window.scrollTo({ top: 0, left: 0, behavior: "auto" })
      document.scrollingElement?.scrollTo({
        top: 0,
        left: 0,
        behavior: "auto",
      })
      root.scrollTop = 0
      body.scrollTop = 0
    }

    const restoreScrollBehavior = () => {
      root.style.scrollBehavior = previousRootBehavior
      body.style.scrollBehavior = previousBodyBehavior
    }

    resetScroll()

    let secondFrameId = 0
    const firstFrameId = window.requestAnimationFrame(() => {
      resetScroll()
      secondFrameId = window.requestAnimationFrame(resetScroll)
    })
    const immediateTimerId = window.setTimeout(resetScroll, 0)
    const finalTimerId = window.setTimeout(() => {
      resetScroll()
      restoreScrollBehavior()
    }, 120)

    return () => {
      window.cancelAnimationFrame(firstFrameId)
      window.cancelAnimationFrame(secondFrameId)
      window.clearTimeout(immediateTimerId)
      window.clearTimeout(finalTimerId)
      restoreScrollBehavior()
    }
  }, [routeKey])

  return null
}
