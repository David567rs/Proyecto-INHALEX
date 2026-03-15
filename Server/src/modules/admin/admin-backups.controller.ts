import {
  Body,
  Controller,
  Get,
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

@Controller('admin/backups')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminBackupsController {
  constructor(private readonly adminBackupsService: AdminBackupsService) {}

  @Get('collections')
  listCollections() {
    return this.adminBackupsService.listCollections();
  }

  @Post('database')
  createDatabaseBackup() {
    return this.adminBackupsService.createDatabaseBackup();
  }

  @Post('collection')
  createCollectionBackup(@Body() payload: CreateCollectionBackupDto) {
    return this.adminBackupsService.createCollectionBackup(payload.collection);
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
    return response.download(exported.filePath, exported.fileName);
  }

  @Post('import')
  importBackup(@Body() payload: ImportBackupDto) {
    return this.adminBackupsService.importBackup(
      payload.backupId,
      payload.mode ?? 'replace',
    );
  }
}
