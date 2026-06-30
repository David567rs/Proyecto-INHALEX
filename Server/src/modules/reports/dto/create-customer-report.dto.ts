import {
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  CustomerReportPriority,
  CustomerReportType,
} from '../schemas/customer-report.schema';

export class CreateCustomerReportDto {
  @IsEnum(CustomerReportType)
  type: CustomerReportType;

  @IsString()
  @MinLength(5)
  @MaxLength(120)
  title: string;

  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  message: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  orderReference?: string;

  @IsOptional()
  @IsMongoId()
  productId?: string;

  @IsOptional()
  @IsEnum(CustomerReportPriority)
  priority?: CustomerReportPriority;
}
