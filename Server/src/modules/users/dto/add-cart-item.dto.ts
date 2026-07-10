import { Allow, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AddCartItemDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  productSlug?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(25)
  quantity?: number;

  @Allow()
  product?: unknown;

  @Allow()
  alexaUserId?: unknown;

  @Allow()
  userId?: unknown;

  @Allow()
  source?: unknown;
}
