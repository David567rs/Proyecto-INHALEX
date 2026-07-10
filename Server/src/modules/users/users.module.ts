import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { AddressesController } from './addresses.controller';
import { AddressesService } from './addresses.service';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';
import { User, UserSchema } from './schemas/user.schema';
import { UsersService } from './users.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [FavoritesController, AddressesController, CartController],
  providers: [UsersService, FavoritesService, AddressesService, CartService],
  exports: [UsersService],
})
export class UsersModule {}
