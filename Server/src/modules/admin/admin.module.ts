import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminBackupsController } from './admin-backups.controller';
import { AdminBackupsService } from './admin-backups.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [UsersModule, AuthModule],
  controllers: [AdminController, AdminBackupsController],
  providers: [AdminService, AdminBackupsService, RolesGuard],
})
export class AdminModule {}
