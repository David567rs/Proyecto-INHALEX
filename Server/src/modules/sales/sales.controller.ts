import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SalesService } from './sales.service';
import {
  GetSalesHistoryDto,
  GetSalesMetricsDto,
  GetSalesOverviewDto,
  SalesDataPointDto,
  SalesMetricsDto,
} from './dto/sales-history.dto';
import {
  DepletionForecastDto,
  GetDepletionForecastQueryDto,
} from './dto/sales-depletion-forecast.dto';

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get('history/:productId')
  @HttpCode(HttpStatus.OK)
  async getSalesHistory(
    @Param('productId') productId: string,
    @Query() query: GetSalesHistoryDto,
  ): Promise<SalesDataPointDto[]> {
    return this.salesService.getSalesHistory({
      productId,
      periodType: query.periodType,
      startDate: query.startDate,
      endDate: query.endDate,
      year: query.year,
      month: query.month,
    });
  }

  @Get('metrics/:productId')
  @HttpCode(HttpStatus.OK)
  async getSalesMetrics(
    @Param('productId') productId: string,
    @Query() query: GetSalesMetricsDto,
  ): Promise<SalesMetricsDto> {
    return this.salesService.getSalesMetrics({
      productId,
      periodType: query.periodType,
      startDate: query.startDate,
      endDate: query.endDate,
      year: query.year,
      month: query.month,
    });
  }

  @Get('overview')
  @HttpCode(HttpStatus.OK)
  async getSalesOverview(
    @Query() query: GetSalesOverviewDto,
  ): Promise<any> {
    return this.salesService.getSalesOverview(query);
  }

  @Get('forecast/:productId')
  @HttpCode(HttpStatus.OK)
  async getDepletionForecast(
    @Param('productId') productId: string,
    @Query() query: GetDepletionForecastQueryDto,
  ): Promise<DepletionForecastDto> {
    return this.salesService.getDepletionForecast(productId, query);
  }
}
