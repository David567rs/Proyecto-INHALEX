import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  CustomerReportStatus,
  CustomerReportType,
} from '../schemas/customer-report.schema';

export class ListAdminReportsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(CustomerReportStatus)
  status?: CustomerReportStatus;

  @IsOptional()
  @IsEnum(CustomerReportType)
  type?: CustomerReportType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 12;
}
