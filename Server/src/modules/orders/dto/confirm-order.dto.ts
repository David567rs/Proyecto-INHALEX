import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';
import { CreateOrderDraftDto } from './create-order-draft.dto';

const trimValue = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class ConfirmOrderDto extends CreateOrderDraftDto {
  @Transform(trimValue)
  @IsString()
  @Length(16, 160)
  previewSignature: string;
}
