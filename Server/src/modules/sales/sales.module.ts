import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SalesAggregateSchema } from './schemas/sales-aggregate.schema';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: 'SalesAggregate', schema: SalesAggregateSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [SalesController],
  providers: [SalesService, RolesGuard],
  exports: [SalesService],
})
export class SalesModule {}
