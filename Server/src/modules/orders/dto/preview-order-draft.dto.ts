import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { OrderDraftItemDto } from './order-draft-item.dto';

export class PreviewOrderDraftDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => OrderDraftItemDto)
  items: OrderDraftItemDto[];
}
