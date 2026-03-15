import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthModule } from '../auth/auth.module';
import { AdminAuditController } from './admin-audit.controller';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';
import { AuditLogEntity, AuditLogSchema } from './schemas/audit-log.schema';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      {
        name: AuditLogEntity.name,
        schema: AuditLogSchema,
      },
    ]),
  ],
  controllers: [AdminAuditController],
  providers: [
    AuditService,
    RolesGuard,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  exports: [AuditService],
})
export class AuditModule {}

