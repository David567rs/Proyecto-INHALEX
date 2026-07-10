import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { FavoritesService } from './favorites.service';

function execResult<T>(value: T) {
  return {
    exec: jest.fn().mockResolvedValue(value),
  };
}

function selectResult<T>(value: T) {
  return {
    select: jest.fn().mockReturnValue(execResult(value)),
  };
}

describe('FavoritesService', () => {
  let service: FavoritesService;
  let userModel: any;
  let productModel: any;

  beforeEach(() => {
    userModel = {
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };
    productModel = {
      find: jest.fn(),
      findOne: jest.fn(),
    };
    service = new FavoritesService(userModel, productModel);
  });

  it('devuelve productos activos respetando el orden guardado', async () => {
    const firstProductId = new Types.ObjectId();
    const secondProductId = new Types.ObjectId();
    userModel.findById.mockReturnValue(
      selectResult({
        favoriteProductIds: [secondProductId, firstProductId],
      }),
    );
    productModel.find.mockReturnValue(
      execResult([
        { id: firstProductId.toString(), name: 'Toronjil' },
        { id: secondProductId.toString(), name: 'Lavanda' },
      ]),
    );

    const products = await service.list(new Types.ObjectId().toString());

    expect(products.map((product) => product.name)).toEqual([
      'Lavanda',
      'Toronjil',
    ]);
  });

  it('guarda un favorito de forma idempotente', async () => {
    const productId = new Types.ObjectId();
    productModel.findOne.mockReturnValue(selectResult({ _id: productId }));
    userModel.findByIdAndUpdate.mockReturnValue(execResult({ id: 'user-id' }));

    await expect(
      service.add(new Types.ObjectId().toString(), productId.toString()),
    ).resolves.toEqual({ productId: productId.toString() });

    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
      expect.any(String),
      {
        $addToSet: { favoriteProductIds: productId },
      },
    );
  });

  it('acepta referencias fallback de Alexa resolviendolas por slug', async () => {
    const productId = new Types.ObjectId();
    productModel.findOne.mockReturnValue(selectResult({ _id: productId }));
    userModel.findByIdAndUpdate.mockReturnValue(execResult({ id: 'user-id' }));

    await expect(
      service.add(new Types.ObjectId().toString(), 'fallback-lavanda'),
    ).resolves.toEqual({ productId: productId.toString() });

    expect(productModel.findOne).toHaveBeenCalledWith({
      slug: 'lavanda',
      status: expect.any(String),
    });
  });

  it('rechaza identificadores de producto invalidos', async () => {
    await expect(
      service.remove(new Types.ObjectId().toString(), 'invalid-product-id'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
