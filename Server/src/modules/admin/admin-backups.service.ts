import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import { EJSON } from 'bson';
import * as path from 'path';
import { Connection } from 'mongoose';

export interface CollectionSummary {
  name: string;
  count: number;
}

export interface CollectionBackupFile {
  collection: string;
  count: number;
  fileName: string;
  filePath: string;
  sizeBytes: number;
}

export interface DatabaseBackupMetadata {
  id: string;
  kind: 'database';
  createdAt: string;
  backupPath: string;
  totalCollections: number;
  totalDocuments: number;
  collections: CollectionBackupFile[];
  bundleFileName?: string;
  bundleFilePath?: string;
  bundleSizeBytes?: number;
}

export interface CollectionBackupMetadata {
  id: string;
  kind: 'collection';
  createdAt: string;
  backupPath: string;
  collection: string;
  count: number;
  fileName: string;
  sizeBytes: number;
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
export class AdminBackupsService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async listCollections(): Promise<{ items: CollectionSummary[] }> {
    const db = this.connection.db;
    if (!db) {
      throw new InternalServerErrorException(
        'No hay conexion activa con la base de datos',
      );
    }

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
      names.map(async (name) => {
        const count = await db.collection(name).countDocuments({});
        return { name, count };
      }),
    );

    return { items };
  }

  async createDatabaseBackup(): Promise<DatabaseBackupMetadata> {
    const db = this.connection.db;
    if (!db) {
      throw new InternalServerErrorException(
        'No hay conexion activa con la base de datos',
      );
    }

    const root = this.resolveBackupRootDir();
    const backupId = buildBackupId('db');
    const backupDir = path.join(root, 'database', backupId);
    await fs.mkdir(backupDir, { recursive: true });

    const createdAt = new Date().toISOString();
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

    const collectionBackups: CollectionBackupFile[] = [];
    const bundleCollections: Array<{
      collection: string;
      totalDocuments: number;
      documents: unknown[];
    }> = [];

    for (const collectionName of names) {
      const documents = await db.collection(collectionName).find({}).toArray();
      const safeCollectionName = sanitizeFileSegment(collectionName);
      const fileName = `${safeCollectionName || 'coleccion'}.json`;
      const filePath = path.join(backupDir, fileName);
      const filePayload = {
        backupId,
        createdAt,
        collection: collectionName,
        totalDocuments: documents.length,
        documents,
      };
      const rawData = EJSON.stringify(filePayload, undefined, 2, {
        relaxed: false,
      });
      await fs.writeFile(filePath, rawData, 'utf8');

      collectionBackups.push({
        collection: collectionName,
        count: documents.length,
        fileName,
        filePath: path.relative(root, filePath),
        sizeBytes: Buffer.byteLength(rawData),
      });

      bundleCollections.push({
        collection: collectionName,
        totalDocuments: documents.length,
        documents,
      });
    }

    const bundleFileName = 'database.export.json';
    const bundleAbsolutePath = path.join(backupDir, bundleFileName);
    const bundleRawData = EJSON.stringify(
      {
        backupId,
        createdAt,
        kind: 'database',
        totalCollections: collectionBackups.length,
        collections: bundleCollections,
      },
      undefined,
      2,
      { relaxed: false },
    );
    await fs.writeFile(bundleAbsolutePath, bundleRawData, 'utf8');

    const metadata: DatabaseBackupMetadata = {
      id: backupId,
      kind: 'database',
      createdAt,
      backupPath: path.relative(root, backupDir),
      totalCollections: collectionBackups.length,
      totalDocuments: collectionBackups.reduce(
        (sum, item) => sum + item.count,
        0,
      ),
      collections: collectionBackups,
      bundleFileName,
      bundleFilePath: path.relative(root, bundleAbsolutePath),
      bundleSizeBytes: Buffer.byteLength(bundleRawData),
    };

    await fs.writeFile(
      path.join(backupDir, 'backup.meta.json'),
      JSON.stringify(metadata, null, 2),
      'utf8',
    );

    return metadata;
  }

  async createCollectionBackup(
    collectionNameRaw: string,
  ): Promise<CollectionBackupMetadata> {
    const db = this.connection.db;
    if (!db) {
      throw new InternalServerErrorException(
        'No hay conexion activa con la base de datos',
      );
    }

    const collectionName = collectionNameRaw.trim();
    if (!collectionName) {
      throw new BadRequestException('Debes indicar una coleccion valida');
    }

    const collections = await db
      .listCollections(
        {},
        {
          nameOnly: true,
          authorizedCollections: true,
        },
      )
      .toArray();
    const exists = collections.some((entry) => entry.name === collectionName);
    if (!exists) {
      throw new BadRequestException('La coleccion indicada no existe');
    }

    const root = this.resolveBackupRootDir();
    const backupId = buildBackupId(
      sanitizeFileSegment(collectionName) || 'coleccion',
    );
    const backupDir = path.join(root, 'collections');
    await fs.mkdir(backupDir, { recursive: true });

    const documents = await db.collection(collectionName).find({}).toArray();
    const createdAt = new Date().toISOString();
    const fileName = `${backupId}.json`;
    const filePath = path.join(backupDir, fileName);
    const filePayload = {
      backupId,
      createdAt,
      collection: collectionName,
      totalDocuments: documents.length,
      documents,
    };
    const rawData = EJSON.stringify(filePayload, undefined, 2, {
      relaxed: false,
    });
    await fs.writeFile(filePath, rawData, 'utf8');

    const metadata: CollectionBackupMetadata = {
      id: backupId,
      kind: 'collection',
      createdAt,
      backupPath: path.relative(root, filePath),
      collection: collectionName,
      count: documents.length,
      fileName,
      sizeBytes: Buffer.byteLength(rawData),
    };

    await fs.writeFile(
      path.join(backupDir, `${backupId}.meta.json`),
      JSON.stringify(metadata, null, 2),
      'utf8',
    );

    return metadata;
  }

  async listBackups(limit = 20): Promise<{ items: BackupMetadata[] }> {
    const safeLimit = Math.max(1, Math.min(limit, 500));
    const items = await this.collectBackups();
    return { items: items.slice(0, safeLimit) };
  }

  async getBackupExportFile(backupId: string): Promise<{
    filePath: string;
    fileName: string;
  }> {
    const normalizedId = backupId.trim();
    if (!normalizedId) {
      throw new BadRequestException('Debes indicar un backupId valido');
    }

    const root = this.resolveBackupRootDir();
    const backup = await this.findBackupById(normalizedId);

    if (backup.kind === 'collection') {
      const absolutePath = this.resolvePathInsideRoot(root, backup.backupPath);
      if (!(await this.pathExists(absolutePath))) {
        throw new NotFoundException('No se encontro el archivo del respaldo');
      }
      return {
        filePath: absolutePath,
        fileName: backup.fileName || path.basename(absolutePath),
      };
    }

    const relativeBundlePath =
      backup.bundleFilePath || path.join(backup.backupPath, 'database.export.json');
    const absoluteBundlePath = this.resolvePathInsideRoot(root, relativeBundlePath);
    if (!(await this.pathExists(absoluteBundlePath))) {
      throw new NotFoundException('No se encontro el archivo exportable del respaldo');
    }

    return {
      filePath: absoluteBundlePath,
      fileName: backup.bundleFileName || `${backup.id}.json`,
    };
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

    const db = this.connection.db;
    if (!db) {
      throw new InternalServerErrorException(
        'No hay conexion activa con la base de datos',
      );
    }

    const root = this.resolveBackupRootDir();
    const backup = await this.findBackupById(normalizedId);
    const collectionsToImport: Array<{
      collection: string;
      documents: Record<string, unknown>[];
    }> = [];

    if (backup.kind === 'collection') {
      const absoluteFilePath = this.resolvePathInsideRoot(root, backup.backupPath);
      const payload = await this.readCollectionBackupPayload(absoluteFilePath);
      collectionsToImport.push(payload);
    } else {
      for (const collectionFile of backup.collections) {
        const absoluteFilePath = this.resolvePathInsideRoot(
          root,
          collectionFile.filePath,
        );
        const payload = await this.readCollectionBackupPayload(absoluteFilePath);
        collectionsToImport.push(payload);
      }
    }

    const results: BackupImportCollectionResult[] = [];
    for (const item of collectionsToImport) {
      const collectionResult = await this.importCollectionDocuments(
        item.collection,
        item.documents,
        mode,
      );
      results.push(collectionResult);
    }

    return {
      backupId: backup.id,
      kind: backup.kind,
      mode,
      importedAt: new Date().toISOString(),
      collections: results,
    };
  }

  private async collectBackups(): Promise<BackupMetadata[]> {
    const root = this.resolveBackupRootDir();

    if (!(await this.pathExists(root))) {
      return [];
    }

    const metadataPaths: string[] = [];

    const databaseDir = path.join(root, 'database');
    if (await this.pathExists(databaseDir)) {
      const entries = await fs.readdir(databaseDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const metadataPath = path.join(
          databaseDir,
          entry.name,
          'backup.meta.json',
        );
        if (await this.pathExists(metadataPath)) {
          metadataPaths.push(metadataPath);
        }
      }
    }

    const collectionsDir = path.join(root, 'collections');
    if (await this.pathExists(collectionsDir)) {
      const entries = await fs.readdir(collectionsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        if (!entry.name.endsWith('.meta.json')) continue;
        metadataPaths.push(path.join(collectionsDir, entry.name));
      }
    }

    const items: BackupMetadata[] = [];
    for (const metadataPath of metadataPaths) {
      try {
        const rawData = await fs.readFile(metadataPath, 'utf8');
        const parsed = JSON.parse(rawData) as BackupMetadata;
        if (
          parsed &&
          typeof parsed === 'object' &&
          (parsed.kind === 'database' || parsed.kind === 'collection') &&
          typeof parsed.createdAt === 'string'
        ) {
          items.push(parsed);
        }
      } catch {
        // Ignora metadatos corruptos para no romper el panel.
      }
    }

    items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return items;
  }

  private async findBackupById(backupId: string): Promise<BackupMetadata> {
    const allBackups = await this.collectBackups();
    const backup = allBackups.find((item) => item.id === backupId);
    if (!backup) {
      throw new NotFoundException('No se encontro el respaldo indicado');
    }
    return backup;
  }

  private async readCollectionBackupPayload(absolutePath: string): Promise<{
    collection: string;
    documents: Record<string, unknown>[];
  }> {
    if (!(await this.pathExists(absolutePath))) {
      throw new NotFoundException(
        'No se encontro uno de los archivos del respaldo',
      );
    }

    const rawData = await fs.readFile(absolutePath, 'utf8');
    const parsed = EJSON.parse(rawData) as {
      collection?: unknown;
      documents?: unknown;
    };

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.collection !== 'string' ||
      !Array.isArray(parsed.documents)
    ) {
      throw new BadRequestException(
        'El archivo de respaldo no tiene un formato valido',
      );
    }

    return {
      collection: parsed.collection,
      documents: parsed.documents as Record<string, unknown>[],
    };
  }

  private async importCollectionDocuments(
    collectionName: string,
    documents: Record<string, unknown>[],
    mode: BackupImportMode,
  ): Promise<BackupImportCollectionResult> {
    const db = this.connection.db;
    if (!db) {
      throw new InternalServerErrorException(
        'No hay conexion activa con la base de datos',
      );
    }

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

    if (
      Array.isArray(errorObj.writeErrors) &&
      errorObj.writeErrors.length > 0 &&
      errorObj.writeErrors.every((item) => item?.code === 11000)
    ) {
      return true;
    }

    return false;
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

  private resolveBackupRootDir(): string {
    const envDir = process.env.BACKUP_DIR?.trim();
    const relative = envDir && envDir.length > 0 ? envDir : 'backups';
    return path.resolve(process.cwd(), relative);
  }

  private resolvePathInsideRoot(root: string, targetRelativePath: string): string {
    const resolved = path.resolve(root, targetRelativePath);
    const normalizedRoot = path.resolve(root);
    if (!resolved.startsWith(normalizedRoot)) {
      throw new BadRequestException('Ruta de respaldo invalida');
    }
    return resolved;
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
