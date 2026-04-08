import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BackupSettingsDocument = HydratedDocument<BackupSettings>;

export type BackupScope = 'database' | 'selectedCollections';
export type BackupStorageProvider = 'local' | 'cloudinary' | 'r2';

@Schema({
  timestamps: true,
  versionKey: false,
  collection: 'configuracion_respaldos',
})
export class BackupSettings {
  @Prop({ required: true, unique: true, default: 'default' })
  key: string;

  @Prop({ default: false })
  automaticEnabled: boolean;

  @Prop({ min: 15, max: 10080, default: 1440 })
  rpoMinutes: number;

  @Prop({ min: 5, max: 1440, default: 120 })
  rtoMinutes: number;

  @Prop({
    type: String,
    enum: ['database', 'selectedCollections'],
    default: 'database',
  })
  backupScope: BackupScope;

  @Prop({ type: [String], default: [] })
  selectedCollections: string[];

  @Prop({ type: String, enum: ['local', 'cloudinary', 'r2'], default: 'local' })
  preferredStorage: BackupStorageProvider;

  @Prop({ default: true })
  localDownloadsEnabled: boolean;

  @Prop({ default: true })
  keepLocalMirror: boolean;

  @Prop({ min: 1, max: 3650, default: 30 })
  retentionDays: number;

  @Prop({ trim: true, default: 'inhalex-respaldos' })
  cloudFolder: string;

  @Prop()
  lastSuccessfulRunAt?: Date;

  @Prop()
  lastAttemptAt?: Date;

  @Prop()
  lastFailureAt?: Date;

  @Prop({ trim: true })
  lastError?: string;

  createdAt?: Date;

  updatedAt?: Date;
}

export const BackupSettingsSchema = SchemaFactory.createForClass(BackupSettings);

