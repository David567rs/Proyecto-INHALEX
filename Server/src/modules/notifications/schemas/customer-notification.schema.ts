import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CustomerNotificationDocument =
  HydratedDocument<CustomerNotification>;

export enum CustomerNotificationType {
  ORDER = 'order',
  REVIEW = 'review',
  PROMOTION = 'promotion',
  SYSTEM = 'system',
  REPORT = 'report',
}

export enum CustomerNotificationSeverity {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
}

@Schema({
  timestamps: true,
  versionKey: false,
  collection: 'notificaciones_cliente',
})
export class CustomerNotification {
  @Prop({ trim: true, maxlength: 64, index: true })
  userId?: string;

  @Prop({ required: true, trim: true, lowercase: true, maxlength: 180, index: true })
  userEmail: string;

  @Prop({ required: true, trim: true, maxlength: 120 })
  title: string;

  @Prop({ required: true, trim: true, maxlength: 500 })
  message: string;

  @Prop({
    type: String,
    enum: CustomerNotificationType,
    default: CustomerNotificationType.SYSTEM,
    index: true,
  })
  type: CustomerNotificationType;

  @Prop({
    type: String,
    enum: CustomerNotificationSeverity,
    default: CustomerNotificationSeverity.INFO,
  })
  severity: CustomerNotificationSeverity;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, unknown>;

  @Prop({ type: Date, default: null, index: true })
  readAt?: Date | null;

  createdAt?: Date;

  updatedAt?: Date;
}

export const CustomerNotificationSchema =
  SchemaFactory.createForClass(CustomerNotification);

CustomerNotificationSchema.index({ userId: 1, createdAt: -1 });
CustomerNotificationSchema.index({ userEmail: 1, createdAt: -1 });
