import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { FavoritesService } from './favorites.service';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.favoritesService.list(request.user.sub);
  }

  @Put(':productId')
  add(
    @Req() request: AuthenticatedRequest,
    @Param('productId') productId: string,
  ) {
    return this.favoritesService.add(request.user.sub, productId);
  }

  @Post()
  addFromBody(
    @Req() request: AuthenticatedRequest,
    @Body() body: Record<string, unknown>,
  ) {
    return this.favoritesService.add(
      request.user.sub,
      this.resolveProductReference(body),
    );
  }

  @Delete(':productId')
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('productId') productId: string,
  ) {
    return this.favoritesService.remove(request.user.sub, productId);
  }

  private resolveProductReference(body: Record<string, unknown>): string {
    const product =
      body.product && typeof body.product === 'object'
        ? (body.product as Record<string, unknown>)
        : {};
    const productId = String(body.productId || product.id || product._id || '').trim();
    const productSlug = String(
      body.productSlug || body.slug || product.slug || '',
    ).trim();

    return Types.ObjectId.isValid(productId)
      ? productId
      : productSlug || productId;
  }
}
