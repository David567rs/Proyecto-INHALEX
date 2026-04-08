import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { v2 as cloudinary } from 'cloudinary';
import { promises as fs } from 'fs';
import * as path from 'path';

export interface LocalBackupFileInfo {
  absolutePath: string;
  relativePath: string;
  sizeBytes: number;
}

export interface CloudBackupFileInfo {
  publicId: string;
  secureUrl: string;
  bytes: number;
}

export type RemoteBackupStorageProvider = 'cloudinary' | 'r2';

@Injectable()
export class AdminBackupStorageService {
  private readonly logger = new Logger(AdminBackupStorageService.name);
  private cloudinaryInitialized = false;
  private r2Client: S3Client | null = null;

  constructor(private readonly configService: ConfigService) {}

  isCloudinaryConfigured(): boolean {
    const cloudName = this.configService
      .get<string>('BACKUP_CLOUDINARY_CLOUD_NAME')
      ?.trim();
    const apiKey = this.configService
      .get<string>('BACKUP_CLOUDINARY_API_KEY')
      ?.trim();
    const apiSecret = this.configService
      .get<string>('BACKUP_CLOUDINARY_API_SECRET')
      ?.trim();

    return Boolean(cloudName && apiKey && apiSecret);
  }

  isR2Configured(): boolean {
    const accountId = this.configService.get<string>('BACKUP_R2_ACCOUNT_ID')?.trim();
    const accessKeyId = this.configService
      .get<string>('BACKUP_R2_ACCESS_KEY_ID')
      ?.trim();
    const secretAccessKey = this.configService
      .get<string>('BACKUP_R2_SECRET_ACCESS_KEY')
      ?.trim();
    const bucket = this.configService.get<string>('BACKUP_R2_BUCKET')?.trim();

    return Boolean(accountId && accessKeyId && secretAccessKey && bucket);
  }

  getBackupRootDir(): string {
    const envDir = this.configService.get<string>('BACKUP_DIR')?.trim();
    const relative = envDir && envDir.length > 0 ? envDir : 'backups';
    return path.resolve(process.cwd(), relative);
  }

  async saveLocalFile(
    relativeDirectory: string,
    fileName: string,
    buffer: Buffer,
  ): Promise<LocalBackupFileInfo> {
    const root = this.getBackupRootDir();
    const targetDirectory = path.join(root, relativeDirectory);
    await fs.mkdir(targetDirectory, { recursive: true });
    const absolutePath = path.join(targetDirectory, fileName);
    await fs.writeFile(absolutePath, buffer);

    return {
      absolutePath,
      relativePath: path.relative(root, absolutePath),
      sizeBytes: buffer.byteLength,
    };
  }

  async readLocalFile(relativePath: string): Promise<Buffer> {
    const absolutePath = this.resolvePathInsideRoot(relativePath);
    return fs.readFile(absolutePath);
  }

  async deleteLocalFile(relativePath?: string): Promise<void> {
    if (!relativePath) return;

    try {
      const absolutePath = this.resolvePathInsideRoot(relativePath);
      await fs.unlink(absolutePath);
    } catch (error: unknown) {
      const errorCode = (error as { code?: string } | undefined)?.code;
      if (errorCode !== 'ENOENT') {
        this.logger.warn(`No se pudo eliminar el archivo local ${relativePath}`);
      }
    }
  }

  async uploadToCloudinary(
    fileName: string,
    buffer: Buffer,
    folder: string,
    publicId: string,
  ): Promise<CloudBackupFileInfo> {
    this.initializeCloudinary();

    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          folder,
          public_id: publicId,
          filename_override: fileName,
          overwrite: true,
        },
        (error, result) => {
          if (error || !result) {
            reject(
              new InternalServerErrorException(
                'No se pudo subir el respaldo a Cloudinary',
              ),
            );
            return;
          }

          resolve({
            publicId: result.public_id,
            secureUrl: result.secure_url,
            bytes: result.bytes,
          });
        },
      );

      upload.end(buffer);
    });
  }

  async uploadToR2(
    objectKey: string,
    buffer: Buffer,
    contentType = 'application/json',
  ): Promise<CloudBackupFileInfo> {
    const client = this.getR2Client();
    const bucket = this.getR2Bucket();

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    const publicBaseUrl = this.configService
      .get<string>('BACKUP_R2_PUBLIC_BASE_URL')
      ?.trim()
      ?.replace(/\/+$/, '');

    return {
      publicId: objectKey,
      secureUrl: publicBaseUrl ? `${publicBaseUrl}/${objectKey}` : '',
      bytes: buffer.byteLength,
    };
  }

  async downloadRemoteFile(
    provider: RemoteBackupStorageProvider,
    remoteIdentifier: string,
    remoteUrl?: string,
  ): Promise<Buffer> {
    if (provider === 'cloudinary') {
      if (!remoteUrl) {
        throw new InternalServerErrorException(
          'No se encontro la URL del respaldo remoto en Cloudinary',
        );
      }

      const response = await fetch(remoteUrl);
      if (!response.ok) {
        throw new InternalServerErrorException(
          'No se pudo descargar el respaldo remoto',
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    const client = this.getR2Client();
    const bucket = this.getR2Bucket();
    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: remoteIdentifier,
      }),
    );

    if (!response.Body) {
      throw new InternalServerErrorException(
        'No se encontro el archivo remoto en Cloudflare R2',
      );
    }

    const bytes = await response.Body.transformToByteArray();
    return Buffer.from(bytes);
  }

  async deleteRemoteFile(
    provider: RemoteBackupStorageProvider | undefined,
    remoteIdentifier?: string,
  ): Promise<void> {
    if (!provider || !remoteIdentifier) return;

    try {
      if (provider === 'cloudinary') {
        if (!this.isCloudinaryConfigured()) return;
        this.initializeCloudinary();
        await cloudinary.uploader.destroy(remoteIdentifier, {
          resource_type: 'raw',
        });
        return;
      }

      if (!this.isR2Configured()) return;
      const client = this.getR2Client();
      const bucket = this.getR2Bucket();
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: remoteIdentifier,
        }),
      );
    } catch {
      this.logger.warn(`No se pudo eliminar el respaldo remoto ${remoteIdentifier}`);
    }
  }

  private initializeCloudinary(): void {
    if (this.cloudinaryInitialized) return;
    if (!this.isCloudinaryConfigured()) {
      throw new InternalServerErrorException(
        'Cloudinary no esta configurado para respaldos',
      );
    }

    cloudinary.config({
      cloud_name: this.configService.get<string>('BACKUP_CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('BACKUP_CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('BACKUP_CLOUDINARY_API_SECRET'),
      secure: true,
    });
    this.cloudinaryInitialized = true;
  }

  private getR2Client(): S3Client {
    if (this.r2Client) return this.r2Client;
    if (!this.isR2Configured()) {
      throw new InternalServerErrorException(
        'Cloudflare R2 no esta configurado para respaldos',
      );
    }

    const accountId = this.configService.get<string>('BACKUP_R2_ACCOUNT_ID')!;
    const endpoint =
      this.configService.get<string>('BACKUP_R2_ENDPOINT')?.trim() ||
      `https://${accountId}.r2.cloudflarestorage.com`;

    this.r2Client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId: this.configService.get<string>('BACKUP_R2_ACCESS_KEY_ID')!,
        secretAccessKey: this.configService.get<string>(
          'BACKUP_R2_SECRET_ACCESS_KEY',
        )!,
      },
    });

    return this.r2Client;
  }

  private getR2Bucket(): string {
    const bucket = this.configService.get<string>('BACKUP_R2_BUCKET')?.trim();
    if (!bucket) {
      throw new InternalServerErrorException(
        'No se definio el bucket de Cloudflare R2 para respaldos',
      );
    }
    return bucket;
  }

  private resolvePathInsideRoot(targetRelativePath: string): string {
    const root = this.getBackupRootDir();
    const resolved = path.resolve(root, targetRelativePath);
    const normalizedRoot = path.resolve(root);
    if (!resolved.startsWith(normalizedRoot)) {
      throw new InternalServerErrorException('Ruta de respaldo invalida');
    }
    return resolved;
  }
}
