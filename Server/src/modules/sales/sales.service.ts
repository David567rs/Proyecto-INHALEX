import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  GetSalesHistoryDto,
  GetSalesMetricsDto,
  GetSalesOverviewDto,
  SalesDataPointDto,
  SalesMetricsDto,
} from './dto/sales-history.dto';
import {
  DepletionChartPointDto,
  DepletionForecastDto,
  ForecastStatus,
  ForecastTrend,
  GetDepletionForecastQueryDto,
} from './dto/sales-depletion-forecast.dto';
import {
  SalesAggregateDocument,
  SalesPeriodType,
} from './schemas/sales-aggregate.schema';
import { OrderStatus } from '../orders/enums/order-status.enum';
import {
  Order,
  OrderDocument,
  OrderItemSnapshot,
} from '../orders/schemas/order.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';

interface DateRange {
  start: Date;
  end: Date;
}

interface SalesBucket {
  periodStart: Date;
  units: number;
  revenue: number;
  orderIds: Set<string>;
}

interface ProductSalesBucket {
  id: string;
  name: string;
  category: string;
  totalSales: number;
  revenue: number;
  orderIds: Set<string>;
}

interface RecordedProductSale {
  productId: string;
  productName: string;
  productSlug: string;
  category: string;
  periodType: SalesPeriodType;
  periodStart: Date;
  periodEnd: Date;
  units: number;
  revenue: number;
  orderId: string;
}

interface DailySalesPoint {
  date: Date;
  units: number;
  revenue: number;
  orders: number;
}

@Injectable()
export class SalesService {
  constructor(
    @InjectModel('SalesAggregate')
    private salesAggregateModel: Model<SalesAggregateDocument>,
    @InjectModel(Order.name)
    private orderModel: Model<OrderDocument>,
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
  ) {}

  async getSalesHistory(dto: GetSalesHistoryDto): Promise<SalesDataPointDto[]> {
    const aggregateData = await this.getSalesHistoryFromAggregates(dto);

    if (aggregateData.length > 0) {
      return aggregateData;
    }

    return this.calculateSalesFromOrders(dto);
  }

  async recordCompletedOrder(order: OrderDocument): Promise<void> {
    if (order.status !== OrderStatus.COMPLETED) {
      return;
    }

    const salesDate = this.getOrderSalesDate(order);
    const productSales = this.buildRecordedProductSales(order, salesDate);

    for (const sale of productSales.values()) {
      await this.upsertRecordedProductSale(sale);
    }
  }

  async rebuildSalesAggregatesFromCompletedOrders(): Promise<{
    deleted: number;
    processedOrders: number;
    aggregates: number;
  }> {
    const [deleteResult, completedOrders] = await Promise.all([
      this.salesAggregateModel.deleteMany({}).exec(),
      this.orderModel.find({ status: OrderStatus.COMPLETED }).exec(),
    ]);

    for (const order of completedOrders) {
      await this.recordCompletedOrder(order);
    }

    const aggregates = await this.salesAggregateModel.countDocuments().exec();

    return {
      deleted: deleteResult.deletedCount ?? 0,
      processedOrders: completedOrders.length,
      aggregates,
    };
  }

  async getSalesMetrics(dto: GetSalesMetricsDto): Promise<SalesMetricsDto> {
    const { productId, periodType, startDate, endDate, year, month } = dto;
    const dateRange = this.buildDateRange(
      periodType,
      startDate,
      endDate,
      year,
      month,
    );
    const salesData = await this.getSalesHistory(dto);

    if (salesData.length === 0) {
      return {
        averageDaily: 0,
        totalSold: 0,
        daysWithSales: 0,
        totalRevenue: 0,
        growthRate: 0,
        averageOrderValue: 0,
        totalOrders: 0,
      };
    }

    const totalUnits = salesData.reduce((sum, data) => sum + data.units, 0);
    const totalRevenue = salesData.reduce((sum, data) => sum + data.revenue, 0);
    const totalOrders = salesData.reduce((sum, data) => sum + data.orders, 0);
    const daysWithSales = salesData.filter((data) => data.units > 0).length;
    const daysInPeriod = this.getDaysInPeriod(
      periodType,
      dateRange.start,
      dateRange.end,
    );
    const averageDaily = totalUnits / daysInPeriod;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const growthRate = await this.calculateProductGrowthRate(
      productId,
      dateRange,
    );

    return {
      averageDaily: this.round(averageDaily, 1),
      totalSold: totalUnits,
      daysWithSales,
      totalRevenue: this.round(totalRevenue),
      growthRate: this.round(growthRate, 1),
      averageOrderValue: this.round(averageOrderValue),
      totalOrders,
    };
  }

  async getSalesOverview(dto: GetSalesOverviewDto): Promise<any> {
    const { periodType = SalesPeriodType.MONTHLY, limit = 10 } = dto;
    const dateRange = this.buildDateRange(periodType);
    const aggregateOverview = await this.getSalesOverviewFromAggregates(
      periodType,
      dateRange,
      Math.max(1, Number(limit) || 10),
    );

    if (aggregateOverview) {
      return aggregateOverview;
    }

    const previousRange = this.getPreviousDateRange(dateRange);
    const [orders, previousOrders] = await Promise.all([
      this.findCompletedOrdersInRange(dateRange),
      this.findCompletedOrdersInRange(previousRange),
    ]);

    const productsById = this.buildProductSalesMap(orders);
    const previousProductsById = this.buildProductSalesMap(previousOrders);
    const productRows = Array.from(productsById.values())
      .map((product) => {
        const previousProduct = previousProductsById.get(product.id);
        return {
          id: product.id,
          name: product.name,
          category: product.category,
          totalSales: product.totalSales,
          revenue: this.round(product.revenue),
          orders: product.orderIds.size,
          growth: this.round(
            this.calculateGrowth(
              product.totalSales,
              previousProduct?.totalSales ?? 0,
            ),
            1,
          ),
        };
      })
      .sort((left, right) => right.revenue - left.revenue);

    const totalUnits = productRows.reduce(
      (sum, product) => sum + product.totalSales,
      0,
    );
    const totalRevenue = orders.reduce(
      (sum, order) => sum + this.getOrderRevenue(order),
      0,
    );
    const averageGrowthRate =
      productRows.length > 0
        ? productRows.reduce((sum, product) => sum + product.growth, 0) /
          productRows.length
        : 0;

    return {
      summary: {
        totalUnits,
        totalRevenue: this.round(totalRevenue),
        totalOrders: orders.length,
        activeProducts: productRows.length,
        averageGrowthRate: this.round(averageGrowthRate, 1),
      },
      topProducts: productRows.slice(0, Math.max(1, Number(limit) || 10)),
    };
  }

  async getDepletionForecast(
    productId: string,
    query?: GetDepletionForecastQueryDto,
  ): Promise<DepletionForecastDto> {
    const product = await this.productModel.findById(productId).exec();
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const requestedRange = this.buildForecastDateRange(
      query?.startDate,
      query?.endDate,
    );
    const missingFields = this.getDepletionMissingFields(product);
    const dailySales = await this.getDailySalesTimeline(product.id, requestedRange);
    const totalSalesUnits = dailySales.reduce((sum, item) => sum + item.units, 0);
    const fallbackDate = requestedRange?.start ?? product.createdAt ?? new Date();
    const analysisStartDate = requestedRange?.start ?? dailySales[0]?.date ?? fallbackDate;
    const analysisEndDate =
      requestedRange?.end ?? dailySales[dailySales.length - 1]?.date ?? analysisStartDate;
    const observedDays = Math.max(
      1,
      this.diffDaysElapsed(analysisStartDate, analysisEndDate),
    );
    const averageDailyUnitsRaw =
      totalSalesUnits > 0 ? totalSalesUnits / observedDays : 0;
    const averageDailyUnits = this.round(averageDailyUnitsRaw, 2);

    const actualPointsBase: DepletionChartPointDto[] = [];

    if (missingFields.length > 0) {
      actualPointsBase.push({
        date: analysisStartDate.toISOString(),
        label: this.formatForecastDate(analysisStartDate),
        stockMl: this.round(product.rawMaterialInitialStockMl ?? 0),
        units: 0,
        kind: 'actual',
      });

      if (analysisEndDate.getTime() !== analysisStartDate.getTime()) {
        actualPointsBase.push({
          date: analysisEndDate.toISOString(),
          label: this.formatForecastDate(analysisEndDate),
          stockMl: this.round(product.rawMaterialInitialStockMl ?? 0),
          units: 0,
          kind: 'current',
        });
      }

      return {
        product: {
          id: product.id,
          name: product.name,
          category: product.category,
          image: product.image,
          presentation: product.presentation,
        },
        configuration: {
          rawMaterialName: product.rawMaterialName,
          initialStockMl: product.rawMaterialInitialStockMl,
          consumptionPerBatchMl: product.rawMaterialConsumptionPerBatchMl,
          batchYieldUnits: product.rawMaterialBatchYieldUnits,
          criticalUnits: product.stockMin ?? 0,
        },
        analysis: {
          model: 'exponential',
          startDate: analysisStartDate.toISOString(),
          endDate: analysisEndDate.toISOString(),
          observedDays,
          totalSalesUnits,
          accumulatedConsumptionMl: 0,
          averageDailyUnits,
          projectedDailyUnits: 0,
          projectedDailyConsumptionMl: 0,
          exponentialRateK: 0,
          growthRate: 0,
          trend: 'stable',
        },
        forecast: {
          status: 'not_configured',
        },
        chart: {
          initialStockMl: product.rawMaterialInitialStockMl,
          criticalLevelMl: undefined,
          actualPoints: actualPointsBase,
          projectedPoint: null,
        },
        missingFields,
      };
    }

    const consumptionPerPieceMlRaw =
      (product.rawMaterialConsumptionPerBatchMl ?? 0) /
      (product.rawMaterialBatchYieldUnits ?? 1);
    const consumptionPerPieceMl = this.round(consumptionPerPieceMlRaw, 4);
    const accumulatedConsumptionMlRaw = totalSalesUnits * consumptionPerPieceMlRaw;
    const accumulatedConsumptionMl = this.round(accumulatedConsumptionMlRaw);
    const estimatedCurrentStockMlRaw = Math.max(
      0,
      (product.rawMaterialInitialStockMl ?? 0) - accumulatedConsumptionMlRaw,
    );
    const estimatedCurrentStockMl = this.round(estimatedCurrentStockMlRaw);
    const criticalLevelMlRaw = (product.stockMin ?? 0) * consumptionPerPieceMlRaw;
    const criticalLevelMl = this.round(criticalLevelMlRaw);
    const trendMetrics = this.calculateTrendFromDailySales(dailySales);
    const projectedDailyUnitsRaw = averageDailyUnitsRaw;
    const projectedDailyUnits = this.round(projectedDailyUnitsRaw, 2);
    const projectedDailyConsumptionMlRaw =
      projectedDailyUnitsRaw * consumptionPerPieceMlRaw;
    const projectedDailyConsumptionMl = this.round(
      projectedDailyConsumptionMlRaw,
      3,
    );
    const exponentialRateKRaw =
      estimatedCurrentStockMlRaw > 0 && (product.rawMaterialInitialStockMl ?? 0) > 0
        ? Math.log(
            estimatedCurrentStockMlRaw / (product.rawMaterialInitialStockMl ?? 1),
          ) / observedDays
        : 0;
    const exponentialRateK = this.round(exponentialRateKRaw, 6);
    const remainingUntilCriticalMlRaw = Math.max(
      0,
      estimatedCurrentStockMlRaw - criticalLevelMlRaw,
    );
    const remainingUntilCriticalMl = this.round(remainingUntilCriticalMlRaw);
    const totalEstimatedDaysToCriticalRaw =
      exponentialRateKRaw < 0 &&
      criticalLevelMlRaw > 0 &&
      (product.rawMaterialInitialStockMl ?? 0) > criticalLevelMlRaw
        ? Math.log(
            criticalLevelMlRaw / (product.rawMaterialInitialStockMl ?? 1),
          ) / exponentialRateKRaw
        : null;
    const estimatedDaysToCritical =
      totalEstimatedDaysToCriticalRaw !== null
        ? this.round(totalEstimatedDaysToCriticalRaw, 1)
        : null;
    const remainingDaysToCriticalRaw =
      totalEstimatedDaysToCriticalRaw !== null
        ? Math.max(0, totalEstimatedDaysToCriticalRaw - observedDays)
        : null;
    const remainingDaysToCritical =
      remainingDaysToCriticalRaw !== null
        ? this.round(remainingDaysToCriticalRaw, 1)
        : null;
    const estimatedCriticalDate =
      totalEstimatedDaysToCriticalRaw !== null
        ? this.addDays(
            analysisStartDate,
            totalEstimatedDaysToCriticalRaw,
          ).toISOString()
        : null;

    let runningStockMl = this.round(product.rawMaterialInitialStockMl ?? 0);
    const actualPoints: DepletionChartPointDto[] = [
      {
        date: analysisStartDate.toISOString(),
        label: this.formatForecastDate(analysisStartDate),
        stockMl: runningStockMl,
        units: 0,
        kind: 'actual',
      },
    ];

    for (const point of dailySales) {
      runningStockMl = this.round(
        Math.max(0, runningStockMl - point.units * consumptionPerPieceMl),
      );
      actualPoints.push({
        date: point.date.toISOString(),
        label: this.formatForecastDate(point.date),
        stockMl: runningStockMl,
        units: point.units,
        kind: 'actual',
      });
    }

    if (actualPoints[actualPoints.length - 1]?.date !== analysisEndDate.toISOString()) {
      actualPoints.push({
        date: analysisEndDate.toISOString(),
        label: this.formatForecastDate(analysisEndDate),
        stockMl: estimatedCurrentStockMl,
        units: 0,
        kind: 'current',
      });
    }

    const status = this.resolveForecastStatus({
      missingFields,
      totalSalesUnits,
      estimatedCurrentStockMl,
      criticalLevelMl,
      remainingDaysToCritical,
    });

    return {
      product: {
        id: product.id,
        name: product.name,
        category: product.category,
        image: product.image,
        presentation: product.presentation,
      },
      configuration: {
        rawMaterialName: product.rawMaterialName,
        initialStockMl: this.round(product.rawMaterialInitialStockMl ?? 0),
        consumptionPerBatchMl: this.round(
          product.rawMaterialConsumptionPerBatchMl ?? 0,
        ),
        batchYieldUnits: product.rawMaterialBatchYieldUnits ?? 0,
        criticalUnits: product.stockMin ?? 0,
        consumptionPerPieceMl,
      },
      analysis: {
        model: 'exponential',
        startDate: analysisStartDate.toISOString(),
        endDate: analysisEndDate.toISOString(),
        observedDays,
        totalSalesUnits,
        accumulatedConsumptionMl,
        averageDailyUnits,
        projectedDailyUnits,
        projectedDailyConsumptionMl,
        exponentialRateK,
        growthRate: this.round(trendMetrics.growthRate, 1),
        trend: trendMetrics.trend,
      },
      forecast: {
        estimatedCurrentStockMl,
        criticalLevelMl,
        remainingUntilCriticalMl,
        estimatedDaysToCritical,
        remainingDaysToCritical,
        estimatedCriticalDate,
        status,
      },
      chart: {
        initialStockMl: this.round(product.rawMaterialInitialStockMl ?? 0),
        criticalLevelMl,
        actualPoints,
        projectedPoint:
          estimatedDaysToCritical !== null
            ? {
                date: estimatedCriticalDate ?? analysisEndDate.toISOString(),
                label: estimatedCriticalDate
                  ? this.formatForecastDate(new Date(estimatedCriticalDate))
                  : this.formatForecastDate(analysisEndDate),
                stockMl: criticalLevelMl,
                units: 0,
                kind: 'projection',
              }
            : null,
      },
      missingFields: [],
    };
  }

  private getDepletionMissingFields(product: ProductDocument): string[] {
    const missing: string[] = [];

    if (!product.rawMaterialName?.trim()) {
      missing.push('Materia prima principal');
    }

    if (
      !Number.isFinite(product.rawMaterialInitialStockMl) ||
      (product.rawMaterialInitialStockMl ?? 0) <= 0
    ) {
      missing.push('Stock inicial');
    }

    if (
      !Number.isFinite(product.rawMaterialConsumptionPerBatchMl) ||
      (product.rawMaterialConsumptionPerBatchMl ?? 0) <= 0
    ) {
      missing.push('Consumo por lote');
    }

    if (
      !Number.isFinite(product.rawMaterialBatchYieldUnits) ||
      (product.rawMaterialBatchYieldUnits ?? 0) <= 0
    ) {
      missing.push('Rendimiento por lote');
    }

    if (!Number.isFinite(product.stockMin) || (product.stockMin ?? 0) <= 0) {
      missing.push('Nivel critico en piezas');
    }

    return missing;
  }

  private async getDailySalesTimeline(
    productId: string,
    dateRange?: DateRange,
  ): Promise<DailySalesPoint[]> {
    const periodRange =
      dateRange !== undefined
        ? { periodStart: { $gte: dateRange.start, $lte: dateRange.end } }
        : {};
    const aggregateTimeline = await this.salesAggregateModel
      .find({
        productId,
        periodType: SalesPeriodType.DAILY,
        isActive: true,
        ...periodRange,
      })
      .sort({ periodStart: 1 })
      .select('periodStart totalUnits totalRevenue totalOrders')
      .exec();

    if (aggregateTimeline.length > 0) {
      return aggregateTimeline.map((item) => ({
        date: item.periodStart,
        units: item.totalUnits,
        revenue: this.round(item.totalRevenue),
        orders: item.totalOrders,
      }));
    }

    const orders = await this.orderModel
      .find({
        status: OrderStatus.COMPLETED,
        'items.productId': productId,
        ...(dateRange
          ? {
              $or: [
                {
                  completedAt: { $gte: dateRange.start, $lte: dateRange.end },
                },
                {
                  completedAt: null,
                  createdAt: { $gte: dateRange.start, $lte: dateRange.end },
                },
              ],
            }
          : {}),
      })
      .sort({ completedAt: 1, createdAt: 1 })
      .exec();

    const grouped = this.groupProductOrdersByPeriod(
      orders,
      productId,
      SalesPeriodType.DAILY,
    );

    return Array.from(grouped.values())
      .sort(
        (left, right) =>
          left.periodStart.getTime() - right.periodStart.getTime(),
      )
      .map((item) => ({
        date: item.periodStart,
        units: item.units,
        revenue: this.round(item.revenue),
        orders: item.orderIds.size,
      }));
  }

  private calculateTrendFromDailySales(dailySales: DailySalesPoint[]): {
    growthRate: number;
    deltaPerDay: number;
    trend: ForecastTrend;
  } {
    if (dailySales.length === 0) {
      return {
        growthRate: 0,
        deltaPerDay: 0,
        trend: 'stable',
      };
    }

    const totalDays = Math.max(
      1,
      this.diffDaysInclusive(
        dailySales[0].date,
        dailySales[dailySales.length - 1].date,
      ),
    );
    const splitIndex = Math.max(1, Math.ceil(totalDays / 2));
    const midpoint = this.addDays(dailySales[0].date, splitIndex - 1);

    let previousUnits = 0;
    let recentUnits = 0;

    for (const item of dailySales) {
      if (item.date.getTime() <= midpoint.getTime()) {
        previousUnits += item.units;
      } else {
        recentUnits += item.units;
      }
    }

    const previousDays = Math.max(1, splitIndex);
    const recentDays = Math.max(1, totalDays - previousDays);
    const previousPerDay = previousUnits / previousDays;
    const recentPerDay =
      totalDays === previousDays ? previousPerDay : recentUnits / recentDays;
    const deltaPerDay = recentPerDay - previousPerDay;

    let growthRate = 0;
    if (previousPerDay > 0) {
      growthRate = ((recentPerDay - previousPerDay) / previousPerDay) * 100;
    } else if (recentPerDay > 0) {
      growthRate = 100;
    }

    const trend: ForecastTrend =
      deltaPerDay > 0.08 ? 'growth' : deltaPerDay < -0.08 ? 'decline' : 'stable';

    return {
      growthRate,
      deltaPerDay,
      trend,
    };
  }

  private resolveForecastStatus(input: {
    missingFields: string[];
    totalSalesUnits: number;
    estimatedCurrentStockMl: number;
    criticalLevelMl: number;
    remainingDaysToCritical: number | null;
  }): ForecastStatus {
    if (input.missingFields.length > 0) {
      return 'not_configured';
    }

    if (input.totalSalesUnits <= 0) {
      return 'no_sales';
    }

    if (input.estimatedCurrentStockMl <= input.criticalLevelMl) {
      return 'critical';
    }

    if (
      input.remainingDaysToCritical !== null &&
      input.remainingDaysToCritical <= 45
    ) {
      return 'warning';
    }

    return 'ready';
  }

  private async getSalesHistoryFromAggregates(
    dto: GetSalesHistoryDto,
  ): Promise<SalesDataPointDto[]> {
    const { productId, periodType, startDate, endDate, year, month } = dto;
    const dateRange = this.buildDateRange(
      periodType,
      startDate,
      endDate,
      year,
      month,
    );
    const aggregates = await this.salesAggregateModel
      .find({
        productId,
        periodType,
        periodStart: { $gte: dateRange.start, $lte: dateRange.end },
        isActive: true,
      })
      .sort({ periodStart: 1 })
      .exec();

    return aggregates.map((aggregate) => ({
      period: this.formatPeriodLabel(aggregate.periodStart, periodType),
      units: aggregate.totalUnits,
      revenue: this.round(aggregate.totalRevenue),
      orders: aggregate.totalOrders,
      averageOrderValue: this.round(aggregate.averageOrderValue),
    }));
  }

  private async getSalesOverviewFromAggregates(
    periodType: SalesPeriodType,
    dateRange: DateRange,
    limit: number,
  ): Promise<any | null> {
    const aggregates = await this.salesAggregateModel
      .find({
        periodType,
        periodStart: { $gte: dateRange.start, $lte: dateRange.end },
        isActive: true,
      })
      .exec();

    if (aggregates.length === 0) {
      return null;
    }

    const productsById = new Map<
      string,
      ProductSalesBucket & { growth: number }
    >();
    const orderIds = new Set<string>();

    for (const aggregate of aggregates) {
      const product = productsById.get(aggregate.productId) ?? {
        id: aggregate.productId,
        name: aggregate.productName,
        category: aggregate.category,
        totalSales: 0,
        revenue: 0,
        orderIds: new Set<string>(),
        growth: 0,
      };

      product.totalSales += aggregate.totalUnits;
      product.revenue += aggregate.totalRevenue;
      product.growth += aggregate.growthRate;

      for (const orderId of aggregate.orderIds ?? []) {
        product.orderIds.add(orderId);
        orderIds.add(orderId);
      }

      productsById.set(aggregate.productId, product);
    }

    const productRows = Array.from(productsById.values())
      .map((product) => ({
        id: product.id,
        name: product.name,
        category: product.category,
        totalSales: product.totalSales,
        revenue: this.round(product.revenue),
        orders: product.orderIds.size,
        growth: this.round(product.growth, 1),
      }))
      .sort((left, right) => right.revenue - left.revenue);

    const totalUnits = productRows.reduce(
      (sum, product) => sum + product.totalSales,
      0,
    );
    const totalRevenue = productRows.reduce(
      (sum, product) => sum + product.revenue,
      0,
    );
    const averageGrowthRate =
      productRows.length > 0
        ? productRows.reduce((sum, product) => sum + product.growth, 0) /
          productRows.length
        : 0;

    return {
      summary: {
        totalUnits,
        totalRevenue: this.round(totalRevenue),
        totalOrders: orderIds.size,
        activeProducts: productRows.length,
        averageGrowthRate: this.round(averageGrowthRate, 1),
      },
      topProducts: productRows.slice(0, limit),
    };
  }

  private async calculateSalesFromOrders(
    dto: GetSalesHistoryDto,
  ): Promise<SalesDataPointDto[]> {
    const { productId, periodType, startDate, endDate, year, month } = dto;
    const dateRange = this.buildDateRange(
      periodType,
      startDate,
      endDate,
      year,
      month,
    );
    const orders = await this.findCompletedOrdersInRange(dateRange, productId);
    const groupedData = this.groupProductOrdersByPeriod(
      orders,
      productId,
      periodType,
    );

    return Array.from(groupedData.values())
      .sort(
        (left, right) =>
          left.periodStart.getTime() - right.periodStart.getTime(),
      )
      .map((data) => ({
        period: this.formatPeriodLabel(data.periodStart, periodType),
        units: data.units,
        revenue: this.round(data.revenue),
        orders: data.orderIds.size,
        averageOrderValue:
          data.orderIds.size > 0
            ? this.round(data.revenue / data.orderIds.size)
            : 0,
      }));
  }

  private buildRecordedProductSales(
    order: OrderDocument,
    salesDate: Date,
  ): Map<string, RecordedProductSale> {
    const productSales = new Map<string, RecordedProductSale>();
    const orderId = order.id;
    const periodTypes = [
      SalesPeriodType.DAILY,
      SalesPeriodType.WEEKLY,
      SalesPeriodType.MONTHLY,
    ];

    for (const item of order.items) {
      for (const periodType of periodTypes) {
        const periodStart = this.getPeriodStart(salesDate, periodType);
        const periodEnd = this.getPeriodEnd(periodStart, periodType);
        const key = `${item.productId}:${periodType}:${periodStart.toISOString()}`;
        const sale = productSales.get(key) ?? {
          productId: item.productId,
          productName: item.productName,
          productSlug: item.productSlug,
          category: item.category,
          periodType,
          periodStart,
          periodEnd,
          units: 0,
          revenue: 0,
          orderId,
        };

        sale.units += this.getFulfilledItemUnits(item);
        sale.revenue += this.getItemRevenue(item);
        productSales.set(key, sale);
      }
    }

    return productSales;
  }

  private async upsertRecordedProductSale(
    sale: RecordedProductSale,
  ): Promise<void> {
    let aggregate = await this.salesAggregateModel
      .findOne({
        productId: sale.productId,
        periodType: sale.periodType,
        periodStart: sale.periodStart,
      })
      .exec();

    if (!aggregate) {
      aggregate = new this.salesAggregateModel({
        productId: sale.productId,
        productName: sale.productName,
        productSlug: sale.productSlug,
        category: sale.category,
        periodType: sale.periodType,
        periodStart: sale.periodStart,
        periodEnd: sale.periodEnd,
        totalUnits: 0,
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        averageUnitsPerOrder: 0,
        growthRate: 0,
        lastCalculatedAt: new Date(),
        isActive: true,
        orderIds: [],
      });
    }

    if (aggregate.orderIds?.includes(sale.orderId)) {
      return;
    }

    aggregate.productName = sale.productName;
    aggregate.productSlug = sale.productSlug;
    aggregate.category = sale.category;
    aggregate.periodEnd = sale.periodEnd;
    aggregate.totalUnits += sale.units;
    aggregate.totalRevenue = this.round(aggregate.totalRevenue + sale.revenue);
    aggregate.totalOrders += 1;
    aggregate.averageOrderValue =
      aggregate.totalOrders > 0
        ? this.round(aggregate.totalRevenue / aggregate.totalOrders)
        : 0;
    aggregate.averageUnitsPerOrder =
      aggregate.totalOrders > 0
        ? this.round(aggregate.totalUnits / aggregate.totalOrders, 1)
        : 0;
    aggregate.lastCalculatedAt = new Date();
    aggregate.isActive = true;
    aggregate.orderIds = [...(aggregate.orderIds ?? []), sale.orderId];

    await aggregate.save();
  }

  private async findCompletedOrdersInRange(
    dateRange: DateRange,
    productId?: string,
  ): Promise<OrderDocument[]> {
    const productFilter = productId ? { 'items.productId': productId } : {};

    return this.orderModel
      .find({
        ...productFilter,
        status: OrderStatus.COMPLETED,
        $or: [
          { completedAt: { $gte: dateRange.start, $lte: dateRange.end } },
          {
            completedAt: { $exists: false },
            createdAt: { $gte: dateRange.start, $lte: dateRange.end },
          },
          {
            completedAt: null,
            createdAt: { $gte: dateRange.start, $lte: dateRange.end },
          },
        ],
      })
      .exec();
  }

  private groupProductOrdersByPeriod(
    orders: OrderDocument[],
    productId: string,
    periodType: SalesPeriodType,
  ): Map<string, SalesBucket> {
    const grouped = new Map<string, SalesBucket>();

    for (const order of orders) {
      const salesDate = this.getOrderSalesDate(order);
      const periodStart = this.getPeriodStart(salesDate, periodType);
      const periodKey = periodStart.toISOString();
      const productItems = order.items.filter(
        (item) => item.productId === productId,
      );

      if (productItems.length === 0) {
        continue;
      }

      const bucket = grouped.get(periodKey) ?? {
        periodStart,
        units: 0,
        revenue: 0,
        orderIds: new Set<string>(),
      };

      for (const item of productItems) {
        bucket.units += this.getFulfilledItemUnits(item);
        bucket.revenue += this.getItemRevenue(item);
      }
      bucket.orderIds.add(order.id);
      grouped.set(periodKey, bucket);
    }

    return grouped;
  }

  private buildProductSalesMap(
    orders: OrderDocument[],
  ): Map<string, ProductSalesBucket> {
    const productsById = new Map<string, ProductSalesBucket>();

    for (const order of orders) {
      for (const item of order.items) {
        const product = productsById.get(item.productId) ?? {
          id: item.productId,
          name: item.productName,
          category: item.category,
          totalSales: 0,
          revenue: 0,
          orderIds: new Set<string>(),
        };

        product.totalSales += this.getFulfilledItemUnits(item);
        product.revenue += this.getItemRevenue(item);
        product.orderIds.add(order.id);
        productsById.set(item.productId, product);
      }
    }

    return productsById;
  }

  private async calculateProductGrowthRate(
    productId: string,
    dateRange: DateRange,
  ): Promise<number> {
    const previousRange = this.getPreviousDateRange(dateRange);
    const [currentOrders, previousOrders] = await Promise.all([
      this.findCompletedOrdersInRange(dateRange, productId),
      this.findCompletedOrdersInRange(previousRange, productId),
    ]);
    const currentUnits = this.sumProductUnits(currentOrders, productId);
    const previousUnits = this.sumProductUnits(previousOrders, productId);

    return this.calculateGrowth(currentUnits, previousUnits);
  }

  private sumProductUnits(orders: OrderDocument[], productId: string): number {
    return orders.reduce(
      (total, order) =>
        total +
        order.items
          .filter((item) => item.productId === productId)
          .reduce((sum, item) => sum + this.getFulfilledItemUnits(item), 0),
      0,
    );
  }

  private calculateGrowth(current: number, previous: number): number {
    if (previous <= 0) {
      return 0;
    }

    return ((current - previous) / previous) * 100;
  }

  private getPreviousDateRange(dateRange: DateRange): DateRange {
    const durationMs = dateRange.end.getTime() - dateRange.start.getTime();
    const previousEnd = new Date(dateRange.start.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - durationMs);

    return {
      start: previousStart,
      end: previousEnd,
    };
  }

  private getOrderSalesDate(order: OrderDocument): Date {
    return order.completedAt ?? order.createdAt ?? new Date();
  }

  private getOrderRevenue(order: OrderDocument): number {
    if (Number.isFinite(order.subtotal)) {
      return order.subtotal;
    }

    return order.items.reduce(
      (sum, item) => sum + this.getItemRevenue(item),
      0,
    );
  }

  private getItemRevenue(item: OrderItemSnapshot): number {
    const fulfilledUnits = this.getFulfilledItemUnits(item);
    if (fulfilledUnits <= 0) {
      return 0;
    }

    if (
      Number.isFinite(item.subtotal) &&
      (!Number.isFinite(item.backorderQuantity) || item.backorderQuantity <= 0)
    ) {
      return item.subtotal;
    }

    return fulfilledUnits * item.unitPrice;
  }

  private getFulfilledItemUnits(item: OrderItemSnapshot): number {
    const confirmedQuantity = Number.isFinite(item.quantity)
      ? Math.max(0, item.quantity)
      : 0;
    const pendingBackorder = Number.isFinite(item.backorderQuantity)
      ? Math.max(0, item.backorderQuantity)
      : 0;

    return Math.max(0, confirmedQuantity - pendingBackorder);
  }

  private getPeriodStart(date: Date, periodType: SalesPeriodType): Date {
    const periodStart = new Date(date);
    periodStart.setHours(0, 0, 0, 0);

    switch (periodType) {
      case SalesPeriodType.DAILY:
        return periodStart;
      case SalesPeriodType.WEEKLY: {
        const mondayOffset = (periodStart.getDay() + 6) % 7;
        periodStart.setDate(periodStart.getDate() - mondayOffset);
        return periodStart;
      }
      case SalesPeriodType.MONTHLY:
      default:
        return new Date(periodStart.getFullYear(), periodStart.getMonth(), 1);
    }
  }

  private getPeriodEnd(periodStart: Date, periodType: SalesPeriodType): Date {
    const periodEnd = new Date(periodStart);

    switch (periodType) {
      case SalesPeriodType.DAILY:
        periodEnd.setHours(23, 59, 59, 999);
        return periodEnd;
      case SalesPeriodType.WEEKLY:
        periodEnd.setDate(periodStart.getDate() + 6);
        periodEnd.setHours(23, 59, 59, 999);
        return periodEnd;
      case SalesPeriodType.MONTHLY:
      default:
        return new Date(
          periodStart.getFullYear(),
          periodStart.getMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        );
    }
  }

  private formatPeriodLabel(date: Date, periodType: SalesPeriodType): string {
    switch (periodType) {
      case SalesPeriodType.DAILY:
        return date.toLocaleDateString('es-MX', {
          day: '2-digit',
          month: 'short',
        });
      case SalesPeriodType.WEEKLY: {
        const weekEnd = new Date(date);
        weekEnd.setDate(date.getDate() + 6);
        return `${date.toLocaleDateString('es-MX', {
          day: '2-digit',
          month: 'short',
        })} - ${weekEnd.toLocaleDateString('es-MX', {
          day: '2-digit',
          month: 'short',
        })}`;
      }
      case SalesPeriodType.MONTHLY:
      default:
        return date.toLocaleDateString('es-MX', {
          month: 'short',
          year: 'numeric',
        });
    }
  }

  private buildDateRange(
    periodType: SalesPeriodType,
    startDate?: string,
    endDate?: string,
    year?: number,
    month?: number,
  ): DateRange {
    const now = new Date();

    if (startDate && endDate) {
      return {
        start: new Date(startDate),
        end: new Date(endDate),
      };
    }

    if (year && month) {
      return {
        start: new Date(year, month - 1, 1),
        end: new Date(year, month, 0, 23, 59, 59, 999),
      };
    }

    if (year) {
      return {
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31, 23, 59, 59, 999),
      };
    }

    switch (periodType) {
      case SalesPeriodType.DAILY:
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0,
            23,
            59,
            59,
            999,
          ),
        };
      case SalesPeriodType.WEEKLY: {
        const start = new Date(now);
        start.setDate(now.getDate() - 12 * 7);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);

        return { start, end };
      }
      case SalesPeriodType.MONTHLY:
      default:
        return {
          start: new Date(now.getFullYear(), now.getMonth() - 11, 1),
          end: new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0,
            23,
            59,
            59,
            999,
          ),
        };
    }
  }

  private getDaysInPeriod(
    periodType: SalesPeriodType,
    start: Date,
    end: Date,
  ): number {
    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.max(1, Math.floor(diffTime / millisecondsPerDay) + 1);

    switch (periodType) {
      case SalesPeriodType.WEEKLY:
        return Math.ceil(diffDays / 7) * 7;
      case SalesPeriodType.DAILY:
      case SalesPeriodType.MONTHLY:
      default:
        return diffDays;
    }
  }

  private diffDaysInclusive(start: Date, end: Date): number {
    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.max(1, Math.floor(diffTime / millisecondsPerDay) + 1);
  }

  private diffDaysElapsed(start: Date, end: Date): number {
    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.max(1, Math.floor(diffTime / millisecondsPerDay));
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 1000 * 60 * 60 * 24);
  }

  private buildForecastDateRange(
    startDate?: string,
    endDate?: string,
  ): DateRange | undefined {
    const start = startDate
      ? this.parseForecastBoundaryDate(startDate, false)
      : undefined;
    const end = endDate ? this.parseForecastBoundaryDate(endDate, true) : undefined;

    if (!start && !end) {
      return undefined;
    }

    if (start && end && start.getTime() > end.getTime()) {
      throw new BadRequestException(
        'La fecha inicial no puede ser mayor a la fecha final.',
      );
    }

    return {
      start: start ?? this.parseForecastBoundaryDate(endDate!, false),
      end: end ?? this.parseForecastBoundaryDate(startDate!, true),
    };
  }

  private parseForecastBoundaryDate(value: string, endOfDay: boolean): Date {
    const [yearRaw, monthRaw, dayRaw] = value.split('-');
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    const day = Number(dayRaw);

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      throw new BadRequestException('El rango de fechas no es valido.');
    }

    return endOfDay
      ? new Date(year, month - 1, day, 23, 59, 59, 999)
      : new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  private formatForecastDate(date: Date): string {
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private round(value: number, decimals = 2): number {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }
}
