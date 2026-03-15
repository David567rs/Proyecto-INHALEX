import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ProductStatus } from '../enums/product-status.enum';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(140)
  slug?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  longDescription?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  currency?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aromas?: string[];

  @IsOptional()
  @IsString()
  presentation?: string;

  @IsOptional()
  @IsString()
  origin?: string;

  @IsOptional()
  @IsBoolean()
  inStock?: boolean;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reviews?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  sortOrder?: number;
}
