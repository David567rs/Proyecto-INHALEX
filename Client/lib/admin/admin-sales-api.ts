import { apiRequest } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token-storage";

// Types para la API de ventas
export interface SalesDataPoint {
  period: string;
  units: number;
  revenue: number;
  orders: number;
  averageOrderValue: number;
}

export interface SalesMetrics {
  averageDaily: number;
  totalSold: number;
  daysWithSales: number;
  totalRevenue: number;
  growthRate: number;
  averageOrderValue: number;
  totalOrders: number;
}

export interface SalesOverview {
  summary: {
    totalUnits: number;
    totalRevenue: number;
    totalOrders: number;
    activeProducts: number;
    averageGrowthRate: number;
  };
  topProducts: Array<{
    id: string;
    name: string;
    category: string;
    totalSales: number;
    revenue: number;
    growth: number;
  }>;
}

export type MonthlyDemandInventoryStatus =
  | "ready"
  | "warning"
  | "critical"
  | "untracked";

export interface MonthlyDemandForecast {
  model: {
    name: string;
    version: string;
    isSynthetic: boolean;
    generatedAt: string;
    trainingPeriod: {
      startMonth: string;
      endMonth: string;
      trainingRows: number;
      validationRows: number;
    };
    metrics: {
      mae: number;
      rmse: number;
      r2: number;
      baselineMae: number;
      improvementPct?: number;
    };
  };
  targetMonth: string;
  freshness: {
    currentMonth: string;
    targetMonth: string;
    generatedAt: string;
    isStale: boolean;
  };
  summary: {
    predictedUnits: number;
    recommendedReorder: number;
    atRiskProducts: number;
    untrackedProducts: number;
    totalProducts: number;
    unresolvedProducts: number;
  };
  items: MonthlyDemandForecastItem[];
}

export interface MonthlyDemandForecastItem {
  product: {
    id: string;
    slug: string;
    name: string;
    category: string;
    image?: string;
    presentation?: string;
  };
  history: Array<{
    month: string;
    units: number;
  }>;
  features: {
    demandLag1m: number;
    demandLag2m: number;
    demandLag3m: number;
    averageDemand3m: number;
    ordersLag1m: number;
    averagePriceLag1m?: number | null;
    averageRatingAsOf?: number | null;
    reviewCountAsOf: number;
    monthNumber: number;
  };
  prediction: {
    units: number;
    lower: number;
    upper: number;
  };
  inventory: {
    stockAvailable: number | null;
    stockMin: number;
    targetStock: number;
    recommendedReorder: number | null;
    status: MonthlyDemandInventoryStatus;
  };
}

export interface DepletionChartPoint {
  date: string
  label: string
  stockMl: number
  units: number
  kind: "actual" | "current" | "projection"
}

export interface DepletionForecast {
  product: {
    id: string
    name: string
    category: string
    image?: string
    presentation?: string
  }
  configuration: {
    rawMaterialName?: string
    initialStockMl?: number
    consumptionPerBatchMl?: number
    batchYieldUnits?: number
    criticalUnits?: number
    consumptionPerPieceMl?: number
  }
  analysis: {
    model: "exponential"
    startDate?: string
    endDate?: string
    observedDays: number
    totalSalesUnits: number
    accumulatedConsumptionMl: number
    averageDailyUnits: number
    projectedDailyUnits: number
    projectedDailyConsumptionMl: number
    exponentialRateK: number
    growthRate: number
    trend: "growth" | "decline" | "stable"
  }
  forecast: {
    estimatedCurrentStockMl?: number
    criticalLevelMl?: number
    remainingUntilCriticalMl?: number
    estimatedDaysToCritical?: number | null
    remainingDaysToCritical?: number | null
    estimatedCriticalDate?: string | null
    status: "ready" | "warning" | "critical" | "no_sales" | "not_configured"
  }
  chart: {
    initialStockMl?: number
    criticalLevelMl?: number
    actualPoints: DepletionChartPoint[]
    projectedPoint?: DepletionChartPoint | null
  }
  missingFields: string[]
}

export type SalesPeriodType = "daily" | "weekly" | "monthly";

// API Client para ventas — usa el mismo apiRequest que el resto del proyecto
export class AdminSalesAPI {
  private static async getToken(): Promise<string> {
    const token = await getAccessToken();
    return token ?? "";
  }

  // Obtener historial de ventas para un producto
  static async getSalesHistory(
    productId: string,
    periodType: SalesPeriodType,
    options?: {
      startDate?: string;
      endDate?: string;
      year?: number;
      month?: number;
    },
  ): Promise<SalesDataPoint[]> {
    const token = await this.getToken();
    const params = new URLSearchParams({
      periodType,
      ...(options?.startDate && { startDate: options.startDate }),
      ...(options?.endDate && { endDate: options.endDate }),
      ...(options?.year && { year: options.year.toString() }),
      ...(options?.month && { month: options.month.toString() }),
    });

    return apiRequest<SalesDataPoint[]>(
      `/sales/history/${productId}?${params}`,
      { method: "GET", token },
    );
  }

  // Obtener métricas de ventas para un producto
  static async getSalesMetrics(
    productId: string,
    periodType: SalesPeriodType,
    options?: {
      startDate?: string;
      endDate?: string;
      year?: number;
      month?: number;
    },
  ): Promise<SalesMetrics> {
    const token = await this.getToken();
    const params = new URLSearchParams({
      periodType,
      ...(options?.startDate && { startDate: options.startDate }),
      ...(options?.endDate && { endDate: options.endDate }),
      ...(options?.year && { year: options.year.toString() }),
      ...(options?.month && { month: options.month.toString() }),
    });

    return apiRequest<SalesMetrics>(
      `/sales/metrics/${productId}?${params}`,
      { method: "GET", token },
    );
  }

  // Obtener overview de ventas para todos los productos
  static async getSalesOverview(options?: {
    periodType?: SalesPeriodType;
    limit?: number;
  }): Promise<SalesOverview> {
    const token = await this.getToken();
    const params = new URLSearchParams({
      ...(options?.periodType && { periodType: options.periodType }),
      ...(options?.limit && { limit: options.limit.toString() }),
    });

    return apiRequest<SalesOverview>(
      `/sales/overview?${params}`,
      { method: "GET", token },
    );
  }

  static async getMonthlyDemandForecast(): Promise<MonthlyDemandForecast> {
    const token = await this.getToken();
    return apiRequest<MonthlyDemandForecast>("/sales/demand-forecast", {
      method: "GET",
      token,
    });
  }

  static async getDepletionForecast(
    productId: string,
    options?: {
      startDate?: string
      endDate?: string
    },
  ): Promise<DepletionForecast> {
    const token = await this.getToken()
    const params = new URLSearchParams({
      ...(options?.startDate && { startDate: options.startDate }),
      ...(options?.endDate && { endDate: options.endDate }),
    })
    const suffix = params.toString() ? `?${params}` : ""
    return apiRequest<DepletionForecast>(`/sales/forecast/${productId}${suffix}`, {
      method: "GET",
      token,
    })
  }
}
