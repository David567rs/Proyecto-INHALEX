import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SalesAggregateDocument = HydratedDocument<SalesAggregate>;

export enum SalesPeriodType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

@Schema({ timestamps: true, versionKey: false, collection: 'ventas_agregadas' })
export class SalesAggregate {
  @Prop({ required: true, trim: true, index: true })
  productId: string;

  @Prop({ required: true, trim: true })
  productName: string;

  @Prop({ required: true, trim: true, lowercase: true })
  productSlug: string;

  @Prop({ required: true, trim: true, lowercase: true })
  category: string;

  @Prop({
    type: String,
    required: true,
    enum: SalesPeriodType,
    index: true,
  })
  periodType: SalesPeriodType;

  @Prop({ required: true, index: true })
  periodStart: Date;

  @Prop({ required: true, index: true })
  periodEnd: Date;

  @Prop({ required: true, min: 0, default: 0 })
  totalUnits: number;

  @Prop({ required: true, min: 0, default: 0 })
  totalRevenue: number;

  @Prop({ required: true, min: 0, default: 0 })
  totalOrders: number;

  @Prop({ required: true, min: 0, default: 0 })
  averageOrderValue: number;

  @Prop({ required: true, min: 0, default: 0 })
  averageUnitsPerOrder: number;

  @Prop({ required: true, default: 0 })
  growthRate: number;

  @Prop({ type: [String], default: [] })
  orderIds: string[];

  @Prop({ required: true, default: Date.now })
  lastCalculatedAt: Date;

  @Prop({ required: true, default: true })
  isActive: boolean;

  createdAt?: Date;

  updatedAt?: Date;
}

export const SalesAggregateSchema =
  SchemaFactory.createForClass(SalesAggregate);

// Compound indexes for efficient queries
SalesAggregateSchema.index(
  { productId: 1, periodType: 1, periodStart: -1 },
  { unique: true },
);
SalesAggregateSchema.index({ periodType: 1, periodStart: -1 });
SalesAggregateSchema.index({ category: 1, periodType: 1, periodStart: -1 });
