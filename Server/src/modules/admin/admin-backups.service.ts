import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { EJSON } from 'bson';
import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import { Connection, Model } from 'mongoose';
import { AdminBackupStorageService } from './admin-backup-storage.service';
import { UpdateBackupSettingsDto } from './dto/update-backup-settings.dto';
import {
  BackupRecord,
  BackupRecordDocument,
} from './schemas/backup-record.schema';
import {
  BackupSettings,
  BackupSettingsDocument,
  BackupStorageProvider,
  BackupScope,
} from './schemas/backup-settings.schema';

export interface CollectionSummary {
  name: string;
  count: number;
}

export interface BackupCollectionStat {
  collection: string;
  count: number;
}

export interface DatabaseBackupMetadata {
  id: string;
  kind: 'database';
  trigger: 'manual' | 'automatic';
  status: 'ready' | 'failed' | 'purged';
  createdAt: string;
  backupPath: string;
  totalCollections: number;
  totalDocuments: number;
  collections: BackupCollectionStat[];
  bundleFileName?: string;
  bundleFilePath?: string;
  bundleSizeBytes?: number;
  storageProvider: BackupStorageProvider;
  localAvailable: boolean;
  remoteAvailable: boolean;
  remoteUrl?: string;
  remoteIdentifier?: string;
  notes?: string;
  errorMessage?: string;
}

export interface CollectionBackupMetadata {
  id: string;
  kind: 'collection';
  trigger: 'manual' | 'automatic';
  status: 'ready' | 'failed' | 'purged';
  createdAt: string;
  backupPath: string;
  collection: string;
  count: number;
  fileName: string;
  sizeBytes: number;
  storageProvider: BackupStorageProvider;
  localAvailable: boolean;
  remoteAvailable: boolean;
  remoteUrl?: string;
  remoteIdentifier?: string;
  notes?: string;
  errorMessage?: string;
}

export type BackupMetadata = DatabaseBackupMetadata | CollectionBackupMetadata;
export type BackupImportMode = 'replace' | 'append';

export interface BackupImportCollectionResult {
  collection: string;
  totalInBackup: number;
  inserted: number;
  replaced: number;
  skipped: number;
}

export interface BackupImportResult {
  backupId: string;
  kind: BackupMetadata['kind'];
  mode: BackupImportMode;
  importedAt: string;
  collections: BackupImportCollectionResult[];
}

export interface BackupSettingsResponse {
  automaticEnabled: boolean;
  rpoMinutes: number;
  rtoMinutes: number;
  backupScope: BackupScope;
  selectedCollections: string[];
  preferredStorage: BackupStorageProvider;
  localDownloadsEnabled: boolean;
  keepLocalMirror: boolean;
  retentionDays: number;
  cloudFolder: string;
  cloudinaryConfigured: boolean;
  r2Configured: boolean;
  nextRunAt?: string;
  lastSuccessfulRunAt?: string;
  lastAttemptAt?: string;
  lastFailureAt?: string;
  lastError?: string;
  updatedAt?: string;
}

export interface BackupStatusResponse {
  automaticEnabled: boolean;
  preferredStorage: BackupStorageProvider;
  cloudinaryConfigured: boolean;
  r2Configured: boolean;
  nextRunAt?: string;
  lastSuccessfulRunAt?: string;
  lastFailureAt?: string;
  lastError?: string;
  totalReady: number;
  totalFailed: number;
  totalPurged: number;
}

export type BackupFileExportResult =
  | {
      kind: 'file';
      filePath: string;
      fileName: string;
    }
  | {
      kind: 'buffer';
      buffer: Buffer;
      fileName: string;
    };

interface BackupArchiveCollectionPayload {
  collection: string;
  totalDocuments: number;
  documents: Record<string, unknown>[];
}

interface BackupArchivePayload {
  backupId: string;
  kind: 'database' | 'collection';
  trigger?: 'manual' | 'automatic';
  createdAt: string;
  collection?: string;
  totalCollections: number;
  totalDocuments: number;
  collections: BackupArchiveCollectionPayload[];
}

interface LegacyDatabaseBackupMetadata {
  id: string;
  kind: 'database';
  createdAt: string;
  backupPath: string;
  totalCollections: number;
  totalDocuments: number;
  collections: BackupCollectionStat[];
  bundleFileName?: string;
  bundleFilePath?: string;
  bundleSizeBytes?: number;
}

interface LegacyCollectionBackupMetadata {
  id: string;
  kind: 'collection';
  createdAt: string;
  backupPath: string;
  collection: string;
  count: number;
  fileName: string;
  sizeBytes: number;
}

type LegacyBackupMetadata =
  | LegacyDatabaseBackupMetadata
  | LegacyCollectionBackupMetadata;

function sanitizeFileSegment(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9_.-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function buildBackupId(prefix: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const random = randomBytes(2).toString('hex');
  return `${prefix}_${year}${month}${day}_${hours}${minutes}${seconds}_${random}`;
}

@Injectable()
export class AdminBackupsService implements OnModuleInit {
  private readonly logger = new Logger(AdminBackupsService.name);
  private legacySyncDone = false;

  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectModel(BackupSettings.name)
    private readonly backupSettingsModel: Model<BackupSettingsDocument>,
    @InjectModel(BackupRecord.name)
    private readonly backupRecordModel: Model<BackupRecordDocument>,
    private readonly storageService: AdminBackupStorageService,
  ) {}

  private getRemoteIdentifier(
    record: Pick<BackupRecordDocument, 'remoteIdentifier' | 'remotePublicId'>,
  ): string | undefined {
    return record.remoteIdentifier?.trim() || record.remotePublicId?.trim() || undefined;
  }

  async onModuleInit(): Promise<void> {
    await this.getSettingsDocument();
    await this.syncLegacyBackupsFromDisk();
  }

  async listCollections(): Promise<{ items: CollectionSummary[] }> {
    const db = this.getDb();
    const rawCollections = await db
      .listCollections(
        {},
        {
          nameOnly: true,
          authorizedCollections: true,
        },
      )
      .toArray();

    const names = rawCollections
      .map((entry) => entry.name)
      .filter((name) => !name.startsWith('system.'))
      .sort((a, b) => a.localeCompare(b, 'es-MX'));

    const items = await Promise.all(
      names.map(async (name) => ({
        name,
        count: await db.collection(name).countDocuments({}),
      })),
    );

    return { items };
  }

  async getSettings(): Promise<BackupSettingsResponse> {
    const settings = await this.getSettingsDocument();
    return this.mapSettings(settings);
  }

  async updateSettings(
    payload: UpdateBackupSettingsDto,
  ): Promise<BackupSettingsResponse> {
    const settings = await this.getSettingsDocument();
    const patch: Partial<BackupSettings> = {};

    if (payload.automaticEnabled !== undefined) patch.automaticEnabled = payload.automaticEnabled;
    if (payload.rpoMinutes !== undefined) patch.rpoMinutes = payload.rpoMinutes;
    if (payload.rtoMinutes !== undefined) patch.rtoMinutes = payload.rtoMinutes;
    if (payload.backupScope !== undefined) patch.backupScope = payload.backupScope;
    if (payload.selectedCollections !== undefined) {
      patch.selectedCollections = this.normalizeCollectionList(payload.selectedCollections);
    }
    if (payload.preferredStorage !== undefined) patch.preferredStorage = payload.preferredStorage;
    if (payload.localDownloadsEnabled !== undefined) patch.localDownloadsEnabled = payload.localDownloadsEnabled;
    if (payload.keepLocalMirror !== undefined) patch.keepLocalMirror = payload.keepLocalMirror;
    if (payload.retentionDays !== undefined) patch.retentionDays = payload.retentionDays;
    if (payload.cloudFolder !== undefined) {
      patch.cloudFolder = payload.cloudFolder.trim() || settings.cloudFolder || 'inhalex-respaldos';
    }

    const effectiveScope = patch.backupScope ?? settings.backupScope;
    const effectiveCollections = patch.selectedCollections ?? settings.selectedCollections;

    if (effectiveScope === 'selectedCollections' && effectiveCollections.length === 0) {
      throw new BadRequestException(
        'Debes elegir al menos una coleccion para la estrategia segmentada',
      );
    }

    if (patch.selectedCollections && patch.selectedCollections.length > 0) {
      await this.assertCollectionsExist(patch.selectedCollections);
    }

    const updated = await this.backupSettingsModel
      .findOneAndUpdate({ key: 'default' }, patch, {
        upsert: true,
        returnDocument: 'after',
        setDefaultsOnInsert: true,
        runValidators: true,
      })
      .exec();

    return this.mapSettings(updated);
  }

  async getStatus(): Promise<BackupStatusResponse> {
    const settings = await this.getSettingsDocument();
    const [totalReady, totalFailed, totalPurged] = await Promise.all([
      this.backupRecordModel.countDocuments({ status: 'ready' }).exec(),
      this.backupRecordModel.countDocuments({ status: 'failed' }).exec(),
      this.backupRecordModel.countDocuments({ status: 'purged' }).exec(),
    ]);

    return {
      automaticEnabled: settings.automaticEnabled,
      preferredStorage: settings.preferredStorage,
      cloudinaryConfigured: this.storageService.isCloudinaryConfigured(),
      r2Configured: this.storageService.isR2Configured(),
      nextRunAt: this.computeNextRunAt(settings)?.toISOString(),
      lastSuccessfulRunAt: settings.lastSuccessfulRunAt?.toISOString(),
      lastFailureAt: settings.lastFailureAt?.toISOString(),
      lastError: settings.lastError,
      totalReady,
      totalFailed,
      totalPurged,
    };
  }

  async createDatabaseBackup(): Promise<DatabaseBackupMetadata> {
    return this.createDatabaseBackupInternal('manual');
  }

  async createCollectionBackup(
    collectionNameRaw: string,
  ): Promise<CollectionBackupMetadata> {
    return this.createCollectionBackupInternal(collectionNameRaw, 'manual');
  }

  async runPolicyBackupNow(): Promise<{ scope: BackupScope; created: BackupMetadata[] }> {
    const settings = await this.getSettingsDocument();
    const created = await this.runConfiguredPolicy(settings, 'manual');
    return { scope: settings.backupScope, created };
  }

  async listBackups(limit = 20): Promise<{ items: BackupMetadata[] }> {
    await this.syncLegacyBackupsFromDisk();

    const safeLimit = Math.max(1, Math.min(limit, 200));
    const records = await this.backupRecordModel
      .find()
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .exec();

    return { items: records.map((record) => this.mapRecord(record)) };
  }

  async getBackupExportFile(backupId: string): Promise<BackupFileExportResult> {
    const settings = await this.getSettingsDocument();
    if (!settings.localDownloadsEnabled) {
      throw new BadRequestException(
        'La descarga local de respaldos esta desactivada por politica',
      );
    }

    const normalizedId = backupId.trim();
    if (!normalizedId) {
      throw new BadRequestException('Debes indicar un backupId valido');
    }

    const record = await this.findRecordByBackupId(normalizedId);

    if (record.localAvailable && record.localFilePath) {
      return {
        kind: 'file',
        filePath: this.resolveAbsolutePath(record.localFilePath),
        fileName: record.fileName,
      };
    }

    const remoteIdentifier = this.getRemoteIdentifier(record);

    if (
      record.remoteAvailable &&
      record.storageProvider !== 'local' &&
      remoteIdentifier
    ) {
      const buffer = await this.storageService.downloadRemoteFile(
        record.storageProvider,
        remoteIdentifier,
        record.remoteUrl,
      );
      return {
        kind: 'buffer',
        buffer,
        fileName: record.fileName,
      };
    }

    throw new NotFoundException(
      'El respaldo ya no tiene una copia disponible para exportacion',
    );
  }

  async importBackup(
    backupId: string,
    mode: BackupImportMode = 'replace',
  ): Promise<BackupImportResult> {
    const normalizedId = backupId.trim();
    if (!normalizedId) {
      throw new BadRequestException('Debes indicar un backupId valido');
    }
    if (mode !== 'replace' && mode !== 'append') {
      throw new BadRequestException('Modo de importacion invalido');
    }

    const record = await this.findRecordByBackupId(normalizedId);
    const payload = await this.readArchivePayload(record);
    const results: BackupImportCollectionResult[] = [];

    for (const item of payload.collections) {
      const collectionResult = await this.importCollectionDocuments(
        item.collection,
        item.documents,
        mode,
      );
      results.push(collectionResult);
    }

    return {
      backupId: record.backupId,
      kind: record.kind,
      mode,
      importedAt: new Date().toISOString(),
      collections: results,
    };
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processAutomatedBackups(): Promise<void> {
    await this.syncLegacyBackupsFromDisk();
    const settings = await this.getSettingsDocument();
    await this.cleanupExpiredBackups(settings.retentionDays);

    if (!settings.automaticEnabled) return;

    const nextRunAt = this.computeNextRunAt(settings);
    if (nextRunAt && nextRunAt.getTime() > Date.now()) return;

    await this.backupSettingsModel
      .updateOne(
        { _id: settings._id },
        {
          $set: {
            lastAttemptAt: new Date(),
          },
        },
      )
      .exec();

    try {
      await this.runConfiguredPolicy(settings, 'automatic');
      await this.backupSettingsModel
        .updateOne(
          { _id: settings._id },
          {
            $set: {
              lastSuccessfulRunAt: new Date(),
              lastError: '',
            },
          },
        )
        .exec();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo ejecutar el respaldo automatico';

      await this.backupSettingsModel
        .updateOne(
          { _id: settings._id },
          {
            $set: {
              lastFailureAt: new Date(),
              lastError: message,
            },
          },
        )
        .exec();

      await this.backupRecordModel.create({
        backupId: buildBackupId('fallo'),
        kind: settings.backupScope === 'database' ? 'database' : 'collection',
        trigger: 'automatic',
        status: 'failed',
        totalCollections:
          settings.backupScope === 'database'
            ? 0
            : settings.selectedCollections.length,
        totalDocuments: 0,
        collections:
          settings.backupScope === 'database'
            ? []
            : settings.selectedCollections.map((collection) => ({
                collection,
                count: 0,
              })),
        fileName: 'fallido.json',
        sizeBytes: 0,
        storageProvider: settings.preferredStorage,
        localAvailable: false,
        remoteAvailable: false,
        errorMessage: message,
        notes: 'Intento automatico fallido',
      });

      this.logger.error(message);
    }
  }

  private async createDatabaseBackupInternal(
    trigger: 'manual' | 'automatic',
  ): Promise<DatabaseBackupMetadata> {
    const db = this.getDb();
    const settings = await this.getSettingsDocument();
    const backupId = buildBackupId('db');
    const createdAt = new Date();

    const rawCollections = await db
      .listCollections(
        {},
        {
          nameOnly: true,
          authorizedCollections: true,
        },
      )
      .toArray();

    const names = rawCollections
      .map((entry) => entry.name)
      .filter((name) => !name.startsWith('system.'))
      .sort((a, b) => a.localeCompare(b, 'es-MX'));

    const archiveCollections: BackupArchiveCollectionPayload[] = [];
    const collectionStats: BackupCollectionStat[] = [];

    for (const collectionName of names) {
      const documents = await db.collection(collectionName).find({}).toArray();
      archiveCollections.push({
        collection: collectionName,
        totalDocuments: documents.length,
        documents: documents as Record<string, unknown>[],
      });
      collectionStats.push({
        collection: collectionName,
        count: documents.length,
      });
    }

    const totalDocuments = collectionStats.reduce(
      (sum, item) => sum + item.count,
      0,
    );

    const archivePayload: BackupArchivePayload = {
      backupId,
      kind: 'database',
      trigger,
      createdAt: createdAt.toISOString(),
      totalCollections: collectionStats.length,
      totalDocuments,
      collections: archiveCollections,
    };

    const persisted = await this.persistArchive({
      backupId,
      kind: 'database',
      fileName: `${backupId}.json`,
      buffer: Buffer.from(
        EJSON.stringify(archivePayload, undefined, 2, { relaxed: false }),
        'utf8',
      ),
      settings,
    });

    const record = await this.backupRecordModel.create({
      backupId,
      kind: 'database',
      trigger,
      status: 'ready',
      totalCollections: collectionStats.length,
      totalDocuments,
      collections: collectionStats,
      fileName: `${backupId}.json`,
      sizeBytes: persisted.sizeBytes,
      storageProvider: persisted.storageProvider,
      localAvailable: persisted.localAvailable,
      localFilePath: persisted.localFilePath,
      remoteAvailable: persisted.remoteAvailable,
      remoteUrl: persisted.remoteUrl,
      remoteIdentifier: persisted.remoteIdentifier,
      remotePublicId: persisted.remoteIdentifier,
      notes: persisted.notes,
      createdAt,
    });

    return this.mapRecord(record) as DatabaseBackupMetadata;
  }

  private async createCollectionBackupInternal(
    collectionNameRaw: string,
    trigger: 'manual' | 'automatic',
  ): Promise<CollectionBackupMetadata> {
    const db = this.getDb();
    const settings = await this.getSettingsDocument();
    const collectionName = collectionNameRaw.trim();
    if (!collectionName) {
      throw new BadRequestException('Debes indicar una coleccion valida');
    }

    await this.assertCollectionsExist([collectionName]);
    const documents = await db.collection(collectionName).find({}).toArray();
    const backupId = buildBackupId(
      sanitizeFileSegment(collectionName) || 'coleccion',
    );
    const createdAt = new Date();

    const archivePayload: BackupArchivePayload = {
      backupId,
      kind: 'collection',
      trigger,
      createdAt: createdAt.toISOString(),
      collection: collectionName,
      totalCollections: 1,
      totalDocuments: documents.length,
      collections: [
        {
          collection: collectionName,
          totalDocuments: documents.length,
          documents: documents as Record<string, unknown>[],
        },
      ],
    };

    const persisted = await this.persistArchive({
      backupId,
      kind: 'collection',
      fileName: `${backupId}.json`,
      buffer: Buffer.from(
        EJSON.stringify(archivePayload, undefined, 2, { relaxed: false }),
        'utf8',
      ),
      settings,
      collectionName,
    });

    const record = await this.backupRecordModel.create({
      backupId,
      kind: 'collection',
      trigger,
      status: 'ready',
      collection: collectionName,
      count: documents.length,
      totalCollections: 1,
      totalDocuments: documents.length,
      collections: [
        {
          collection: collectionName,
          count: documents.length,
        },
      ],
      fileName: `${backupId}.json`,
      sizeBytes: persisted.sizeBytes,
      storageProvider: persisted.storageProvider,
      localAvailable: persisted.localAvailable,
      localFilePath: persisted.localFilePath,
      remoteAvailable: persisted.remoteAvailable,
      remoteUrl: persisted.remoteUrl,
      remoteIdentifier: persisted.remoteIdentifier,
      remotePublicId: persisted.remoteIdentifier,
      notes: persisted.notes,
      createdAt,
    });

    return this.mapRecord(record) as CollectionBackupMetadata;
  }

  private async runConfiguredPolicy(
    settings: BackupSettingsDocument,
    trigger: 'manual' | 'automatic',
  ): Promise<BackupMetadata[]> {
    if (settings.backupScope === 'database') {
      return [await this.createDatabaseBackupInternal(trigger)];
    }

    if (settings.selectedCollections.length === 0) {
      throw new BadRequestException(
        'La estrategia automatica no tiene colecciones definidas',
      );
    }

    const items: BackupMetadata[] = [];
    for (const collection of settings.selectedCollections) {
      items.push(await this.createCollectionBackupInternal(collection, trigger));
    }
    return items;
  }

  private async persistArchive(options: {
    backupId: string;
    kind: 'database' | 'collection';
    fileName: string;
    buffer: Buffer;
    settings: BackupSettingsDocument;
    collectionName?: string;
  }): Promise<{
    sizeBytes: number;
    storageProvider: BackupStorageProvider;
    localAvailable: boolean;
    localFilePath?: string;
    remoteAvailable: boolean;
    remoteUrl?: string;
    remoteIdentifier?: string;
    notes?: string;
  }> {
    const { backupId, kind, fileName, buffer, settings, collectionName } =
      options;

    const wantsCloudinary = settings.preferredStorage === 'cloudinary';
    const wantsR2 = settings.preferredStorage === 'r2';
    const cloudinaryConfigured = this.storageService.isCloudinaryConfigured();
    const r2Configured = this.storageService.isR2Configured();

    let remoteUrl: string | undefined;
    let remoteIdentifier: string | undefined;
    let notes = '';

    if (wantsCloudinary && cloudinaryConfigured) {
      try {
        const remote = await this.storageService.uploadToCloudinary(
          fileName,
          buffer,
          `${settings.cloudFolder}/${kind}`,
          backupId,
        );
        remoteUrl = remote.secureUrl;
        remoteIdentifier = remote.publicId;
      } catch (error: unknown) {
        notes =
          error instanceof Error
            ? `${error.message} Se conservo la copia local como respaldo alterno.`
            : 'No se pudo subir a Cloudinary. Se conservo la copia local.';
      }
    } else if (wantsR2 && r2Configured) {
      try {
        const objectKey = `${settings.cloudFolder}/${kind}/${fileName}`;
        const remote = await this.storageService.uploadToR2(objectKey, buffer);
        remoteUrl = remote.secureUrl || undefined;
        remoteIdentifier = remote.publicId;
      } catch (error: unknown) {
        notes =
          error instanceof Error
            ? `${error.message} Se conservo la copia local como respaldo alterno.`
            : 'No se pudo subir a Cloudflare R2. Se conservo la copia local.';
      }
    } else if (wantsCloudinary && !cloudinaryConfigured) {
      notes =
        'Cloudinary no esta configurado. El respaldo se guardo solamente en almacenamiento local.';
    } else if (wantsR2 && !r2Configured) {
      notes =
        'Cloudflare R2 no esta configurado. El respaldo se guardo solamente en almacenamiento local.';
    }

    const shouldKeepLocal =
      settings.keepLocalMirror ||
      settings.preferredStorage === 'local' ||
      !remoteIdentifier;

    let localFilePath: string | undefined;
    if (shouldKeepLocal) {
      const local = await this.storageService.saveLocalFile(
        kind === 'database' ? 'database' : 'collections',
        fileName,
        buffer,
      );
      localFilePath = local.relativePath;
    }

    return {
      sizeBytes: buffer.byteLength,
      storageProvider: remoteIdentifier ? settings.preferredStorage : 'local',
      localAvailable: Boolean(localFilePath),
      localFilePath,
      remoteAvailable: Boolean(remoteIdentifier),
      remoteUrl,
      remoteIdentifier,
      notes:
        notes ||
        (collectionName
          ? `Respaldo de ${collectionName} generado correctamente`
          : 'Respaldo completo generado correctamente'),
    };
  }

  private async readArchivePayload(
    record: BackupRecordDocument,
  ): Promise<BackupArchivePayload> {
    let buffer: Buffer | null = null;

    if (record.localAvailable && record.localFilePath) {
      try {
        buffer = await this.storageService.readLocalFile(record.localFilePath);
      } catch {
        buffer = null;
      }
    }

    const remoteIdentifier = this.getRemoteIdentifier(record);

    if (
      !buffer &&
      record.remoteAvailable &&
      record.storageProvider !== 'local' &&
      remoteIdentifier
    ) {
      buffer = await this.storageService.downloadRemoteFile(
        record.storageProvider,
        remoteIdentifier,
        record.remoteUrl,
      );
    }

    if (!buffer) {
      throw new NotFoundException(
        'No existe una copia utilizable del respaldo solicitado',
      );
    }

    const parsed = EJSON.parse(buffer.toString('utf8')) as
      | BackupArchivePayload
      | {
          backupId?: string;
          createdAt?: string;
          collection?: string;
          totalDocuments?: number;
          documents?: unknown;
        };

    if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray((parsed as BackupArchivePayload).collections)
    ) {
      const payload = parsed as BackupArchivePayload;
      return {
        backupId: payload.backupId,
        kind: payload.kind ?? record.kind,
        trigger: payload.trigger ?? record.trigger,
        createdAt: payload.createdAt,
        collection: payload.collection,
        totalCollections: payload.totalCollections ?? payload.collections.length,
        totalDocuments:
          payload.totalDocuments ??
          payload.collections.reduce(
            (sum, item) => sum + item.totalDocuments,
            0,
          ),
        collections: payload.collections,
      };
    }

    const legacyParsed = parsed as {
      backupId?: string;
      createdAt?: string;
      collection?: string;
      totalDocuments?: number;
      documents?: unknown;
    };

    if (
      legacyParsed &&
      typeof legacyParsed === 'object' &&
      typeof legacyParsed.collection === 'string' &&
      Array.isArray(legacyParsed.documents)
    ) {
      const totalDocuments =
        typeof legacyParsed.totalDocuments === 'number'
          ? legacyParsed.totalDocuments
          : legacyParsed.documents.length;

      return {
        backupId: legacyParsed.backupId ?? record.backupId,
        kind: 'collection',
        trigger: record.trigger,
        createdAt:
          legacyParsed.createdAt ?? record.createdAt?.toISOString() ?? '',
        collection: legacyParsed.collection,
        totalCollections: 1,
        totalDocuments,
        collections: [
          {
            collection: legacyParsed.collection,
            totalDocuments,
            documents: legacyParsed.documents as Record<string, unknown>[],
          },
        ],
      };
    }

    throw new BadRequestException(
      'El contenido del respaldo no tiene un formato valido',
    );
  }

  private async importCollectionDocuments(
    collectionName: string,
    documents: Record<string, unknown>[],
    mode: BackupImportMode,
  ): Promise<BackupImportCollectionResult> {
    const db = this.getDb();
    let replaced = 0;
    let inserted = 0;
    const collection = db.collection(collectionName);

    if (mode === 'replace') {
      const deleteResult = await collection.deleteMany({});
      replaced = deleteResult.deletedCount ?? 0;
    }

    if (documents.length > 0) {
      try {
        const insertResult = await collection.insertMany(documents as never[], {
          ordered: false,
        });
        inserted =
          insertResult.insertedCount ??
          Object.keys(insertResult.insertedIds ?? {}).length;
      } catch (error: unknown) {
        inserted = this.resolveInsertedCount(error);
        const hasOnlyDuplicates = this.hasDuplicateKeyErrors(error);

        if (!hasOnlyDuplicates || mode === 'replace') {
          throw new BadRequestException(
            `No se pudo importar la coleccion "${collectionName}". Revisa el formato o claves duplicadas.`,
          );
        }
      }
    }

    const skipped = Math.max(0, documents.length - inserted);
    return {
      collection: collectionName,
      totalInBackup: documents.length,
      inserted,
      replaced,
      skipped,
    };
  }

  private hasDuplicateKeyErrors(error: unknown): boolean {
    const errorObj = error as
      | { code?: unknown; writeErrors?: Array<{ code?: unknown }> }
      | undefined;

    if (!errorObj) return false;
    if (errorObj.code === 11000) return true;

    return Boolean(
      Array.isArray(errorObj.writeErrors) &&
        errorObj.writeErrors.length > 0 &&
        errorObj.writeErrors.every((item) => item?.code === 11000),
    );
  }

  private resolveInsertedCount(error: unknown): number {
    const errorObj = error as {
      insertedCount?: unknown;
      nInserted?: unknown;
      result?: {
        insertedCount?: unknown;
        nInserted?: unknown;
        result?: { nInserted?: unknown };
      };
      writeResult?: { nInserted?: unknown };
    };

    const candidates = [
      errorObj?.insertedCount,
      errorObj?.nInserted,
      errorObj?.result?.insertedCount,
      errorObj?.result?.nInserted,
      errorObj?.result?.result?.nInserted,
      errorObj?.writeResult?.nInserted,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'number' && Number.isFinite(candidate)) {
        return Math.max(0, Math.floor(candidate));
      }
    }

    return 0;
  }

  private async cleanupExpiredBackups(retentionDays: number): Promise<void> {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const expired = await this.backupRecordModel
      .find({
        status: 'ready',
        createdAt: { $lt: cutoff },
      })
      .exec();

    for (const record of expired) {
      await this.storageService.deleteLocalFile(record.localFilePath);
      const remoteIdentifier = this.getRemoteIdentifier(record);
      await this.storageService.deleteRemoteFile(
        record.storageProvider === 'local' ? undefined : record.storageProvider,
        remoteIdentifier,
      );

      await this.backupRecordModel
        .updateOne(
          { _id: record._id },
          {
            $set: {
              status: 'purged',
              localAvailable: false,
              remoteAvailable: false,
              localFilePath: '',
              remoteUrl: '',
              remoteIdentifier: '',
              remotePublicId: '',
              notes: `Respaldo purgado automaticamente por politica de retencion (${retentionDays} dias)`,
            },
          },
        )
        .exec();
    }
  }

  private computeNextRunAt(
    settings: BackupSettingsDocument,
  ): Date | undefined {
    if (!settings.automaticEnabled) return undefined;
    if (!settings.lastSuccessfulRunAt) return new Date();
    return new Date(
      settings.lastSuccessfulRunAt.getTime() +
        settings.rpoMinutes * 60 * 1000,
    );
  }

  private mapSettings(settings: BackupSettingsDocument): BackupSettingsResponse {
    return {
      automaticEnabled: settings.automaticEnabled,
      rpoMinutes: settings.rpoMinutes,
      rtoMinutes: settings.rtoMinutes,
      backupScope: settings.backupScope,
      selectedCollections: settings.selectedCollections,
      preferredStorage: settings.preferredStorage,
      localDownloadsEnabled: settings.localDownloadsEnabled,
      keepLocalMirror: settings.keepLocalMirror,
      retentionDays: settings.retentionDays,
      cloudFolder: settings.cloudFolder,
      cloudinaryConfigured: this.storageService.isCloudinaryConfigured(),
      r2Configured: this.storageService.isR2Configured(),
      nextRunAt: this.computeNextRunAt(settings)?.toISOString(),
      lastSuccessfulRunAt: settings.lastSuccessfulRunAt?.toISOString(),
      lastAttemptAt: settings.lastAttemptAt?.toISOString(),
      lastFailureAt: settings.lastFailureAt?.toISOString(),
      lastError: settings.lastError,
      updatedAt: settings.updatedAt?.toISOString(),
    };
  }

  private mapRecord(record: BackupRecordDocument): BackupMetadata {
    const remoteIdentifier = this.getRemoteIdentifier(record);
    const backupPath =
      record.localFilePath ||
      remoteIdentifier ||
      'Sin ruta disponible';

    if (record.kind === 'database') {
      return {
        id: record.backupId,
        kind: 'database',
        trigger: record.trigger,
        status: record.status,
        createdAt: record.createdAt?.toISOString() ?? new Date().toISOString(),
        backupPath,
        totalCollections: record.totalCollections,
        totalDocuments: record.totalDocuments,
        collections: record.collections.map((item) => ({
          collection: item.collection,
          count: item.count,
        })),
        bundleFileName: record.fileName,
        bundleFilePath: record.localFilePath,
        bundleSizeBytes: record.sizeBytes,
        storageProvider: record.storageProvider,
        localAvailable: record.localAvailable,
        remoteAvailable: record.remoteAvailable,
        remoteUrl: record.remoteUrl,
        remoteIdentifier,
        notes: record.notes,
        errorMessage: record.errorMessage,
      };
    }

    return {
      id: record.backupId,
      kind: 'collection',
      trigger: record.trigger,
      status: record.status,
      createdAt: record.createdAt?.toISOString() ?? new Date().toISOString(),
      backupPath,
      collection: record.collection ?? '',
      count: record.count ?? record.totalDocuments,
      fileName: record.fileName,
      sizeBytes: record.sizeBytes,
      storageProvider: record.storageProvider,
      localAvailable: record.localAvailable,
      remoteAvailable: record.remoteAvailable,
      remoteUrl: record.remoteUrl,
      remoteIdentifier,
      notes: record.notes,
      errorMessage: record.errorMessage,
    };
  }

  private async getSettingsDocument(): Promise<BackupSettingsDocument> {
    return this.backupSettingsModel
      .findOneAndUpdate(
        { key: 'default' },
        { $setOnInsert: { key: 'default' } },
        {
          upsert: true,
          returnDocument: 'after',
          setDefaultsOnInsert: true,
        },
      )
      .exec();
  }

  private async findRecordByBackupId(
    backupId: string,
  ): Promise<BackupRecordDocument> {
    await this.syncLegacyBackupsFromDisk();
    const record = await this.backupRecordModel.findOne({ backupId }).exec();
    if (!record) {
      throw new NotFoundException('No se encontro el respaldo indicado');
    }
    return record;
  }

  private normalizeCollectionList(values: string[]): string[] {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b, 'es-MX'),
    );
  }

  private async assertCollectionsExist(collections: string[]): Promise<void> {
    const available = await this.listCollections();
    const set = new Set(available.items.map((item) => item.name));
    const missing = collections.filter((collection) => !set.has(collection));

    if (missing.length > 0) {
      throw new BadRequestException(
        `Las colecciones no existen o no estan autorizadas: ${missing.join(', ')}`,
      );
    }
  }

  private getDb() {
    const db = this.connection.db;
    if (!db) {
      throw new InternalServerErrorException(
        'No hay conexion activa con la base de datos',
      );
    }
    return db;
  }

  private resolveAbsolutePath(relativePath: string): string {
    return `${this.storageService.getBackupRootDir()}\\${relativePath.replace(/\//g, '\\')}`;
  }

  private async syncLegacyBackupsFromDisk(): Promise<void> {
    if (this.legacySyncDone) return;

    const root = this.storageService.getBackupRootDir();
    const legacyItems = await this.collectLegacyBackups(root);

    for (const item of legacyItems) {
      const exists = await this.backupRecordModel
        .findOne({ backupId: item.id })
        .select('_id')
        .lean()
        .exec();
      if (exists) continue;

      if (item.kind === 'database') {
        await this.backupRecordModel.create({
          backupId: item.id,
          kind: 'database',
          trigger: 'manual',
          status: 'ready',
          totalCollections: item.totalCollections,
          totalDocuments: item.totalDocuments,
          collections: item.collections,
          fileName: item.bundleFileName || `${item.id}.json`,
          sizeBytes: item.bundleSizeBytes ?? 0,
          storageProvider: 'local',
          localAvailable: Boolean(item.bundleFilePath),
          localFilePath: item.bundleFilePath,
          remoteAvailable: false,
          notes: 'Respaldo legado sincronizado desde disco',
          createdAt: new Date(item.createdAt),
        });
        continue;
      }

      await this.backupRecordModel.create({
        backupId: item.id,
        kind: 'collection',
        trigger: 'manual',
        status: 'ready',
        collection: item.collection,
        count: item.count,
        totalCollections: 1,
        totalDocuments: item.count,
        collections: [{ collection: item.collection, count: item.count }],
        fileName: item.fileName,
        sizeBytes: item.sizeBytes,
        storageProvider: 'local',
        localAvailable: true,
        localFilePath: item.backupPath,
        remoteAvailable: false,
        notes: 'Respaldo legado sincronizado desde disco',
        createdAt: new Date(item.createdAt),
      });
    }

    this.legacySyncDone = true;
  }

  private async collectLegacyBackups(
    root: string,
  ): Promise<LegacyBackupMetadata[]> {
    if (!(await this.pathExists(root))) {
      return [];
    }

    const metadataPaths: string[] = [];
    const databaseDir = `${root}\\database`;
    if (await this.pathExists(databaseDir)) {
      const entries = await fs.readdir(databaseDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const metadataPath = `${databaseDir}\\${entry.name}\\backup.meta.json`;
        if (await this.pathExists(metadataPath)) {
          metadataPaths.push(metadataPath);
        }
      }
    }

    const collectionsDir = `${root}\\collections`;
    if (await this.pathExists(collectionsDir)) {
      const entries = await fs.readdir(collectionsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.meta.json')) continue;
        metadataPaths.push(`${collectionsDir}\\${entry.name}`);
      }
    }

    const items: LegacyBackupMetadata[] = [];
    for (const metadataPath of metadataPaths) {
      try {
        const rawData = await fs.readFile(metadataPath, 'utf8');
        const parsed = JSON.parse(rawData) as LegacyBackupMetadata;
        if (
          parsed &&
          typeof parsed === 'object' &&
          (parsed.kind === 'database' || parsed.kind === 'collection')
        ) {
          items.push(parsed);
        }
      } catch {
        // Ignora respaldos heredados corruptos.
      }
    }

    return items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  private async pathExists(targetPath: string): Promise<boolean> {
    try {
      await fs.access(targetPath);
      return true;
    } catch {
      return false;
    }
  }
}
