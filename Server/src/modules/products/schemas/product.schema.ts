import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ProductStatus } from '../enums/product-status.enum';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true, versionKey: false, collection: 'productos' })
export class Product {
  @Prop({ required: true, trim: true, minlength: 2, maxlength: 120 })
  name: string;

  @Prop({ required: true, unique: true, trim: true, lowercase: true, index: true })
  slug: string;

  @Prop({ required: true, trim: true, minlength: 10, maxlength: 500 })
  description: string;

  @Prop({ trim: true, maxlength: 3000 })
  longDescription?: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, trim: true, uppercase: true, default: 'MXN', maxlength: 5 })
  currency: string;

  @Prop({ required: true, trim: true })
  image: string;

  @Prop({ type: String, required: true, trim: true, lowercase: true, index: true })
  category: string;

  @Prop({ type: [String], default: [] })
  benefits: string[];

  @Prop({ type: [String], default: [] })
  aromas: string[];

  @Prop({ required: true, trim: true, default: '10ml' })
  presentation: string;

  @Prop({ required: true, trim: true, default: '100% Natural' })
  origin: string;

  @Prop({ default: true })
  inStock: boolean;

  @Prop({ type: String, enum: ProductStatus, default: ProductStatus.DRAFT, index: true })
  status: ProductStatus;

  @Prop({ min: 0, max: 5 })
  rating?: number;

  @Prop({ min: 0, default: 0 })
  reviews?: number;

  @Prop({ min: 1, default: 9999, index: true })
  sortOrder?: number;

  createdAt?: Date;

  updatedAt?: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index({
  name: 'text',
  description: 'text',
  longDescription: 'text',
  aromas: 'text',
});
