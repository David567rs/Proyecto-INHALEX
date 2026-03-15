import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProductCategoryDocument = HydratedDocument<ProductCategoryEntity>;

@Schema({
  timestamps: true,
  versionKey: false,
  collection: 'categorias_producto',
})
export class ProductCategoryEntity {
  @Prop({
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true,
  })
  slug: string;

  @Prop({ required: true, trim: true, minlength: 2, maxlength: 100 })
  name: string;

  @Prop({ trim: true, maxlength: 300 })
  description?: string;

  @Prop({ default: true, index: true })
  isActive: boolean;

  @Prop({ min: 1, default: 9999, index: true })
  sortOrder: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ProductCategorySchema =
  SchemaFactory.createForClass(ProductCategoryEntity);

