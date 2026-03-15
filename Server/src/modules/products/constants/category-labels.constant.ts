import { ProductCategory } from '../enums/product-category.enum';

export interface ProductCategoryLabel {
  id: ProductCategory;
  name: string;
}

export const PRODUCT_CATEGORY_LABELS: ProductCategoryLabel[] = [
  { id: ProductCategory.LINEA_INSOMNIO, name: 'Linea insomnio' },
  {
    id: ProductCategory.LINEA_ANSIEDAD_ESTRES,
    name: 'Linea ansiedad y estres',
  },
  { id: ProductCategory.LINEA_RESFRIADO, name: 'Linea resfriado' },
  { id: ProductCategory.LINEA_VERDE, name: 'Linea verde' },
  { id: ProductCategory.LINEA_ESTIMULANTE, name: 'Linea estimulante' },
];

