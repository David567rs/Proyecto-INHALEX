import { Footer } from "@/components/layout/footer"
import { Header } from "@/components/layout/header"
import { cn } from "@/lib/utils"

interface PublicPageSkeletonProps {
  variant?: "default" | "linea" | "product"
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-emerald-100/70", className)} />
}

export function PublicPageSkeleton({
  variant = "default",
}: PublicPageSkeletonProps) {
  const isLinea = variant === "linea"
  const isProduct = variant === "product"

  return (
    <div className="min-h-screen flex flex-col bg-[linear-gradient(180deg,rgba(247,250,247,0.98),rgba(255,255,255,1))]">
      <Header />

      <main className="flex-1 pt-24 lg:pt-28">
        <section className="container mx-auto px-4 py-6 lg:py-10">
          <div className="page-fade-up public-skeleton-surface overflow-hidden p-4 sm:p-5">
            <div
              className={cn(
                "grid gap-5",
                isProduct ? "lg:grid-cols-[0.92fr_1fr]" : "lg:grid-cols-[0.82fr_1.18fr]",
              )}
            >
              <div className="public-skeleton-surface min-h-[24rem] p-4 sm:min-h-[31rem] lg:min-h-[40rem]">
                <div className="flex h-full flex-col justify-between">
                  <div className="space-y-4">
                    <SkeletonBlock className="h-3 w-20 rounded-full" />
                    <SkeletonBlock className="h-12 w-3/4 rounded-[1.6rem]" />
                    <SkeletonBlock className="h-6 w-full max-w-xl rounded-[1.2rem]" />
                    <SkeletonBlock className="h-6 w-5/6 rounded-[1.2rem]" />
                  </div>

                  <div className="grid h-full place-items-center py-6">
                    <div className="relative h-full min-h-[18rem] w-full">
                      <div className="absolute inset-x-[18%] top-0 h-16 rounded-full bg-emerald-100/60 blur-2xl" />
                      <SkeletonBlock className="absolute inset-0 rounded-[2rem]" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <SkeletonBlock className="h-12 w-44 rounded-full" />
                    <SkeletonBlock className="h-10 w-20 rounded-full" />
                  </div>
                </div>
              </div>

              <div className="public-skeleton-surface p-6 lg:p-8">
                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-6">
                    <SkeletonBlock className="h-6 w-36 rounded-full" />
                    <SkeletonBlock className="h-6 w-32 rounded-full" />
                  </div>

                  <div className="space-y-4">
                    <SkeletonBlock className="h-14 w-3/4 rounded-[1.6rem]" />
                    <SkeletonBlock className="h-5 w-full rounded-full" />
                    <SkeletonBlock className="h-5 w-11/12 rounded-full" />
                    <SkeletonBlock className="h-5 w-5/6 rounded-full" />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <SkeletonBlock className="h-11 w-40 rounded-full" />
                    <SkeletonBlock className="h-11 w-36 rounded-full" />
                    <SkeletonBlock className="h-11 w-32 rounded-full" />
                  </div>

                  <SkeletonBlock className="h-[4.5rem] w-56 rounded-[1.6rem]" />

                  <div className="space-y-4">
                    <SkeletonBlock className="h-20 w-full rounded-[1.8rem]" />
                    <SkeletonBlock className="h-16 w-full rounded-[1.8rem]" />
                  </div>
                </div>
              </div>
            </div>

            {isLinea && (
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="public-skeleton-surface p-5">
                    <SkeletonBlock className="h-3 w-24 rounded-full" />
                    <SkeletonBlock className="mt-4 h-9 w-20 rounded-[1rem]" />
                    <SkeletonBlock className="mt-3 h-4 w-40 rounded-full" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="container mx-auto px-4 pb-16 lg:pb-24">
          <div
            className={cn(
              "grid gap-5",
              isProduct ? "lg:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3",
              isLinea ? "page-fade-up page-fade-up-delay-2" : "page-fade-up page-fade-up-delay-1",
            )}
          >
            {[0, 1, 2].map((item) => (
              <div key={item} className="public-skeleton-surface p-5">
                <SkeletonBlock className="h-56 w-full rounded-[1.7rem]" />
                <SkeletonBlock className="mt-5 h-8 w-2/3 rounded-[1rem]" />
                <SkeletonBlock className="mt-3 h-4 w-full rounded-full" />
                <SkeletonBlock className="mt-2 h-4 w-5/6 rounded-full" />
                <div className="mt-5 flex gap-2">
                  <SkeletonBlock className="h-9 w-24 rounded-full" />
                  <SkeletonBlock className="h-9 w-28 rounded-full" />
                </div>
              </div>
            ))}
          </div>

          {!isProduct && (
            <div className="page-fade-up page-fade-up-delay-3 mt-8 public-skeleton-surface p-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="rounded-[1.7rem] border border-emerald-100/70 bg-white/70 p-5">
                    <SkeletonBlock className="h-28 w-full rounded-[1.2rem]" />
                    <SkeletonBlock className="mt-4 h-6 w-3/4 rounded-full" />
                    <SkeletonBlock className="mt-3 h-4 w-full rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  )
}
