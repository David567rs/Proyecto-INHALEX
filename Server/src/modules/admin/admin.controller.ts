import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { AdminService } from './admin.service';
import { UpdateUserByAdminDto } from './dto/update-user-by-admin.dto';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getUsers() {
    return this.adminService.listUsers();
  }

  @Patch('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateUser(
    @Param('id') id: string,
    @Body() updateUserByAdminDto: UpdateUserByAdminDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.adminService.updateUser(id, updateUserByAdminDto, request.user.sub);
  }
}
