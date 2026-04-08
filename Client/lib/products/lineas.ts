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
    name: "Linea insomnio",
    label: "Descanso natural",
    headline: "Rituales aromaticos para bajar el ritmo y preparar una noche mas serena.",
    description:
      "Esta linea reune aromas suaves, florales y herbaceos para acompañar rutinas de descanso, lectura y relajacion profunda.",
    ritual:
      "Ideal para el cierre del dia, despues de una jornada intensa o como parte de tu rutina nocturna.",
    image: `${LINEAS_IMAGE_BASE}/insomnio.png`,
    highlights: ["Calma nocturna", "Notas florales", "Acompaña el descanso"],
    heroGradient: "from-emerald-950 via-teal-900 to-emerald-700",
    heroGlow: "bg-emerald-300/30",
    frameSurface:
      "border-emerald-200/60 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.28),rgba(17,94,89,0.2)_55%,rgba(4,47,46,0.5))]",
    badgeSurface:
      "border-emerald-200/50 bg-emerald-50/90 text-emerald-700",
    statSurface:
      "border-emerald-200/60 bg-white/10 text-white shadow-[0_20px_50px_-38px_rgba(16,185,129,0.55)]",
    chipSurface:
      "border-emerald-200/70 bg-emerald-50/80 text-emerald-800",
    accentSurface:
      "border-emerald-100/80 bg-[linear-gradient(180deg,rgba(236,253,245,0.95),rgba(255,255,255,0.92))]",
    heroImagePosition: "center bottom",
    heroImageAspect: "aspect-[2/3]",
    heroImagePadding: "p-2 sm:p-2.5",
  },
  {
    id: "linea-ansiedad-estres",
    name: "Linea ansiedad y estres",
    label: "Equilibrio emocional",
    headline: "Una coleccion pensada para soltar la tension y recuperar centro con cada inhalacion.",
    description:
      "Integra perfiles florales, especiados y balsamicos que ayudan a crear un ambiente mas suave, estable y reconfortante.",
    ritual:
      "Acompaña pausas conscientes, momentos de sobrecarga mental y espacios donde necesitas volver a tu eje.",
    image: `${LINEAS_IMAGE_BASE}/ansiedad-estres.png`,
    highlights: ["Pausa emocional", "Toques balsamicos", "Sensacion reconfortante"],
    heroGradient: "from-rose-900 via-fuchsia-900 to-amber-700",
    heroGlow: "bg-rose-300/30",
    frameSurface:
      "border-rose-200/55 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.24),rgba(159,18,57,0.18)_54%,rgba(67,20,7,0.55))]",
    badgeSurface:
      "border-rose-200/60 bg-rose-50/90 text-rose-700",
    statSurface:
      "border-rose-200/50 bg-white/10 text-white shadow-[0_20px_50px_-38px_rgba(244,114,182,0.45)]",
    chipSurface:
      "border-rose-200/70 bg-rose-50/80 text-rose-800",
    accentSurface:
      "border-rose-100/80 bg-[linear-gradient(180deg,rgba(255,241,242,0.95),rgba(255,255,255,0.92))]",
    heroImagePosition: "center 52%",
    heroImageAspect: "aspect-[2/3]",
    heroImagePadding: "p-2 sm:p-2.5",
  },
  {
    id: "linea-resfriado",
    name: "Linea resfriado",
    label: "Alivio respiratorio",
    headline: "Notas calidas y botanicas para acompañar temporadas de resfriado y malestar.",
    description:
      "Su seleccion equilibra frescura respiratoria con acordes especiados para brindar una sensacion de alivio y confort.",
    ritual:
      "Pensada para dias frios, congestion ligera y momentos donde el cuerpo pide calor, aire y bienestar.",
    image: `${LINEAS_IMAGE_BASE}/resfriado.png`,
    highlights: ["Respiro mas claro", "Aromas especiados", "Sensacion reconfortante"],
    heroGradient: "from-amber-950 via-orange-800 to-amber-500",
    heroGlow: "bg-amber-300/35",
    frameSurface:
      "border-amber-200/60 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.24),rgba(217,119,6,0.2)_54%,rgba(120,53,15,0.56))]",
    badgeSurface:
      "border-amber-200/70 bg-amber-50/95 text-amber-700",
    statSurface:
      "border-amber-200/50 bg-white/10 text-white shadow-[0_20px_50px_-38px_rgba(251,191,36,0.48)]",
    chipSurface:
      "border-amber-200/70 bg-amber-50/85 text-amber-900",
    accentSurface:
      "border-amber-100/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.95),rgba(255,255,255,0.92))]",
    heroImagePosition: "center bottom",
    heroImageAspect: "aspect-[2/3]",
    heroImagePadding: "p-2.5 sm:p-3",
  },
  {
    id: "linea-verde",
    name: "Linea verde",
    label: "Frescura botanica",
    headline: "Una linea vibrante para despejar, refrescar y sentir el impulso verde de las plantas.",
    description:
      "Reune aromas mentolados y herbales con una sensacion limpia, directa y muy refrescante para el dia a dia.",
    ritual:
      "Perfecta para comenzar la manana, despejar la respiracion o regalar un momento de frescura inmediata.",
    image: `${LINEAS_IMAGE_BASE}/verde.png`,
    highlights: ["Sensacion fresca", "Tonos mentolados", "Energia botanica"],
    heroGradient: "from-cyan-950 via-sky-800 to-emerald-500",
    heroGlow: "bg-cyan-300/30",
    frameSurface:
      "border-cyan-200/60 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.24),rgba(14,116,144,0.18)_54%,rgba(8,51,68,0.56))]",
    badgeSurface:
      "border-cyan-200/70 bg-cyan-50/90 text-cyan-700",
    statSurface:
      "border-cyan-200/50 bg-white/10 text-white shadow-[0_20px_50px_-38px_rgba(56,189,248,0.45)]",
    chipSurface:
      "border-cyan-200/70 bg-cyan-50/85 text-cyan-900",
    accentSurface:
      "border-cyan-100/80 bg-[linear-gradient(180deg,rgba(236,254,255,0.95),rgba(255,255,255,0.92))]",
    heroImagePosition: "center 56%",
    heroImageAspect: "aspect-[2/3]",
    heroImagePadding: "p-2 sm:p-2.5",
  },
  {
    id: "linea-estimulante",
    name: "Linea estimulante",
    label: "Impulso natural",
    headline: "Aromas intensos que despiertan la atencion, activan los sentidos y levantan el animo.",
    description:
      "Esta linea combina perfiles energicos, tostados y resinosos para acompañar momentos de enfoque, accion y presencia.",
    ritual:
      "Ideal para arrancar proyectos, retomar energia a media jornada o activar la mente antes de una tarea importante.",
    image: `${LINEAS_IMAGE_BASE}/estimulante.png`,
    highlights: ["Enfoque activo", "Notas intensas", "Sensacion energizante"],
    heroGradient: "from-lime-950 via-emerald-800 to-yellow-500",
    heroGlow: "bg-lime-300/30",
    frameSurface:
      "border-lime-200/60 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.24),rgba(77,124,15,0.18)_54%,rgba(39,39,42,0.56))]",
    badgeSurface:
      "border-lime-200/70 bg-lime-50/90 text-lime-800",
    statSurface:
      "border-lime-200/50 bg-white/10 text-white shadow-[0_20px_50px_-38px_rgba(132,204,22,0.45)]",
    chipSurface:
      "border-lime-200/70 bg-lime-50/85 text-lime-900",
    accentSurface:
      "border-lime-100/80 bg-[linear-gradient(180deg,rgba(247,254,231,0.95),rgba(255,255,255,0.92))]",
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
