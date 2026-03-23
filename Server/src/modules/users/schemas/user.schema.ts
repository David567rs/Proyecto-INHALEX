import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';

export type UserDocument = HydratedDocument<User>;

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
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.set('toJSON', {
  transform: (_doc, ret: Partial<User>) => {
    delete ret.passwordHash;
    return ret;
  },
});
