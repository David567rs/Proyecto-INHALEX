import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { ReplaceCartDto } from './dto/replace-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartService } from './cart.service';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.cartService.list(request.user.sub);
  }

  @Post()
  add(@Req() request: AuthenticatedRequest, @Body() dto: AddCartItemDto) {
    return this.cartService.add(request.user.sub, dto);
  }

  @Put()
  replace(@Req() request: AuthenticatedRequest, @Body() dto: ReplaceCartDto) {
    return this.cartService.replace(request.user.sub, dto);
  }

  @Patch(':productId')
  updateQuantity(
    @Req() request: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateQuantity(
      request.user.sub,
      productId,
      dto.quantity,
    );
  }

  @Delete(':productId')
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('productId') productId: string,
  ) {
    return this.cartService.remove(request.user.sub, productId);
  }

  @Delete()
  clear(@Req() request: AuthenticatedRequest) {
    return this.cartService.clear(request.user.sub);
  }
}
