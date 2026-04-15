import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus } from '../enums/product-status.enum';

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(140)
  slug?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  longDescription?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1000000)
  price: number;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  currency?: string;

  @IsString()
  image: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  category: string;

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
  @IsString()
  @MaxLength(160)
  rawMaterialName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100000000)
  rawMaterialInitialStockMl?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100000000)
  rawMaterialConsumptionPerBatchMl?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsNumber()
  @Min(1)
  @Max(1000000)
  rawMaterialBatchYieldUnits?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsNumber()
  @Min(0)
  @Max(100000)
  stockMin?: number;

  @IsOptional()
  @IsBoolean()
  allowBackorder?: boolean;

  @IsOptional()
  @IsBoolean()
  inStock?: boolean;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsNumber()
  @Min(0)
  reviews?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsNumber()
  @Min(1)
  @Max(100000)
  sortOrder?: number;
}
