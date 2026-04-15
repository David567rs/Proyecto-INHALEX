import { BadRequestException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductStatus } from './enums/product-status.enum';

function execResult<T>(value: T) {
  return {
    exec: jest.fn().mockResolvedValue(value),
  };
}

describe('ProductsService', () => {
  let service: ProductsService;
  let orderModel: any;
  let productModel: any;

  beforeEach(() => {
    orderModel = {
      exists: jest.fn(),
    };

    productModel = {
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findOne: jest.fn(),
    };

    service = new ProductsService(
      orderModel,
      productModel,
      { findOne: jest.fn(), find: jest.fn(), aggregate: jest.fn() } as any,
      { create: jest.fn() } as any,
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
