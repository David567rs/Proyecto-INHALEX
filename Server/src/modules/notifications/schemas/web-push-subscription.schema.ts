import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WebPushSubscriptionDocument = HydratedDocument<WebPushSubscription>;

@Schema({
  timestamps: true,
  versionKey: false,
  collection: 'suscripciones_web_push',
})
export class WebPushSubscription {
  @Prop({ required: true, maxlength: 64, index: true })
  userId: string;

  @Prop({ required: true, maxlength: 64 })
  endpointHash: string;

  @Prop({ required: true, maxlength: 2048 })
  endpoint: string;

  @Prop({ required: true, maxlength: 87 })
  p256dh: string;

  @Prop({ required: true, maxlength: 22 })
  auth: string;

  @Prop({ required: true, type: Date })
  expiresAt: Date;
}

export const WebPushSubscriptionSchema =
  SchemaFactory.createForClass(WebPushSubscription);
WebPushSubscriptionSchema.index({ endpointHash: 1 }, { unique: true });
WebPushSubscriptionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
