import { Type } from 'class-transformer';
import { IsArray, IsInt, IsString, Max, Min, ValidateNested } from 'class-validator';

export class ReplaceCartItemDto {
  @IsString()
  productId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(25)
  quantity: number;
}

export class ReplaceCartDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReplaceCartItemDto)
  items: ReplaceCartItemDto[];
}
