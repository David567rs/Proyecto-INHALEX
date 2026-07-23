import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthModule } from '../auth/auth.module';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { MonthlyDemandController } from './monthly-demand.controller';
import { MonthlyDemandService } from './monthly-demand.service';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
  ],
  controllers: [RecommendationsController, MonthlyDemandController],
  providers: [RecommendationsService, MonthlyDemandService, RolesGuard],
})
export class IntelligenceModule {}
