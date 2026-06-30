import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { UserRole } from '../users/enums/user-role.enum';
import { ListAdminReportsQueryDto } from './dto/list-admin-reports-query.dto';
import { UpdateCustomerReportDto } from './dto/update-customer-report.dto';
import { ReportsService } from './reports.service';

@Controller('admin/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  list(@Query() query: ListAdminReportsQueryDto) {
    return this.reportsService.listAdmin(query);
  }

  @Patch(':id')
  update(
    @Param('id') reportId: string,
    @Body() updateCustomerReportDto: UpdateCustomerReportDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.reportsService.updateAdmin(
      reportId,
      updateCustomerReportDto,
      request.user,
    );
  }
}
