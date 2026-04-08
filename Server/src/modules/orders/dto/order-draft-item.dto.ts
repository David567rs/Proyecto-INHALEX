import { Type } from 'class-transformer';
import { IsInt, IsMongoId, Max, Min } from 'class-validator';

export class OrderDraftItemDto {
  @IsMongoId()
  productId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(25)
  quantity: number;
}
