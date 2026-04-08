import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { OrderStatus } from '../enums/order-status.enum';

export type OrderDocument = HydratedDocument<Order>;

export enum OrderItemFulfillment {
  AVAILABLE = 'available',
  ADJUSTED = 'adjusted',
  BACKORDER = 'backorder',
  MANUAL = 'manual',
}

export enum OrderIssueSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
}

@Schema({ _id: false, versionKey: false })
export class OrderItemSnapshot {
  @Prop({ required: true })
  productId: string;

  @Prop({ required: true, trim: true })
  productName: string;

  @Prop({ required: true, trim: true, lowercase: true })
  productSlug: string;

  @Prop({ required: true, trim: true })
  image: string;

  @Prop({ required: true, trim: true, lowercase: true })
  category: string;

  @Prop({ required: true, trim: true })
  presentation: string;

  @Prop({ required: true, trim: true })
  origin: string;

  @Prop({ required: true, min: 0 })
  unitPrice: number;

  @Prop({ required: true, trim: true, uppercase: true, default: 'MXN' })
  currency: string;

  @Prop({ required: true, min: 1 })
  requestedQuantity: number;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  subtotal: number;

  @Prop({ required: true, enum: OrderItemFulfillment })
  fulfillment: OrderItemFulfillment;

  @Prop({ type: Number, default: null })
  stockAvailable?: number | null;

  @Prop({ required: true, min: 0, default: 0 })
  reservedQuantity: number;

  @Prop({ required: true, min: 0, default: 0 })
  backorderQuantity: number;

  @Prop({ required: true, default: false })
  inventoryTracked: boolean;

  @Prop({ required: true, default: false })
  allowBackorder: boolean;

  @Prop({ trim: true })
  message?: string;
}

export const OrderItemSnapshotSchema =
  SchemaFactory.createForClass(OrderItemSnapshot);

@Schema({ _id: false, versionKey: false })
export class OrderIssueSnapshot {
  @Prop({ required: true, trim: true })
  code: string;

  @Prop({ required: true, enum: OrderIssueSeverity })
  severity: OrderIssueSeverity;

  @Prop({ trim: true })
  productId?: string;

  @Prop({ trim: true })
  productName?: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  description: string;
}

export const OrderIssueSnapshotSchema =
  SchemaFactory.createForClass(OrderIssueSnapshot);

@Schema({ _id: false, versionKey: false })
export class OrderCustomerSnapshot {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true, lowercase: true })
  email: string;

  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ trim: true })
  notes?: string;
}

export const OrderCustomerSnapshotSchema =
  SchemaFactory.createForClass(OrderCustomerSnapshot);

@Schema({ _id: false, versionKey: false })
export class OrderStatusNoteSnapshot {
  @Prop({ required: true, enum: OrderStatus })
  status: OrderStatus;

  @Prop({ required: true, trim: true, maxlength: 500 })
  note: string;

  @Prop({ trim: true, maxlength: 64 })
  actorId?: string;

  @Prop({ trim: true, lowercase: true, maxlength: 180 })
  actorEmail?: string;

  @Prop({ required: true })
  createdAt: Date;
}

export const OrderStatusNoteSnapshotSchema =
  SchemaFactory.createForClass(OrderStatusNoteSnapshot);

@Schema({ timestamps: true, versionKey: false, collection: 'pedidos' })
export class Order {
  @Prop({ required: true, unique: true, trim: true, index: true })
  reference: string;

  @Prop({ required: true, enum: OrderStatus, default: OrderStatus.DRAFT, index: true })
  status: OrderStatus;

  @Prop({ required: true, trim: true, uppercase: true, default: 'MXN' })
  currency: string;

  @Prop({ required: true, min: 1 })
  totalItems: number;

  @Prop({ required: true, min: 0 })
  subtotal: number;

  @Prop({ type: [OrderItemSnapshotSchema], default: [] })
  items: OrderItemSnapshot[];

  @Prop({ type: [OrderIssueSnapshotSchema], default: [] })
  issues: OrderIssueSnapshot[];

  @Prop({ type: OrderCustomerSnapshotSchema, required: true })
  customer: OrderCustomerSnapshot;

  @Prop({ trim: true, maxlength: 64, index: true })
  customerUserId?: string;

  @Prop({ trim: true, lowercase: true, maxlength: 180 })
  customerUserEmail?: string;

  @Prop({ required: true, default: false })
  needsManualReview: boolean;

  @Prop({ required: true, default: 'web_public' })
  channel: string;

  @Prop({ required: true })
  lastValidatedAt: Date;

  @Prop({ type: Date })
  confirmedAt?: Date;

  @Prop({ type: Date })
  cancelledAt?: Date;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: [OrderStatusNoteSnapshotSchema], default: [] })
  statusNotes: OrderStatusNoteSnapshot[];

  createdAt?: Date;

  updatedAt?: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ 'customer.email': 1, createdAt: -1 });
