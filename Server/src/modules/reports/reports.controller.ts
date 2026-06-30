import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { CreateCustomerReportDto } from './dto/create-customer-report.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('me')
  list(@Req() request: AuthenticatedRequest) {
    return this.reportsService.listForUser(request.user);
  }

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() createCustomerReportDto: CreateCustomerReportDto,
  ) {
    return this.reportsService.create(request.user, createCustomerReportDto);
  }
}
