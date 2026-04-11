import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import {
  ProductInventoryMovement,
  ProductInventoryMovementSchema,
} from '../products/schemas/product-inventory-movement.schema';
import { UsersModule } from '../users/users.module';
import { SalesModule } from '../sales/sales.module';
import { AdminOrdersController } from './admin-orders.controller';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order, OrderSchema } from './schemas/order.schema';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    SalesModule,
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      {
        name: ProductInventoryMovement.name,
        schema: ProductInventoryMovementSchema,
      },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
