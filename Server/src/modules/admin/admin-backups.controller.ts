import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { AdminBackupsService } from './admin-backups.service';
import { CreateCollectionBackupDto } from './dto/create-collection-backup.dto';
import { ImportBackupDto } from './dto/import-backup.dto';
import { ListBackupsQueryDto } from './dto/list-backups-query.dto';
import { UpdateBackupSettingsDto } from './dto/update-backup-settings.dto';

@Controller('admin/backups')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminBackupsController {
  constructor(private readonly adminBackupsService: AdminBackupsService) {}

  @Get('collections')
  listCollections() {
    return this.adminBackupsService.listCollections();
  }

  @Get('settings')
  getSettings() {
    return this.adminBackupsService.getSettings();
  }

  @Patch('settings')
  updateSettings(@Body() payload: UpdateBackupSettingsDto) {
    return this.adminBackupsService.updateSettings(payload);
  }

  @Get('status')
  getStatus() {
    return this.adminBackupsService.getStatus();
  }

  @Post('database')
  createDatabaseBackup() {
    return this.adminBackupsService.createDatabaseBackup();
  }

  @Post('collection')
  createCollectionBackup(@Body() payload: CreateCollectionBackupDto) {
    return this.adminBackupsService.createCollectionBackup(payload.collection);
  }

  @Post('run-policy')
  runPolicyBackup() {
    return this.adminBackupsService.runPolicyBackupNow();
  }

  @Get()
  listBackups(@Query() query: ListBackupsQueryDto) {
    return this.adminBackupsService.listBackups(query.limit ?? 20);
  }

  @Get('export/:backupId')
  async exportBackup(
    @Param('backupId') backupId: string,
    @Res() response: Response,
  ) {
    const exported = await this.adminBackupsService.getBackupExportFile(backupId);

    if (exported.kind === 'file') {
      return response.download(exported.filePath, exported.fileName);
    }

    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${exported.fileName}"`,
    );
    return response.send(exported.buffer);
  }

  @Post('import')
  importBackup(@Body() payload: ImportBackupDto) {
    return this.adminBackupsService.importBackup(
      payload.backupId,
      payload.mode ?? 'replace',
    );
  }
}
