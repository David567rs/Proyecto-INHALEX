import type { Metadata } from "next"

import { AdminRfmSegmentationDemo } from "@/components/demo/admin-rfm-segmentation-demo"
import { AnalyticsAdminDemoShell } from "@/components/demo/analytics-admin-demo-shell"

export const metadata: Metadata = {
  title: "Segmentación RFM de clientes | INHALEX",
  description:
    "Demostración académica de la segmentación RFM de clientes en el panel administrativo de INHALEX.",
}

export default function RfmSegmentationDemoPage() {
  return (
    <AnalyticsAdminDemoShell
      activeModule="usuarios"
      moduleTitle="Usuarios"
      moduleDescription="Perfiles, comportamiento y segmentación RFM"
    >
      <AdminRfmSegmentationDemo />
    </AnalyticsAdminDemoShell>
  )
}
