import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'email_verification_rate_limits', versionKey: false })
export class EmailVerificationRateLimitBucket {
  @Prop({ type: String, required: true })
  _id: string;

  @Prop({ required: true })
  count: number;

  @Prop({ required: true })
  expiresAt: Date;
}

export const EmailVerificationRateLimitBucketSchema =
  SchemaFactory.createForClass(EmailVerificationRateLimitBucket);

EmailVerificationRateLimitBucketSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 },
);
