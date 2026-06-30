import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  CustomerReportPriority,
  CustomerReportStatus,
} from '../schemas/customer-report.schema';

export class UpdateCustomerReportDto {
  @IsOptional()
  @IsEnum(CustomerReportStatus)
  status?: CustomerReportStatus;

  @IsOptional()
  @IsEnum(CustomerReportPriority)
  priority?: CustomerReportPriority;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNote?: string;
}
