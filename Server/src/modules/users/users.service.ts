import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserDocument, User } from './schemas/user.schema';
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
}
