import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { ProductStatus } from '../products/enums/product-status.enum';
import { User, UserCartItem, UserDocument } from './schemas/user.schema';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { ReplaceCartDto } from './dto/replace-cart.dto';

export interface CartResponseItem {
  productId: string;
  quantity: number;
  subtotal: number;
  product: Record<string, unknown>;
}

export interface CartResponse {
  items: CartResponseItem[];
  totalItems: number;
  subtotal: number;
  currency: string;
}

@Injectable()
export class CartService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async list(userId: string): Promise<CartResponse> {
    const user = await this.findUserWithCart(userId);
    return this.buildCartResponse(user.cartItems ?? []);
  }

  async add(userId: string, input: AddCartItemDto): Promise<CartResponse> {
    const product = await this.resolveProduct(input);
    const quantity = this.normalizeQuantity(input.quantity ?? 1);
    const user = await this.findUserWithCart(userId);
    const cartItems = this.normalizeCartItems(user.cartItems ?? []);
    const productId = product._id as Types.ObjectId;
    const existingIndex = cartItems.findIndex(
      (item) => item.productId.toString() === productId.toString(),
    );

    if (existingIndex >= 0) {
      cartItems[existingIndex] = {
        productId,
        quantity: Math.min(25, cartItems[existingIndex].quantity + quantity),
      };
    } else {
      cartItems.push({ productId, quantity });
    }

    const updatedUser = await this.updateCartItems(userId, cartItems);
    return this.buildCartResponse(updatedUser.cartItems ?? []);
  }

  async replace(userId: string, input: ReplaceCartDto): Promise<CartResponse> {
    const resolvedItems: UserCartItem[] = [];

    for (const item of input.items ?? []) {
      const product = await this.resolveProduct({ productId: item.productId });
      const productId = product._id as Types.ObjectId;
      const existingIndex = resolvedItems.findIndex(
        (candidate) => candidate.productId.toString() === productId.toString(),
      );
      const quantity = this.normalizeQuantity(item.quantity);

      if (existingIndex >= 0) {
        resolvedItems[existingIndex] = {
          productId,
          quantity: Math.max(resolvedItems[existingIndex].quantity, quantity),
        };
      } else {
        resolvedItems.push({ productId, quantity });
      }
    }

    const updatedUser = await this.updateCartItems(userId, resolvedItems);
    return this.buildCartResponse(updatedUser.cartItems ?? []);
  }

  async updateQuantity(
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<CartResponse> {
    this.assertValidProductId(productId);
    const user = await this.findUserWithCart(userId);
    const cartItems = this.normalizeCartItems(user.cartItems ?? []);
    const existingIndex = cartItems.findIndex(
      (item) => item.productId.toString() === productId,
    );

    if (existingIndex < 0) {
      throw new NotFoundException('Product not found in cart');
    }

    cartItems[existingIndex] = {
      productId: new Types.ObjectId(productId),
      quantity: this.normalizeQuantity(quantity),
    };

    const updatedUser = await this.updateCartItems(userId, cartItems);
    return this.buildCartResponse(updatedUser.cartItems ?? []);
  }

  async remove(userId: string, productId: string): Promise<CartResponse> {
    this.assertValidProductId(productId);
    const user = await this.findUserWithCart(userId);
    const cartItems = this.normalizeCartItems(user.cartItems ?? []).filter(
      (item) => item.productId.toString() !== productId,
    );
    const updatedUser = await this.updateCartItems(userId, cartItems);
    return this.buildCartResponse(updatedUser.cartItems ?? []);
  }

  async clear(userId: string): Promise<CartResponse> {
    const updatedUser = await this.updateCartItems(userId, []);
    return this.buildCartResponse(updatedUser.cartItems ?? []);
  }

  private async findUserWithCart(userId: string): Promise<UserDocument> {
    const user = await this.userModel
      .findById(userId)
      .select('+cartItems')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async updateCartItems(
    userId: string,
    cartItems: UserCartItem[],
  ): Promise<UserDocument> {
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        { $set: { cartItems } },
        {
          returnDocument: 'after',
          runValidators: true,
        },
      )
      .select('+cartItems')
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return updatedUser;
  }

  private async resolveProduct(input: AddCartItemDto): Promise<ProductDocument> {
    const productReference = String(
      input.productId ||
        input.productSlug ||
        input.slug ||
        this.extractEmbeddedProductReference(input.product) ||
        '',
    ).trim();

    if (!productReference) {
      throw new BadRequestException('Product id is required');
    }

    const product = await this.productModel
      .findOne({
        ...(Types.ObjectId.isValid(productReference)
          ? { _id: productReference }
          : { slug: productReference.toLowerCase() }),
        status: ProductStatus.ACTIVE,
      })
      .exec();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  private extractEmbeddedProductReference(product: unknown): string {
    if (!product || typeof product !== 'object') {
      return '';
    }

    const embeddedProduct = product as {
      id?: unknown;
      _id?: unknown;
      slug?: unknown;
    };

    return String(
      embeddedProduct.id || embeddedProduct._id || embeddedProduct.slug || '',
    );
  }

  private async buildCartResponse(
    cartItems: UserCartItem[],
  ): Promise<CartResponse> {
    const normalizedItems = this.normalizeCartItems(cartItems);
    const productIds = normalizedItems.map((item) => item.productId);

    if (productIds.length === 0) {
      return {
        items: [],
        totalItems: 0,
        subtotal: 0,
        currency: 'MXN',
      };
    }

    const products = await this.productModel
      .find({
        _id: { $in: productIds },
        status: ProductStatus.ACTIVE,
      })
      .exec();
    const productsById = new Map(
      products.map((product) => [product.id, product]),
    );
    const items: CartResponseItem[] = [];

    for (const item of normalizedItems) {
      const product = productsById.get(item.productId.toString());
      if (!product) continue;

      const unitPrice = this.getDisplayPrice(product);
      items.push({
        productId: product.id,
        quantity: item.quantity,
        subtotal: unitPrice * item.quantity,
        product: product.toObject() as unknown as Record<string, unknown>,
      });
    }

    return {
      items,
      totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: items.reduce((sum, item) => sum + item.subtotal, 0),
      currency: items[0]?.product.currency as string || 'MXN',
    };
  }

  private getDisplayPrice(product: ProductDocument): number {
    const promoPrice = Number(product.promoPrice);
    const price = Number(product.price || 0);

    if (
      product.promoActive &&
      Number.isFinite(promoPrice) &&
      promoPrice > 0 &&
      promoPrice < price
    ) {
      return promoPrice;
    }

    return price;
  }

  private normalizeCartItems(cartItems: UserCartItem[]): UserCartItem[] {
    return cartItems
      .filter((item) => item?.productId && item.quantity > 0)
      .map((item) => ({
        productId: new Types.ObjectId(item.productId.toString()),
        quantity: this.normalizeQuantity(item.quantity),
      }));
  }

  private normalizeQuantity(quantity: number): number {
    const parsedQuantity = Number(quantity);

    if (!Number.isFinite(parsedQuantity)) {
      return 1;
    }

    return Math.max(1, Math.min(25, Math.floor(parsedQuantity)));
  }

  private assertValidProductId(productId: string): void {
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestException('Invalid product id');
    }
  }
}
