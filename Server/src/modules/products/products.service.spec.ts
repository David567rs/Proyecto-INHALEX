import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import type { OrderDocument } from '../orders/schemas/order.schema';
import { ProductsService } from './products.service';
import { ProductStatus } from './enums/product-status.enum';
import type { ProductDocument } from './schemas/product.schema';
import type { ProductCategoryDocument } from './schemas/product-category.schema';
import type { ProductInventoryMovementDocument } from './schemas/product-inventory-movement.schema';

type ModelMethodMock = jest.Mock<unknown, unknown[]>;

interface OrderModelMock {
  exists: ModelMethodMock;
}

interface ProductModelMock {
  find: ModelMethodMock;
  countDocuments: ModelMethodMock;
  findById: ModelMethodMock;
  findByIdAndUpdate: ModelMethodMock;
  findOne: ModelMethodMock;
}

function execResult<T>(value: T) {
  return {
    exec: jest.fn<Promise<T>, []>().mockResolvedValue(value),
  };
}

function catalogDocument() {
  return {
    _id: new Types.ObjectId('507f1f77bcf86cd799439024'),
    name: 'Lavanda',
    slug: 'lavanda',
    description: 'Aroma floral para tu rutina.',
    longDescription: 'Una mezcla de aroma floral.',
    price: 160,
    promoActive: true,
    promoLabel: 'Especial',
    promoDescription: 'Precio especial por temporada.',
    promoPrice: 140,
    promoEndsAt: new Date('2026-12-01T00:00:00.000Z'),
    currency: 'MXN',
    image: '/images/lavanda.png',
    category: 'relajacion',
    benefits: ['Relajacion'],
    aromas: ['Lavanda'],
    presentation: '10ml',
    origin: '100% Natural',
    inStock: true,
    stockAvailable: 12,
    allowBackorder: false,
    rating: 4.8,
    reviews: 8,
    sortOrder: 1,
    rawMaterialName: 'Aceite interno',
    rawMaterialInitialStockMl: 500,
    rawMaterialConsumptionPerBatchMl: 80,
    rawMaterialBatchYieldUnits: 20,
    stockReserved: 4,
    stockMin: 6,
    status: ProductStatus.ACTIVE,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-02-01T00:00:00.000Z'),
    // Simulates a future schema field: it must not become public by default.
    supplierCost: 55,
  };
}

describe('ProductsService', () => {
  let service: ProductsService;
  let orderModel: OrderModelMock;
  let productModel: ProductModelMock;

  beforeEach(() => {
    orderModel = {
      exists: jest.fn<unknown, unknown[]>(),
    };

    productModel = {
      find: jest.fn<unknown, unknown[]>(),
      countDocuments: jest.fn<unknown, unknown[]>(),
      findById: jest.fn<unknown, unknown[]>(),
      findByIdAndUpdate: jest.fn<unknown, unknown[]>(),
      findOne: jest.fn<unknown, unknown[]>(),
    };

    service = new ProductsService(
      orderModel as unknown as Model<OrderDocument>,
      productModel as unknown as Model<ProductDocument>,
      {
        findOne: jest.fn(),
        find: jest.fn(),
        aggregate: jest.fn(),
      } as unknown as Model<ProductCategoryDocument>,
      {
        create: jest.fn(),
      } as unknown as Model<ProductInventoryMovementDocument>,
    );
  });

  it('entrega solo campos publicos en el listado y fuerza productos activos', async () => {
    const product = catalogDocument();
    const catalogQuery = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([product]),
    };
    productModel.find.mockReturnValue(catalogQuery);
    productModel.countDocuments.mockReturnValue(execResult(1));

    const result = await service.listPublic({
      page: 2,
      limit: 1,
      status: ProductStatus.DRAFT,
    });

    expect(productModel.find).toHaveBeenCalledWith({
      status: ProductStatus.ACTIVE,
    });
    expect(productModel.countDocuments).toHaveBeenCalledWith({
      status: ProductStatus.ACTIVE,
    });
    expect(catalogQuery.skip).toHaveBeenCalledWith(1);
    expect(result).toEqual({
      total: 1,
      page: 2,
      limit: 1,
      totalPages: 1,
      items: [
        {
          _id: product._id.toString(),
          name: product.name,
          slug: product.slug,
          description: product.description,
          longDescription: product.longDescription,
          price: product.price,
          promoActive: product.promoActive,
          promoLabel: product.promoLabel,
          promoDescription: product.promoDescription,
          promoPrice: product.promoPrice,
          promoEndsAt: '2026-12-01T00:00:00.000Z',
          currency: product.currency,
          image: product.image,
          category: product.category,
          benefits: product.benefits,
          aromas: product.aromas,
          presentation: product.presentation,
          origin: product.origin,
          inStock: product.inStock,
          stockAvailable: product.stockAvailable,
          allowBackorder: product.allowBackorder,
          rating: product.rating,
          reviews: product.reviews,
          sortOrder: product.sortOrder,
        },
      ],
    });
    expect(result.items[0]).not.toBe(product);
    expect(product.rawMaterialName).toBe('Aceite interno');
  });

  it.each(['lavanda', '507f1f77bcf86cd799439024'])(
    'excluye campos internos de la ficha publica consultada por %s',
    async (idOrSlug) => {
      const product = catalogDocument();
      productModel.findOne.mockReturnValue(execResult(product));

      const result = await service.findOnePublic(idOrSlug);

      expect(productModel.findOne).toHaveBeenCalledWith({
        status: ProductStatus.ACTIVE,
        ...(idOrSlug === 'lavanda' ? { slug: idOrSlug } : { _id: idOrSlug }),
      });
      expect(result._id).toBe(product._id.toString());
      expect(result.stockAvailable).toBe(12);
      expect(result.promoEndsAt).toBe('2026-12-01T00:00:00.000Z');
      for (const field of [
        'rawMaterialName',
        'rawMaterialInitialStockMl',
        'rawMaterialConsumptionPerBatchMl',
        'rawMaterialBatchYieldUnits',
        'stockReserved',
        'stockMin',
        'status',
        'createdAt',
        'updatedAt',
        'supplierCost',
      ]) {
        expect(result).not.toHaveProperty(field);
      }
    },
  );

  it('conserva el contrato privado completo para administracion', async () => {
    const product = catalogDocument();
    productModel.findOne.mockReturnValue(execResult(product));

    expect(await service.findOneAdmin('lavanda')).toBe(product);
    expect(productModel.findOne).toHaveBeenCalledWith({ slug: 'lavanda' });
  });

  it('devuelve 404 cuando la ficha publica no existe', async () => {
    productModel.findOne.mockReturnValue(execResult(null));

    await expect(service.findOnePublic('inexistente')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('mantiene el slug actual cuando solo cambia el nombre', async () => {
    const existingProduct = {
      id: '507f1f77bcf86cd799439021',
      slug: 'toronjil',
      status: ProductStatus.ACTIVE,
      stockReserved: 0,
    };

    productModel.findById.mockReturnValue(execResult(existingProduct));
    productModel.findByIdAndUpdate.mockReturnValue(
      execResult({ ...existingProduct, name: 'Toronjil Premium' }),
    );

    await service.update(existingProduct.id, { name: 'Toronjil Premium' });

    expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
      existingProduct.id,
      expect.objectContaining({
        name: 'Toronjil Premium',
        slug: 'toronjil',
      }),
      expect.any(Object),
    );
  });

  it('bloquea archivar productos con stock reservado', async () => {
    const existingProduct = {
      id: '507f1f77bcf86cd799439022',
      slug: 'mirra-y-azafran',
      name: 'Mirra y Azafran',
      status: ProductStatus.ACTIVE,
      stockReserved: 2,
    };

    productModel.findById.mockReturnValue(execResult(existingProduct));

    await expect(
      service.update(existingProduct.id, { status: ProductStatus.ARCHIVED }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(orderModel.exists).not.toHaveBeenCalled();
  });

  it('bloquea archivar productos que aun aparecen en pedidos abiertos', async () => {
    const existingProduct = {
      id: '507f1f77bcf86cd799439023',
      slug: 'copal',
      name: 'Copal',
      status: ProductStatus.ACTIVE,
      stockReserved: 0,
    };

    productModel.findById.mockReturnValue(execResult(existingProduct));
    orderModel.exists.mockReturnValue(execResult({ _id: 'open-order' }));

    await expect(
      service.update(existingProduct.id, { status: ProductStatus.ARCHIVED }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
