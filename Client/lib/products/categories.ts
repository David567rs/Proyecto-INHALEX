export interface ProductCategoryOption {
  id: string
  name: string
  count?: number
}

export const PRODUCT_CATEGORIES: ProductCategoryOption[] = [
  { id: "all", name: "Todos" },
  { id: "linea-insomnio", name: "Línea insomnio" },
  { id: "linea-ansiedad-estres", name: "Línea ansiedad y estrés" },
  { id: "linea-resfriado", name: "Línea resfriado" },
  { id: "linea-verde", name: "Línea verde" },
  { id: "linea-estimulante", name: "Línea estimulante" },
]
