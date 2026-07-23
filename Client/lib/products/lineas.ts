export interface LineaConfig {
  id: string
  name: string
  label: string
  headline: string
  description: string
  ritual: string
  image: string
  highlights: string[]
  heroGradient: string
  heroGlow: string
  frameSurface: string
  badgeSurface: string
  statSurface: string
  chipSurface: string
  accentSurface: string
  heroImagePosition: string
  heroImageAspect: string
  heroImagePadding: string
}

const LINEAS_IMAGE_BASE = "/L%C3%ADneas"

export const LINEA_CONFIGS: LineaConfig[] = [
  {
    id: "linea-insomnio",
    name: "L\u00ednea insomnio",
    label: "Descanso natural",
    headline: "Rituales arom\u00e1ticos para bajar el ritmo y preparar una noche m\u00e1s serena.",
    description:
      "Esta l\u00ednea re\u00fane aromas suaves, florales y herb\u00e1ceos para acompa\u00f1ar rutinas de descanso, lectura y relajaci\u00f3n profunda.",
    ritual:
      "Ideal para el cierre del d\u00eda, despu\u00e9s de una jornada intensa o como parte de tu rutina nocturna.",
    image: `${LINEAS_IMAGE_BASE}/insomnio.png`,
    highlights: ["Calma nocturna", "Notas florales", "Acompa\u00f1a el descanso"],
    heroGradient: "from-[#edf5ef] via-[#f9fbf9] to-[#eef4f2]",
    heroGlow: "bg-emerald-200/60",
    frameSurface:
      "border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.88),rgba(230,242,235,0.86))]",
    badgeSurface:
      "border-emerald-200/90 bg-white/92 text-emerald-800",
    statSurface:
      "border-emerald-100/80 bg-white/70 text-emerald-950 shadow-[0_24px_46px_-38px_rgba(22,101,52,0.28)]",
    chipSurface:
      "border-emerald-100/90 bg-emerald-50/88 text-emerald-900",
    accentSurface:
      "border-emerald-100/85 bg-[linear-gradient(180deg,rgba(245,251,246,0.98),rgba(255,255,255,0.94))]",
    heroImagePosition: "center bottom",
    heroImageAspect: "aspect-[2/3]",
    heroImagePadding: "p-2 sm:p-2.5",
  },
  {
    id: "linea-ansiedad-estres",
    name: "L\u00ednea ansiedad y estr\u00e9s",
    label: "Equilibrio emocional",
    headline: "Una colecci\u00f3n pensada para soltar la tensi\u00f3n y recuperar centro con cada inhalaci\u00f3n.",
    description:
      "Integra perfiles florales, especiados y bals\u00e1micos para una experiencia arom\u00e1tica personal suave, estable y reconfortante.",
    ritual:
      "Acompa\u00f1a pausas conscientes, momentos de sobrecarga mental y espacios donde necesitas volver a tu eje.",
    image: `${LINEAS_IMAGE_BASE}/ansiedad-estres.png`,
    highlights: ["Pausa emocional", "Toques bals\u00e1micos", "Sensaci\u00f3n reconfortante"],
    heroGradient: "from-[#faf0f3] via-[#fffaf8] to-[#eef4ef]",
    heroGlow: "bg-rose-200/60",
    frameSurface:
      "border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.9),rgba(250,234,239,0.84))]",
    badgeSurface:
      "border-rose-200/90 bg-white/92 text-rose-800",
    statSurface:
      "border-rose-100/80 bg-white/72 text-slate-900 shadow-[0_24px_46px_-38px_rgba(190,24,93,0.18)]",
    chipSurface:
      "border-rose-100/90 bg-rose-50/90 text-rose-900",
    accentSurface:
      "border-rose-100/85 bg-[linear-gradient(180deg,rgba(255,246,248,0.98),rgba(255,255,255,0.94))]",
    heroImagePosition: "center 52%",
    heroImageAspect: "aspect-[2/3]",
    heroImagePadding: "p-2 sm:p-2.5",
  },
  {
    id: "linea-resfriado",
    name: "L\u00ednea resfriado",
    label: "Bienestar respiratorio",
    headline: "Notas c\u00e1lidas y bot\u00e1nicas para acompa\u00f1ar respiraciones pausadas en temporadas fr\u00edas.",
    description:
      "Su selecci\u00f3n combina perfiles frescos y especiados para brindar una sensaci\u00f3n respiratoria agradable y reconfortante.",
    ritual:
      "Pensada para d\u00edas fr\u00edos y momentos en los que buscas calidez, frescura y una pausa de bienestar personal.",
    image: `${LINEAS_IMAGE_BASE}/resfriado.png`,
    highlights: ["Frescura al respirar", "Aromas especiados", "Sensaci\u00f3n reconfortante"],
    heroGradient: "from-[#f7efe4] via-[#fffaf4] to-[#eef4ee]",
    heroGlow: "bg-amber-200/65",
    frameSurface:
      "border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.9),rgba(250,239,220,0.86))]",
    badgeSurface:
      "border-amber-200/90 bg-white/92 text-amber-800",
    statSurface:
      "border-amber-100/80 bg-white/72 text-slate-900 shadow-[0_24px_46px_-38px_rgba(180,83,9,0.18)]",
    chipSurface:
      "border-amber-100/90 bg-amber-50/90 text-amber-950",
    accentSurface:
      "border-amber-100/85 bg-[linear-gradient(180deg,rgba(255,249,240,0.98),rgba(255,255,255,0.94))]",
    heroImagePosition: "center bottom",
    heroImageAspect: "aspect-[2/3]",
    heroImagePadding: "p-2.5 sm:p-3",
  },
  {
    id: "linea-verde",
    name: "L\u00ednea verde",
    label: "Frescura bot\u00e1nica",
    headline: "Una l\u00ednea vibrante para despejar, refrescar y sentir el impulso verde de las plantas.",
    description:
      "Re\u00fane aromas mentolados y herbales con una sensaci\u00f3n limpia, directa y muy refrescante para el d\u00eda a d\u00eda.",
    ritual:
      "Perfecta para comenzar la ma\u00f1ana, acompa\u00f1ar una respiraci\u00f3n pausada o regalarte un momento de frescura.",
    image: `${LINEAS_IMAGE_BASE}/verde.png`,
    highlights: ["Sensaci\u00f3n fresca", "Tonos mentolados", "Energ\u00eda bot\u00e1nica"],
    heroGradient: "from-[#edf6f0] via-[#fbfdfb] to-[#edf7f4]",
    heroGlow: "bg-cyan-200/55",
    frameSurface:
      "border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.9),rgba(232,247,243,0.86))]",
    badgeSurface:
      "border-cyan-200/90 bg-white/92 text-cyan-800",
    statSurface:
      "border-cyan-100/80 bg-white/72 text-slate-900 shadow-[0_24px_46px_-38px_rgba(8,145,178,0.18)]",
    chipSurface:
      "border-cyan-100/90 bg-cyan-50/90 text-cyan-950",
    accentSurface:
      "border-cyan-100/85 bg-[linear-gradient(180deg,rgba(241,252,254,0.98),rgba(255,255,255,0.94))]",
    heroImagePosition: "center 56%",
    heroImageAspect: "aspect-[2/3]",
    heroImagePadding: "p-2 sm:p-2.5",
  },
  {
    id: "linea-estimulante",
    name: "L\u00ednea estimulante",
    label: "Impulso natural",
    headline: "Aromas intensos que despiertan la atenci\u00f3n, activan los sentidos y levantan el \u00e1nimo.",
    description:
      "Esta l\u00ednea combina perfiles en\u00e9rgicos, tostados y resinosos para acompa\u00f1ar momentos de enfoque, acci\u00f3n y presencia.",
    ritual:
      "Ideal para arrancar proyectos, retomar energ\u00eda a media jornada o activar la mente antes de una tarea importante.",
    image: `${LINEAS_IMAGE_BASE}/estimulante.png`,
    highlights: ["Enfoque activo", "Notas intensas", "Sensaci\u00f3n energizante"],
    heroGradient: "from-[#f2f2e7] via-[#fbfbf5] to-[#eef4eb]",
    heroGlow: "bg-lime-200/60",
    frameSurface:
      "border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.9),rgba(240,244,222,0.86))]",
    badgeSurface:
      "border-lime-200/90 bg-white/92 text-lime-800",
    statSurface:
      "border-lime-100/80 bg-white/72 text-slate-900 shadow-[0_24px_46px_-38px_rgba(77,124,15,0.18)]",
    chipSurface:
      "border-lime-100/90 bg-lime-50/90 text-lime-950",
    accentSurface:
      "border-lime-100/85 bg-[linear-gradient(180deg,rgba(248,251,239,0.98),rgba(255,255,255,0.94))]",
    heroImagePosition: "center 54%",
    heroImageAspect: "aspect-[2/3]",
    heroImagePadding: "p-2 sm:p-2.5",
  },
]

export function getLineaConfig(categoryId: string): LineaConfig | undefined {
  return LINEA_CONFIGS.find((linea) => linea.id === categoryId)
}

export function getLineaHref(categoryId: string): string {
  return `/categorias/${categoryId}`
}
