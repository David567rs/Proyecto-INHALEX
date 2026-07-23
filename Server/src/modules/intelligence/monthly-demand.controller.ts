import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { MonthlyDemandService } from './monthly-demand.service';

@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class MonthlyDemandController {
  constructor(private readonly monthlyDemandService: MonthlyDemandService) {}

  @Get('demand-forecast')
  getForecast() {
    return this.monthlyDemandService.getForecast();
  }
}
