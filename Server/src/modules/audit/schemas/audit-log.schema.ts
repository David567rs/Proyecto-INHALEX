import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';

export type AuditLogDocument = HydratedDocument<AuditLogEntity>;

@Schema({
  timestamps: true,
  versionKey: false,
  collection: 'auditoria_acciones',
})
export class AuditLogEntity {
  @Prop({ trim: true, index: true })
  actorUserId?: string;

  @Prop({ trim: true, lowercase: true, index: true })
  actorEmail?: string;

  @Prop({ trim: true, index: true })
  actorRole?: string;

  @Prop({ required: true, trim: true, uppercase: true, index: true })
  method: string;

  @Prop({ required: true, trim: true, lowercase: true, index: true })
  action: string;

  @Prop({ required: true, trim: true, lowercase: true, index: true })
  collection: string;

  @Prop({ required: true, trim: true })
  route: string;

  @Prop({ trim: true })
  resourceId?: string;

  @Prop({ required: true, index: true })
  statusCode: number;

  @Prop({ required: true, index: true })
  success: boolean;

  @Prop({ trim: true, maxlength: 1000 })
  errorMessage?: string;

  @Prop({ min: 0 })
  responseTimeMs?: number;

  @Prop({ trim: true, maxlength: 120 })
  ip?: string;

  @Prop({ trim: true, maxlength: 500 })
  userAgent?: string;

  @Prop({ type: SchemaTypes.Mixed })
  requestQuery?: Record<string, unknown>;

  @Prop({ type: SchemaTypes.Mixed })
  requestBody?: Record<string, unknown>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLogEntity);

AuditLogSchema.index({ createdAt: -1, collection: 1 });
AuditLogSchema.index({ actorEmail: 1, createdAt: -1 });

