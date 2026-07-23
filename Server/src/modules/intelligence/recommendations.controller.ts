import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { BasketRecommendationDto } from './dto/basket-recommendation.dto';
import { RecommendationsService } from './recommendations.service';

@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @Post('basket')
  @HttpCode(HttpStatus.OK)
  recommendForBasket(@Body() dto: BasketRecommendationDto) {
    return this.recommendationsService.recommendForBasket(
      dto.productIds,
      dto.limit,
    );
  }

  @Get('admin/summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getAdminSummary() {
    return this.recommendationsService.getAdminSummary();
  }
}
