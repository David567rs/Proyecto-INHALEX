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
import { ListAdminOrdersQueryDto } from './dto/list-admin-orders-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

@Controller('admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  listAdminOrders(@Query() query: ListAdminOrdersQueryDto) {
    return this.ordersService.listAdminOrders(query);
  }

  @Get(':id')
  getAdminOrder(@Param('id') id: string) {
    return this.ordersService.getAdminOrder(id);
  }

  @Patch(':id/status')
  updateOrderStatus(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.ordersService.updateOrderStatus(
      id,
      updateOrderStatusDto,
      request.user,
    );
  }
}
