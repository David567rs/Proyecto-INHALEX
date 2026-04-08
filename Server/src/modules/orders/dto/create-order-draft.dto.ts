import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';
import { OrderDraftItemDto } from './order-draft-item.dto';

const trimValue = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateOrderDraftDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => OrderDraftItemDto)
  items: OrderDraftItemDto[];

  @Transform(trimValue)
  @IsString()
  @Length(2, 120)
  customerName: string;

  @Transform(trimValue)
  @IsEmail()
  @Length(5, 120)
  customerEmail: string;

  @Transform(trimValue)
  @Matches(/^\d{10,15}$/)
  customerPhone: string;

  @Transform(trimValue)
  @IsOptional()
  @IsString()
  @Length(0, 600)
  notes?: string;
}
