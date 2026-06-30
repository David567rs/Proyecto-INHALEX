import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProductReviewDocument = HydratedDocument<ProductReview>;

export enum ProductReviewStatus {
  PUBLISHED = 'published',
  HIDDEN = 'hidden',
}

@Schema({
  timestamps: true,
  versionKey: false,
  collection: 'reseñas_producto',
})
export class ProductReview {
  @Prop({ required: true, trim: true, maxlength: 64, index: true })
  userId: string;

  @Prop({ required: true, trim: true, lowercase: true, maxlength: 180 })
  userEmail: string;

  @Prop({ required: true, trim: true, maxlength: 120 })
  userName: string;

  @Prop({ required: true, trim: true, maxlength: 64, index: true })
  orderId: string;

  @Prop({ required: true, trim: true, maxlength: 40 })
  orderReference: string;

  @Prop({ required: true, trim: true, maxlength: 64, index: true })
  productId: string;

  @Prop({ required: true, trim: true, maxlength: 120 })
  productName: string;

  @Prop({ required: true, trim: true, lowercase: true })
  productSlug: string;

  @Prop({ required: true, trim: true })
  productImage: string;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ required: true, trim: true, minlength: 4, maxlength: 700 })
  comment: string;

  @Prop({
    type: String,
    enum: ProductReviewStatus,
    default: ProductReviewStatus.PUBLISHED,
    index: true,
  })
  status: ProductReviewStatus;

  createdAt?: Date;

  updatedAt?: Date;
}

export const ProductReviewSchema = SchemaFactory.createForClass(ProductReview);

ProductReviewSchema.index({ userId: 1, productId: 1 }, { unique: true });
ProductReviewSchema.index({ productId: 1, status: 1, createdAt: -1 });
