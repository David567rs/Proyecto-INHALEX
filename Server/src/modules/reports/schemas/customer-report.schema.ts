import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CustomerReportDocument = HydratedDocument<CustomerReport>;

export enum CustomerReportType {
  ORDER = 'order',
  PRODUCT = 'product',
  DELIVERY = 'delivery',
  ACCOUNT = 'account',
  OTHER = 'other',
}

export enum CustomerReportStatus {
  NEW = 'new',
  IN_REVIEW = 'in_review',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum CustomerReportPriority {
  NORMAL = 'normal',
  HIGH = 'high',
}

@Schema({
  timestamps: true,
  versionKey: false,
  collection: 'reportes_cliente',
})
export class CustomerReport {
  @Prop({ required: true, trim: true, maxlength: 64, index: true })
  userId: string;

  @Prop({ required: true, trim: true, lowercase: true, maxlength: 180, index: true })
  userEmail: string;

  @Prop({ required: true, trim: true, maxlength: 120 })
  userName: string;

  @Prop({ type: String, required: true, enum: CustomerReportType, index: true })
  type: CustomerReportType;

  @Prop({ required: true, trim: true, maxlength: 120 })
  title: string;

  @Prop({ required: true, trim: true, maxlength: 1000 })
  message: string;

  @Prop({ trim: true, uppercase: true, maxlength: 40, index: true })
  orderReference?: string;

  @Prop({ trim: true, maxlength: 64 })
  productId?: string;

  @Prop({
    type: String,
    enum: CustomerReportStatus,
    default: CustomerReportStatus.NEW,
    index: true,
  })
  status: CustomerReportStatus;

  @Prop({
    type: String,
    enum: CustomerReportPriority,
    default: CustomerReportPriority.NORMAL,
    index: true,
  })
  priority: CustomerReportPriority;

  @Prop({ trim: true, maxlength: 1000 })
  adminNote?: string;

  @Prop({ trim: true, maxlength: 64 })
  handledById?: string;

  @Prop({ trim: true, lowercase: true, maxlength: 180 })
  handledByEmail?: string;

  @Prop({ type: Date })
  resolvedAt?: Date;

  createdAt?: Date;

  updatedAt?: Date;
}

export const CustomerReportSchema =
  SchemaFactory.createForClass(CustomerReport);

CustomerReportSchema.index({ userId: 1, createdAt: -1 });
CustomerReportSchema.index({ status: 1, priority: 1, createdAt: -1 });
