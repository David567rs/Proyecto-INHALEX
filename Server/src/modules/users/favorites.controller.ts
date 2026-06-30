import {
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
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

  @Delete(':productId')
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('productId') productId: string,
  ) {
    return this.favoritesService.remove(request.user.sub, productId);
  }
}
