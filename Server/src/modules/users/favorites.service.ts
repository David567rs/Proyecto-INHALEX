import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { ProductStatus } from '../products/enums/product-status.enum';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async list(userId: string): Promise<ProductDocument[]> {
    const user = await this.userModel
      .findById(userId)
      .select('+favoriteProductIds')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const favoriteProductIds = user.favoriteProductIds ?? [];
    if (favoriteProductIds.length === 0) {
      return [];
    }

    const products = await this.productModel
      .find({
        _id: { $in: favoriteProductIds },
        status: ProductStatus.ACTIVE,
      })
      .exec();
    const productsById = new Map<string, ProductDocument>(
      products.map((product) => [product.id, product as ProductDocument]),
    );
    const orderedProducts: ProductDocument[] = [];

    for (const productId of favoriteProductIds) {
      const product = productsById.get(productId.toString());
      if (product) orderedProducts.push(product);
    }

    return orderedProducts;
  }

  async add(userId: string, productId: string): Promise<{ productId: string }> {
    this.assertValidProductId(productId);

    const product = await this.productModel
      .findOne({
        _id: productId,
        status: ProductStatus.ACTIVE,
      })
      .select('_id')
      .exec();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const user = await this.userModel
      .findByIdAndUpdate(userId, {
        $addToSet: { favoriteProductIds: product._id },
      })
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return { productId };
  }

  async remove(
    userId: string,
    productId: string,
  ): Promise<{ productId: string }> {
    this.assertValidProductId(productId);

    const user = await this.userModel
      .findByIdAndUpdate(userId, {
        $pull: { favoriteProductIds: new Types.ObjectId(productId) },
      })
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return { productId };
  }

  private assertValidProductId(productId: string): void {
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestException('Invalid product id');
    }
  }
}
