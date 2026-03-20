import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

@Injectable()
export class AdminBackupStorageService {
  private readonly logger = new Logger(AdminBackupStorageService.name);
  private cloudinaryConfigured = false;
  private cloudinaryInitialized = false;

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

  async downloadRemoteFile(remoteUrl: string): Promise<Buffer> {
    const response = await fetch(remoteUrl);
    if (!response.ok) {
      throw new InternalServerErrorException(
        'No se pudo descargar el respaldo remoto',
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async deleteRemoteFile(publicId?: string): Promise<void> {
    if (!publicId || !this.isCloudinaryConfigured()) return;

    try {
      this.initializeCloudinary();
      await cloudinary.uploader.destroy(publicId, {
        resource_type: 'raw',
      });
    } catch {
      this.logger.warn(`No se pudo eliminar el respaldo remoto ${publicId}`);
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

    this.cloudinaryConfigured = true;
    this.cloudinaryInitialized = true;
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
