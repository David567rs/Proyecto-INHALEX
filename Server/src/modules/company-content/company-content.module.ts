import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthModule } from '../auth/auth.module';
import { AdminCompanyContentController } from './admin-company-content.controller';
import { CompanyContentController } from './company-content.controller';
import { CompanyContentService } from './company-content.service';
import {
  CompanyContent,
  CompanyContentSchema,
} from './schemas/company-content.schema';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: CompanyContent.name, schema: CompanyContentSchema },
    ]),
  ],
  controllers: [CompanyContentController, AdminCompanyContentController],
  providers: [CompanyContentService, RolesGuard],
  exports: [CompanyContentService],
})
export class CompanyContentModule {}
