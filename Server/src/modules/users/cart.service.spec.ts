import { Types } from 'mongoose';
import { CartService } from './cart.service';

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

function buildProduct(id: Types.ObjectId, overrides: Record<string, unknown> = {}) {
  const product = {
    _id: id,
    id: id.toString(),
    name: 'Lavanda',
    slug: 'lavanda',
    price: 60,
    promoActive: false,
    currency: 'MXN',
    toObject: jest.fn(() => ({
      _id: id,
      name: 'Lavanda',
      slug: 'lavanda',
      price: 60,
      currency: 'MXN',
      ...overrides,
    })),
    ...overrides,
  };

  return product;
}

describe('CartService', () => {
  let service: CartService;
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
    service = new CartService(userModel, productModel);
  });

  it('agrega productos al carrito del usuario de forma acumulativa', async () => {
    const userId = new Types.ObjectId().toString();
    const productId = new Types.ObjectId();
    const product = buildProduct(productId);

    productModel.findOne.mockReturnValue(execResult(product));
    userModel.findById.mockReturnValue(selectResult({ cartItems: [] }));
    userModel.findByIdAndUpdate.mockReturnValue(
      selectResult({
        cartItems: [{ productId, quantity: 2 }],
      }),
    );
    productModel.find.mockReturnValue(execResult([product]));

    const response = await service.add(userId, {
      productId: productId.toString(),
      quantity: 2,
    });

    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
      userId,
      {
        $set: {
          cartItems: [{ productId, quantity: 2 }],
        },
      },
      {
        returnDocument: 'after',
        runValidators: true,
      },
    );
    expect(response.totalItems).toBe(2);
    expect(response.subtotal).toBe(120);
    expect(response.items[0].productId).toBe(productId.toString());
  });

  it('reemplaza el carrito eliminando duplicados por producto', async () => {
    const userId = new Types.ObjectId().toString();
    const productId = new Types.ObjectId();
    const product = buildProduct(productId);

    productModel.findOne.mockReturnValue(execResult(product));
    userModel.findByIdAndUpdate.mockReturnValue(
      selectResult({
        cartItems: [{ productId, quantity: 3 }],
      }),
    );
    productModel.find.mockReturnValue(execResult([product]));

    const response = await service.replace(userId, {
      items: [
        { productId: productId.toString(), quantity: 1 },
        { productId: productId.toString(), quantity: 3 },
      ],
    });

    expect(response.totalItems).toBe(3);
    expect(response.items).toHaveLength(1);
  });
});
