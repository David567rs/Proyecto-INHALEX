import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'registration_email_challenges', versionKey: false })
export class EmailVerificationChallenge {
  @Prop({ type: String, required: true })
  _id: string;

  @Prop({ required: true })
  challengeId: string;

  @Prop({ required: true })
  codeDigest: string;

  @Prop({ required: true })
  remainingAttempts: number;

  @Prop({ required: true })
  resendAt: Date;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ type: Date })
  codeExpiresAt?: Date;

  @Prop({ type: Date })
  sendWindowExpiresAt?: Date;

  @Prop({ type: Number })
  sendsInWindow?: number;

  @Prop({ type: Date })
  consumedAt?: Date;
}

export const EmailVerificationChallengeSchema = SchemaFactory.createForClass(
  EmailVerificationChallenge,
);
EmailVerificationChallengeSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 },
);
