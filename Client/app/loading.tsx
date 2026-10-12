import { PublicPageSkeleton } from "@/components/common/public-page-skeleton"

export default function Loading() {
  // Next also renders this fallback for /_global-error without the root providers.
  return <PublicPageSkeleton variant="default" standalone />
}
