import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';

export type UserDocument = HydratedDocument<User>;

@Schema({ _id: true, versionKey: false })
export class ShippingAddress {
  _id: Types.ObjectId;

  @Prop({ required: true, trim: true, minlength: 2, maxlength: 40 })
  label: string;

  @Prop({ required: true, trim: true, minlength: 2, maxlength: 120 })
  recipientName: string;

  @Prop({ required: true, trim: true, match: /^\d{10,15}$/ })
  phone: string;

  @Prop({ required: true, trim: true, minlength: 2, maxlength: 120 })
  street: string;

  @Prop({ required: true, trim: true, minlength: 1, maxlength: 20 })
  exteriorNumber: string;

  @Prop({ trim: true, maxlength: 20 })
  interiorNumber?: string;

  @Prop({ required: true, trim: true, minlength: 2, maxlength: 100 })
  neighborhood: string;

  @Prop({ required: true, trim: true, minlength: 2, maxlength: 100 })
  municipality: string;

  @Prop({ required: true, trim: true, minlength: 2, maxlength: 100 })
  state: string;

  @Prop({ required: true, trim: true, match: /^\d{5}$/ })
  postalCode: string;

  @Prop({ trim: true, maxlength: 300 })
  references?: string;

  @Prop({ required: true, default: false })
  isDefault: boolean;
}

export const ShippingAddressSchema = SchemaFactory.createForClass(ShippingAddress);

export interface ShippingAddressResponse {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  street: string;
  exteriorNumber: string;
  interiorNumber?: string;
  neighborhood: string;
  municipality: string;
  state: string;
  postalCode: string;
  references?: string;
  isDefault: boolean;
}

@Schema({ _id: false, versionKey: false })
export class UserCartItem {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Product' })
  productId: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 25, default: 1 })
  quantity: number;
}

export const UserCartItemSchema = SchemaFactory.createForClass(UserCartItem);

@Schema({ timestamps: true, versionKey: false, collection: 'usuarios' })
export class User {
  @Prop({ required: true, trim: true, minlength: 2, maxlength: 100 })
  name: string;

  @Prop({ required: true, trim: true, minlength: 2, maxlength: 50 })
  firstName: string;

  @Prop({ required: true, trim: true, minlength: 2, maxlength: 50 })
  lastName: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email: string;

  @Prop({ required: true, trim: true, match: /^\d{10,15}$/ })
  phone: string;

  @Prop({ required: true, select: false })
  passwordHash: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Prop({ type: String, enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Prop({ index: true })
  lastLoginAt?: Date;

  @Prop({ index: true })
  lastSeenAt?: Date;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'Product' }],
    default: [],
    select: false,
  })
  favoriteProductIds: Types.ObjectId[];

  @Prop({ type: [ShippingAddressSchema], default: [], select: false })
  shippingAddresses: ShippingAddress[];

  @Prop({ type: [UserCartItemSchema], default: [], select: false })
  cartItems: UserCartItem[];

  @Prop({ select: false, index: true, sparse: true })
  alexaLinkCodeHash?: string;

  @Prop({ select: false, index: true })
  alexaLinkCodeExpiresAt?: Date;

  @Prop({ select: false, index: true, sparse: true })
  alexaUserIdHash?: string;

  @Prop()
  alexaLinkedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.set('toJSON', {
  transform: (_doc, ret: Partial<User>) => {
    delete ret.passwordHash;
    delete ret.alexaLinkCodeHash;
    delete ret.alexaLinkCodeExpiresAt;
    delete ret.alexaUserIdHash;
    return ret;
  },
});
