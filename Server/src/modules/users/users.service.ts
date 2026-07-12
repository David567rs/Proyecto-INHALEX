import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ShippingAddressResponse,
  UserDocument,
  User,
} from './schemas/user.schema';
import { UserRole } from './enums/user-role.enum';
import { UserStatus } from './enums/user-status.enum';

interface CreateUserInput {
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  passwordHash: string;
  role?: UserRole;
  status?: UserStatus;
  lastLoginAt?: Date;
  lastSeenAt?: Date;
}

interface UpdateUserInput {
  role?: UserRole;
  status?: UserStatus;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async create(input: CreateUserInput): Promise<UserDocument> {
    const user = new this.userModel({
      ...input,
      name: input.name.trim().replace(/\s+/g, ' '),
      firstName: input.firstName.trim().replace(/\s+/g, ' '),
      lastName: input.lastName.trim().replace(/\s+/g, ' '),
      email: input.email.toLowerCase().trim(),
      phone: input.phone.trim(),
    });

    return user.save();
  }

  async findByEmail(
    email: string,
    includePassword = false,
  ): Promise<UserDocument | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const query = this.userModel.findOne({ email: normalizedEmail });

    if (includePassword) {
      query.select('+passwordHash');
    }

    return query.exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async storeAlexaLinkCode(
    userId: string,
    codeHash: string,
    expiresAt: Date,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(
        userId,
        {
          $set: {
            alexaLinkCodeHash: codeHash,
            alexaLinkCodeExpiresAt: expiresAt,
          },
        },
        {
          returnDocument: 'after',
        },
      )
      .exec();
  }

  async findByAlexaLinkCodeHash(
    codeHash: string,
    now = new Date(),
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({
        alexaLinkCodeHash: codeHash,
        alexaLinkCodeExpiresAt: { $gt: now },
        status: UserStatus.ACTIVE,
      })
      .exec();
  }

  async findByAlexaUserIdHash(
    alexaUserIdHash: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({
        alexaUserIdHash,
        status: UserStatus.ACTIVE,
      })
      .exec();
  }

  async clearAlexaLinkCode(
    userId: string,
    markLinked = false,
    alexaUserIdHash?: string,
  ): Promise<UserDocument | null> {
    const update: Record<string, unknown> = {
      $unset: {
        alexaLinkCodeHash: '',
        alexaLinkCodeExpiresAt: '',
      },
    };

    if (markLinked) {
      update.$set = {
        alexaLinkedAt: new Date(),
        ...(alexaUserIdHash ? { alexaUserIdHash } : {}),
      };
    }

    if (alexaUserIdHash) {
      await this.userModel
        .updateMany(
          {
            _id: {
              $ne: Types.ObjectId.isValid(userId)
                ? new Types.ObjectId(userId)
                : userId,
            },
            alexaUserIdHash,
          },
          {
            $unset: {
              alexaUserIdHash: '',
            },
          },
        )
        .exec();
    }

    return this.userModel
      .findByIdAndUpdate(userId, update, {
        returnDocument: 'after',
      })
      .exec();
  }

  async unlinkAlexaAccount(userId: string): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(
        userId,
        {
          $unset: {
            alexaLinkCodeHash: '',
            alexaLinkCodeExpiresAt: '',
            alexaUserIdHash: '',
            alexaLinkedAt: '',
          },
        },
        {
          returnDocument: 'after',
        },
      )
      .exec();
  }

  async listAll(): Promise<UserDocument[]> {
    return this.userModel.find().sort({ createdAt: -1 }).exec();
  }

  async updateById(
    id: string,
    input: UpdateUserInput,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(id, input, {
        returnDocument: 'after',
        runValidators: true,
      })
      .exec();
  }

  async markLogin(userId: string): Promise<UserDocument | null> {
    const now = new Date();
    return this.userModel
      .findByIdAndUpdate(
        userId,
        {
          $set: {
            lastLoginAt: now,
            lastSeenAt: now,
          },
        },
        {
          returnDocument: 'after',
        },
      )
      .exec();
  }

  async markActivity(userId: string): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(
        userId,
        {
          $set: {
            lastSeenAt: new Date(),
          },
        },
        {
          returnDocument: 'after',
        },
      )
      .exec();
  }

  async findShippingAddressById(
    userId: string,
    addressId: string,
  ): Promise<ShippingAddressResponse | null> {
    if (!Types.ObjectId.isValid(addressId)) {
      return null;
    }

    const user = await this.userModel
      .findById(userId)
      .select('+shippingAddresses')
      .exec();
    const address = user?.shippingAddresses?.find(
      (candidate) => candidate._id.toString() === addressId,
    );

    if (!address) {
      return null;
    }

    return {
      id: address._id.toString(),
      label: address.label,
      recipientName: address.recipientName,
      phone: address.phone,
      street: address.street,
      exteriorNumber: address.exteriorNumber,
      interiorNumber: address.interiorNumber,
      neighborhood: address.neighborhood,
      municipality: address.municipality,
      state: address.state,
      postalCode: address.postalCode,
      references: address.references,
      isDefault: address.isDefault,
    };
  }
}
