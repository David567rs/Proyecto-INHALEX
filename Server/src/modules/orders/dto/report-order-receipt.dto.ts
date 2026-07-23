import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ReportOrderReceiptDto {
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  note?: string;
}
