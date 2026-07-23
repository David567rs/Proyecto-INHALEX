import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { CreateProductReviewDto } from './dto/create-product-review.dto';
import { ListProductReviewsQueryDto } from './dto/list-product-reviews-query.dto';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('products/:productId')
  listProductReviews(
    @Param('productId') productId: string,
    @Query() query: ListProductReviewsQueryDto,
  ) {
    return this.reviewsService.listProductReviews(productId, query);
  }

  @Get('me/eligible')
  @UseGuards(JwtAuthGuard)
  listReviewableProducts(@Req() request: AuthenticatedRequest) {
    return this.reviewsService.listReviewableProducts(request.user);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  createReview(
    @Req() request: AuthenticatedRequest,
    @Body() createProductReviewDto: CreateProductReviewDto,
  ) {
    return this.reviewsService.createReview(
      request.user,
      createProductReviewDto,
    );
  }
}
