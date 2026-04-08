import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { InventoryMovementType } from '../enums/inventory-movement-type.enum';

export class AdjustProductInventoryDto {
  @IsEnum(InventoryMovementType)
  type: InventoryMovementType;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  note?: string;
}
