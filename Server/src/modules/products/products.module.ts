import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './schemas/product.schema';
import {
  ProductCategoryEntity,
  ProductCategorySchema,
} from './schemas/product-category.schema';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { AdminProductsController } from './admin-products.controller';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: ProductCategoryEntity.name, schema: ProductCategorySchema },
    ]),
  ],
  controllers: [ProductsController, AdminProductsController],
  providers: [ProductsService, RolesGuard],
  exports: [ProductsService],
})
export class ProductsModule {}
