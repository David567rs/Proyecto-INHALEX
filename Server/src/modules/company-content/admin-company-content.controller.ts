import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { UpdateCompanyContentDto } from './dto/update-company-content.dto';
import { CompanyContentService } from './company-content.service';

@Controller('admin/company-content')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminCompanyContentController {
  constructor(private readonly companyContentService: CompanyContentService) {}

  @Get()
  getAdminContent() {
    return this.companyContentService.getAdminContent();
  }

  @Patch()
  updateAdminContent(@Body() payload: UpdateCompanyContentDto) {
    return this.companyContentService.updateContent(payload);
  }
}
