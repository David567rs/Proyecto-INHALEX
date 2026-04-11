import { Injectable } from '@nestjs/common';
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
  SalesAggregateDocument,
  SalesPeriodType,
} from './schemas/sales-aggregate.schema';
import { OrderStatus } from '../orders/enums/order-status.enum';
import {
  Order,
  OrderDocument,
  OrderItemSnapshot,
} from '../orders/schemas/order.schema';

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

@Injectable()
export class SalesService {
  constructor(
    @InjectModel('SalesAggregate')
    private salesAggregateModel: Model<SalesAggregateDocument>,
    @InjectModel(Order.name)
    private orderModel: Model<OrderDocument>,
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

        sale.units += item.quantity;
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
        bucket.units += item.quantity;
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

        product.totalSales += item.quantity;
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
          .reduce((sum, item) => sum + item.quantity, 0),
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
    if (Number.isFinite(item.subtotal)) {
      return item.subtotal;
    }

    return item.quantity * item.unitPrice;
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

  private round(value: number, decimals = 2): number {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }
}
