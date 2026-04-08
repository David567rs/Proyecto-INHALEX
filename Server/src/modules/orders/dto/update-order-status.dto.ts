import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { OrderStatus } from '../enums/order-status.enum';

const trimValue = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @Transform(trimValue)
  @IsOptional()
  @IsString()
  @Length(0, 500)
  note?: string;
}
