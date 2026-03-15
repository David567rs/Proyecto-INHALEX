import { Controller, Get } from '@nestjs/common';
import { CompanyContentService } from './company-content.service';

@Controller('company-content')
export class CompanyContentController {
  constructor(private readonly companyContentService: CompanyContentService) {}

  @Get()
  getPublicContent() {
    return this.companyContentService.getPublicContent();
  }
}
