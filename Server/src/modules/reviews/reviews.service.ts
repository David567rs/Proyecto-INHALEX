import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  CustomerNotificationSeverity,
  CustomerNotificationType,
} from '../notifications/schemas/customer-notification.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { UsersService } from '../users/users.service';
import { CreateProductReviewDto } from './dto/create-product-review.dto';
import { ListProductReviewsQueryDto } from './dto/list-product-reviews-query.dto';
import {
  ProductReview,
  ProductReviewDocument,
  ProductReviewStatus,
} from './schemas/product-review.schema';

export interface ProductReviewResponse {
  id: string;
  userName: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string;
  orderId: string;
  orderReference: string;
  rating: number;
  comment: string;
  status: ProductReviewStatus;
  createdAt?: string;
}

export interface ReviewableProductResponse {
  orderId: string;
  orderReference: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string;
  presentation: string;
  purchasedAt?: string;
  review?: ProductReviewResponse;
}

export interface ReviewableProductsResponse {
  pending: ReviewableProductResponse[];
  completed: ReviewableProductResponse[];
}

export interface ProductReviewsPageResponse {
  items: PublicProductReviewResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  averageRating: number | null;
}

export interface PublicProductReviewResponse {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt?: string;
}

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(ProductReview.name)
    private readonly productReviewModel: Model<ProductReviewDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listReviewableProducts(
    user: JwtPayload,
  ): Promise<ReviewableProductsResponse> {
    const orders = await this.orderModel
      .find({
        ...this.buildOrderUserFilters(user),
        status: OrderStatus.COMPLETED,
      })
      .sort({ completedAt: -1, createdAt: -1 })
      .limit(30)
      .exec();

    const acquiredByProduct = new Map<string, ReviewableProductResponse>();

    for (const order of orders) {
      for (const item of order.items) {
        if (acquiredByProduct.has(item.productId)) {
          continue;
        }

        acquiredByProduct.set(item.productId, {
          orderId: order.id,
          orderReference: order.reference,
          productId: item.productId,
          productName: item.productName,
          productSlug: item.productSlug,
          productImage: item.image,
          presentation: item.presentation,
          purchasedAt:
            order.completedAt?.toISOString() ?? order.createdAt?.toISOString(),
        });
      }
    }

    const productIds = Array.from(acquiredByProduct.keys());
    if (!productIds.length) {
      return { pending: [], completed: [] };
    }

    const reviews = await this.productReviewModel
      .find({
        productId: { $in: productIds },
        $or: [
          { userId: user.sub },
          { userEmail: user.email.trim().toLowerCase() },
        ],
      })
      .sort({ createdAt: -1 })
      .exec();

    const reviewByProduct = new Map(
      reviews.map((review) => [review.productId, this.mapReview(review)]),
    );

    const pending: ReviewableProductResponse[] = [];
    const completed: ReviewableProductResponse[] = [];

    for (const item of acquiredByProduct.values()) {
      const review = reviewByProduct.get(item.productId);
      if (review) {
        completed.push({ ...item, review });
      } else {
        pending.push(item);
      }
    }

    return { pending, completed };
  }

  async createReview(
    user: JwtPayload,
    createProductReviewDto: CreateProductReviewDto,
  ): Promise<ProductReviewResponse> {
    if (!Types.ObjectId.isValid(createProductReviewDto.productId)) {
      throw new BadRequestException('Invalid product id');
    }

    const existingReview = await this.productReviewModel
      .findOne({
        userId: user.sub,
        productId: createProductReviewDto.productId,
      })
      .select('_id')
      .exec();

    if (existingReview) {
      throw new ConflictException('Ya calificaste este producto.');
    }

    const orderFilters: Record<string, unknown> = {
      ...this.buildOrderUserFilters(user),
      status: OrderStatus.COMPLETED,
      'items.productId': createProductReviewDto.productId,
    };

    if (createProductReviewDto.orderId) {
      orderFilters._id = createProductReviewDto.orderId;
    }

    const order = await this.orderModel
      .findOne(orderFilters)
      .sort({ completedAt: -1, createdAt: -1 })
      .exec();

    if (!order) {
      throw new BadRequestException(
        'Solo puedes calificar articulos de pedidos completados.',
      );
    }

    const item = order.items.find(
      (orderItem) => orderItem.productId === createProductReviewDto.productId,
    );
    if (!item) {
      throw new BadRequestException('El producto no pertenece a este pedido.');
    }

    const userName = await this.resolveUserName(user);
    const review = await this.productReviewModel.create({
      userId: user.sub,
      userEmail: user.email.trim().toLowerCase(),
      userName,
      orderId: order.id,
      orderReference: order.reference,
      productId: item.productId,
      productName: item.productName,
      productSlug: item.productSlug,
      productImage: item.image,
      rating: createProductReviewDto.rating,
      comment: createProductReviewDto.comment.trim(),
      status: ProductReviewStatus.PUBLISHED,
    });

    await Promise.all([
      this.refreshProductRating(item.productId),
      this.notificationsService.createForUser({
        userId: user.sub,
        userEmail: user.email,
        title: 'Gracias por tu reseña',
        message: `${item.productName} ya tiene tu calificación publicada.`,
        type: CustomerNotificationType.REVIEW,
        severity: CustomerNotificationSeverity.SUCCESS,
        metadata: {
          productId: item.productId,
          reviewId: review.id,
        },
      }),
    ]);

    return this.mapReview(review);
  }

  async listProductReviews(
    productId: string,
    query: ListProductReviewsQueryDto = {},
  ): Promise<ProductReviewsPageResponse> {
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestException('Invalid product id');
    }

    const page = Math.max(1, Math.trunc(Number(query.page) || 1));
    const limit = Math.max(
      1,
      Math.min(20, Math.trunc(Number(query.limit) || 8)),
    );
    const skip = (page - 1) * limit;
    const filters = {
      productId,
      status: ProductReviewStatus.PUBLISHED,
    };

    const [reviews, total, ratingSummary] = await Promise.all([
      this.productReviewModel
        .find(filters)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.productReviewModel.countDocuments(filters).exec(),
      this.productReviewModel
        .aggregate<{ _id: null; averageRating: number }>([
          { $match: filters },
          {
            $group: {
              _id: null,
              averageRating: { $avg: '$rating' },
            },
          },
        ])
        .exec(),
    ]);

    return {
      items: reviews.map((review) => this.mapPublicReview(review)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      averageRating: ratingSummary[0]
        ? Number(ratingSummary[0].averageRating.toFixed(1))
        : null,
    };
  }

  private async refreshProductRating(productId: string): Promise<void> {
    const [summary] = await this.productReviewModel.aggregate<{
      _id: string;
      average: number;
      count: number;
    }>([
      {
        $match: {
          productId,
          status: ProductReviewStatus.PUBLISHED,
        },
      },
      {
        $group: {
          _id: '$productId',
          average: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]);

    if (!summary) {
      return;
    }

    await this.productModel
      .findByIdAndUpdate(productId, {
        $set: {
          rating: Number(summary.average.toFixed(1)),
          reviews: summary.count,
        },
      })
      .exec();
  }

  private buildOrderUserFilters(user: JwtPayload) {
    const email = user.email.trim().toLowerCase();
    return {
      $or: [
        { customerUserId: user.sub },
        { customerUserEmail: email },
        { 'customer.email': email },
      ],
    };
  }

  private async resolveUserName(user: JwtPayload): Promise<string> {
    const storedUser = await this.usersService.findById(user.sub);
    return storedUser?.name?.trim() || user.email.split('@')[0] || 'Cliente';
  }

  private mapReview(review: ProductReviewDocument): ProductReviewResponse {
    return {
      id: review.id,
      userName: review.userName,
      productId: review.productId,
      productName: review.productName,
      productSlug: review.productSlug,
      productImage: review.productImage,
      orderId: review.orderId,
      orderReference: review.orderReference,
      rating: review.rating,
      comment: review.comment,
      status: review.status,
      createdAt: review.createdAt?.toISOString(),
    };
  }

  private mapPublicReview(
    review: ProductReviewDocument,
  ): PublicProductReviewResponse {
    return {
      id: review.id,
      userName: review.userName,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt?.toISOString(),
    };
  }
}
