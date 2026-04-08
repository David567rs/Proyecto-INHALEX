import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { InventoryMovementType } from '../enums/inventory-movement-type.enum';
import { Product } from './product.schema';

export type ProductInventoryMovementDocument =
  HydratedDocument<ProductInventoryMovement>;

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
  collection: 'producto_inventario_movimientos',
})
export class ProductInventoryMovement {
  @Prop({ type: Types.ObjectId, ref: Product.name, required: true, index: true })
  productId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 140 })
  productName: string;

  @Prop({
    type: String,
    enum: InventoryMovementType,
    required: true,
    index: true,
  })
  type: InventoryMovementType;

  @Prop({ required: true, min: 0 })
  quantity: number;

  @Prop({ min: 0 })
  previousAvailable?: number;

  @Prop({ required: true, min: 0 })
  nextAvailable: number;

  @Prop({ required: true, min: 0, default: 0 })
  previousReserved: number;

  @Prop({ required: true, min: 0, default: 0 })
  nextReserved: number;

  @Prop({ trim: true, maxlength: 240 })
  note?: string;

  @Prop({ trim: true, maxlength: 64, index: true })
  orderId?: string;

  @Prop({ trim: true, maxlength: 64, index: true })
  orderReference?: string;

  @Prop({ trim: true, maxlength: 64 })
  actorId?: string;

  @Prop({ trim: true, lowercase: true, maxlength: 180 })
  actorEmail?: string;

  createdAt?: Date;
}

export const ProductInventoryMovementSchema = SchemaFactory.createForClass(
  ProductInventoryMovement,
);

ProductInventoryMovementSchema.index({ productId: 1, createdAt: -1 });
ProductInventoryMovementSchema.index({ orderReference: 1, createdAt: -1 });
