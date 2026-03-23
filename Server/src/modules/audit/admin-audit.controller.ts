import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { GetMonitoringQueryDto } from './dto/get-monitoring-query.dto';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';
import { AuditService } from './audit.service';
import { MonitoringService } from './monitoring.service';

@Controller('admin/audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminAuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly monitoringService: MonitoringService,
  ) {}

  @Get('monitoring')
  getMonitoring(@Query() query: GetMonitoringQueryDto) {
    return this.monitoringService.getOverview(query);
  }

  @Get('logs')
  listLogs(@Query() query: ListAuditLogsQueryDto) {
    return this.auditService.listLogs(query);
  }
}

