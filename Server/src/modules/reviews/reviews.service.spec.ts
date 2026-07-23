import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ProductReviewStatus } from './schemas/product-review.schema';
import { ReviewsService } from './reviews.service';

function buildReview(productId: string, suffix: number) {
  return {
    id: `review-${suffix}`,
    userName: `Cliente ${suffix}`,
    productId,
    productName: 'Lavanda',
    productSlug: 'lavanda',
    productImage: '/lavanda.png',
    orderId: `order-${suffix}`,
    orderReference: `ORD-${suffix}`,
    rating: suffix === 1 ? 5 : 4,
    comment: `Comentario ${suffix}`,
    status: ProductReviewStatus.PUBLISHED,
    createdAt: new Date(`2026-06-0${suffix}T12:00:00.000Z`),
  };
}

describe('ReviewsService pagination', () => {
  let service: ReviewsService;
  let productReviewModel: any;
  let findQuery: any;

  beforeEach(() => {
    findQuery = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    productReviewModel = {
      find: jest.fn().mockReturnValue(findQuery),
      countDocuments: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(38),
      }),
      aggregate: jest.fn().mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue([{ _id: null, averageRating: 4.289 }]),
      }),
    };

    service = new ReviewsService(productReviewModel, {}, {}, {}, {});
  });

  it('devuelve metadatos y el bloque solicitado sin alterar el promedio global', async () => {
    const productId = new Types.ObjectId().toString();
    findQuery.exec.mockResolvedValue([
      buildReview(productId, 1),
      buildReview(productId, 2),
    ]);

    const response = await service.listProductReviews(productId, {
      page: 3,
      limit: 4,
    });

    expect(productReviewModel.find).toHaveBeenCalledWith({
      productId,
      status: ProductReviewStatus.PUBLISHED,
    });
    expect(findQuery.sort).toHaveBeenCalledWith({
      createdAt: -1,
      _id: -1,
    });
    expect(findQuery.skip).toHaveBeenCalledWith(8);
    expect(findQuery.limit).toHaveBeenCalledWith(4);
    expect(response).toEqual(
      expect.objectContaining({
        total: 38,
        page: 3,
        limit: 4,
        totalPages: 10,
        averageRating: 4.3,
      }),
    );
    expect(response.items).toHaveLength(2);
    expect(response.items[0]).not.toHaveProperty('orderId');
    expect(response.items[0]).not.toHaveProperty('orderReference');
    expect(response.items[0]).not.toHaveProperty('productId');
    expect(response.items[0]).not.toHaveProperty('status');
  });

  it('aplica límites seguros incluso si se invoca el servicio directamente', async () => {
    const productId = new Types.ObjectId().toString();
    findQuery.exec.mockResolvedValue([]);

    const response = await service.listProductReviews(productId, {
      page: 0,
      limit: 100,
    });

    expect(findQuery.skip).toHaveBeenCalledWith(0);
    expect(findQuery.limit).toHaveBeenCalledWith(20);
    expect(response.page).toBe(1);
    expect(response.limit).toBe(20);
  });

  it('rechaza identificadores de producto inválidos', async () => {
    await expect(
      service.listProductReviews('producto-invalido', { page: 1, limit: 8 }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(productReviewModel.find).not.toHaveBeenCalled();
  });
});
