import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { AdminReportsController } from './admin-reports.controller';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import {
  CustomerReport,
  CustomerReportSchema,
} from './schemas/customer-report.schema';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    NotificationsModule,
    MongooseModule.forFeature([
      { name: CustomerReport.name, schema: CustomerReportSchema },
    ]),
  ],
  controllers: [ReportsController, AdminReportsController],
  providers: [ReportsService, RolesGuard],
  exports: [ReportsService],
})
export class ReportsModule {}
