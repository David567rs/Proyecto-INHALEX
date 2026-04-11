import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SalesPeriodType } from '../schemas/sales-aggregate.schema';

export class GetSalesHistoryDto {
  @IsOptional()
  @IsString()
  productId: string;

  @IsEnum(SalesPeriodType)
  periodType: SalesPeriodType;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  month?: number;
}

export class GetSalesMetricsDto {
  @IsOptional()
  @IsString()
  productId: string;

  @IsEnum(SalesPeriodType)
  periodType: SalesPeriodType;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  month?: number;
}

export class SalesDataPointDto {
  period: string;
  units: number;
  revenue: number;
  orders: number;
  averageOrderValue: number;
}

export class SalesMetricsDto {
  averageDaily: number;
  totalSold: number;
  daysWithSales: number;
  totalRevenue: number;
  growthRate: number;
  averageOrderValue: number;
  totalOrders: number;
}

export class GetSalesOverviewDto {
  @IsOptional()
  @IsEnum(SalesPeriodType)
  periodType?: SalesPeriodType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}
