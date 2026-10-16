import { Controller, Get, Header } from '@nestjs/common';
import { CompanyContentService } from './company-content.service';

@Controller('company-content')
export class CompanyContentController {
  constructor(private readonly companyContentService: CompanyContentService) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=0, must-revalidate')
  getPublicContent() {
    return this.companyContentService.getPublicContent();
  }
}
