import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BackupRecordDocument = HydratedDocument<BackupRecord>;

export type BackupKind = 'database' | 'collection';
export type BackupTrigger = 'manual' | 'automatic';
export type BackupStatus = 'ready' | 'failed' | 'purged';
export type BackupStorageProvider = 'local' | 'cloudinary' | 'r2';

@Schema({
  _id: false,
  versionKey: false,
  suppressReservedKeysWarning: true,
})
export class BackupCollectionSnapshot {
  @Prop({ required: true, trim: true })
  collection: string;

  @Prop({ required: true, min: 0 })
  count: number;
}

export const BackupCollectionSnapshotSchema = SchemaFactory.createForClass(
  BackupCollectionSnapshot,
);

@Schema({
  timestamps: true,
  versionKey: false,
  collection: 'respaldos_generados',
  suppressReservedKeysWarning: true,
})
export class BackupRecord {
  @Prop({ required: true, unique: true, index: true })
  backupId: string;

  @Prop({ type: String, enum: ['database', 'collection'], required: true })
  kind: BackupKind;

  @Prop({ type: String, enum: ['manual', 'automatic'], default: 'manual' })
  trigger: BackupTrigger;

  @Prop({ type: String, enum: ['ready', 'failed', 'purged'], default: 'ready' })
  status: BackupStatus;

  @Prop({ trim: true })
  collection?: string;

  @Prop({ min: 0, default: 0 })
  count?: number;

  @Prop({ min: 0, default: 0 })
  totalCollections: number;

  @Prop({ min: 0, default: 0 })
  totalDocuments: number;

  @Prop({ type: [BackupCollectionSnapshotSchema], default: [] })
  collections: BackupCollectionSnapshot[];

  @Prop({ trim: true })
  fileName: string;

  @Prop({ min: 0, default: 0 })
  sizeBytes: number;

  @Prop({ type: String, enum: ['local', 'cloudinary', 'r2'], default: 'local' })
  storageProvider: BackupStorageProvider;

  @Prop({ default: false })
  localAvailable: boolean;

  @Prop({ trim: true })
  localFilePath?: string;

  @Prop({ default: false })
  remoteAvailable: boolean;

  @Prop({ trim: true })
  remoteUrl?: string;

  @Prop({ trim: true })
  remoteIdentifier?: string;

  @Prop({ trim: true })
  remotePublicId?: string;

  @Prop({ trim: true })
  notes?: string;

  @Prop({ trim: true })
  errorMessage?: string;

  createdAt?: Date;

  updatedAt?: Date;
}

export const BackupRecordSchema = SchemaFactory.createForClass(BackupRecord);
