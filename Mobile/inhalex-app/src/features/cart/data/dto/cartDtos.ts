import type { ProductDto } from '../../../catalog/data/dto/catalogDtos';

export interface CartItemDto {
  productId: string;
  quantity: number;
  subtotal: number;
  product: ProductDto;
}

export interface CartDto {
  items: CartItemDto[];
  totalItems: number;
  subtotal: number;
  currency: string;
}
