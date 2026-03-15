import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ImportProductsCsvRowDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  categoria?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  precio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  moneda?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  presentacion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(24)
  presentation_ml?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  estado?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  disponible?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  orden?: string;
}

export class ImportProductsCsvDto {
  @IsArray()
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => ImportProductsCsvRowDto)
  rows: ImportProductsCsvRowDto[];
}

