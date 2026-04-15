import { IsDateString, IsOptional } from 'class-validator';

export type ForecastTrend = 'growth' | 'decline' | 'stable';

export type ForecastStatus =
  | 'ready'
  | 'warning'
  | 'critical'
  | 'no_sales'
  | 'not_configured';

export class DepletionChartPointDto {
  date: string;
  label: string;
  stockMl: number;
  units: number;
  kind: 'actual' | 'current' | 'projection';
}

export class GetDepletionForecastQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class DepletionForecastDto {
  product: {
    id: string;
    name: string;
    category: string;
    image?: string;
    presentation?: string;
  };
  configuration: {
    rawMaterialName?: string;
    initialStockMl?: number;
    consumptionPerBatchMl?: number;
    batchYieldUnits?: number;
    criticalUnits?: number;
    consumptionPerPieceMl?: number;
  };
  analysis: {
    model: 'exponential';
    startDate?: string;
    endDate?: string;
    observedDays: number;
    totalSalesUnits: number;
    accumulatedConsumptionMl: number;
    averageDailyUnits: number;
    projectedDailyUnits: number;
    projectedDailyConsumptionMl: number;
    exponentialRateK: number;
    growthRate: number;
    trend: ForecastTrend;
  };
  forecast: {
    estimatedCurrentStockMl?: number;
    criticalLevelMl?: number;
    remainingUntilCriticalMl?: number;
    estimatedDaysToCritical?: number | null;
    remainingDaysToCritical?: number | null;
    estimatedCriticalDate?: string | null;
    status: ForecastStatus;
  };
  chart: {
    initialStockMl?: number;
    criticalLevelMl?: number;
    actualPoints: DepletionChartPointDto[];
    projectedPoint?: DepletionChartPointDto | null;
  };
  missingFields: string[];
}
