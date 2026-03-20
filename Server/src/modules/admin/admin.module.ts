import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminBackupStorageService } from './admin-backup-storage.service';
import { AdminBackupsController } from './admin-backups.controller';
import { AdminBackupsService } from './admin-backups.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import {
  BackupRecord,
  BackupRecordSchema,
} from './schemas/backup-record.schema';
import {
  BackupSettings,
  BackupSettingsSchema,
} from './schemas/backup-settings.schema';

@Module({
  imports: [
    UsersModule,
    AuthModule,
    MongooseModule.forFeature([
      { name: BackupSettings.name, schema: BackupSettingsSchema },
      { name: BackupRecord.name, schema: BackupRecordSchema },
    ]),
  ],
  controllers: [AdminController, AdminBackupsController],
  providers: [
    AdminService,
    AdminBackupsService,
    AdminBackupStorageService,
    RolesGuard,
  ],
})
export class AdminModule {}
