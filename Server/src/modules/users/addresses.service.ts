import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateShippingAddressDto } from './dto/create-shipping-address.dto';
import { UpdateShippingAddressDto } from './dto/update-shipping-address.dto';
import {
  ShippingAddress,
  ShippingAddressResponse,
  User,
  UserDocument,
} from './schemas/user.schema';

const MAX_ADDRESSES = 5;

@Injectable()
export class AddressesService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async list(userId: string): Promise<ShippingAddressResponse[]> {
    const user = await this.findUserWithAddresses(userId);
    return this.mapAddresses(user.shippingAddresses);
  }

  async create(
    userId: string,
    payload: CreateShippingAddressDto,
  ): Promise<ShippingAddressResponse[]> {
    const user = await this.findUserWithAddresses(userId);
    const addresses = user.shippingAddresses ?? [];

    if (addresses.length >= MAX_ADDRESSES) {
      throw new BadRequestException(
        `Solo puedes guardar hasta ${MAX_ADDRESSES} direcciones`,
      );
    }

    const shouldBeDefault = payload.isDefault || addresses.length === 0;
    if (shouldBeDefault) {
      addresses.forEach((address) => {
        address.isDefault = false;
      });
    }

    addresses.push({
      _id: new Types.ObjectId(),
      label: payload.label.trim(),
      recipientName: payload.recipientName.trim(),
      phone: payload.phone.trim(),
      street: payload.street.trim(),
      exteriorNumber: payload.exteriorNumber.trim(),
      interiorNumber: payload.interiorNumber?.trim() || undefined,
      neighborhood: payload.neighborhood.trim(),
      municipality: payload.municipality.trim(),
      state: payload.state.trim(),
      postalCode: payload.postalCode.trim(),
      references: payload.references?.trim() || undefined,
      isDefault: shouldBeDefault,
    });
    user.shippingAddresses = addresses;
    await user.save();

    return this.mapAddresses(user.shippingAddresses);
  }

  async update(
    userId: string,
    addressId: string,
    payload: UpdateShippingAddressDto,
  ): Promise<ShippingAddressResponse[]> {
    this.assertValidAddressId(addressId);
    const user = await this.findUserWithAddresses(userId);
    const addresses = user.shippingAddresses ?? [];
    const address = addresses.find(
      (candidate) => candidate._id.toString() === addressId,
    );

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    const updates = this.normalizeAddress(payload);
    if (Object.keys(updates).length === 0 && payload.isDefault === undefined) {
      throw new BadRequestException('At least one field must be updated');
    }

    Object.assign(address, updates);
    if (payload.isDefault) {
      addresses.forEach((candidate) => {
        candidate.isDefault = candidate._id.toString() === addressId;
      });
    }

    user.shippingAddresses = addresses;
    await user.save();

    return this.mapAddresses(user.shippingAddresses);
  }

  async remove(
    userId: string,
    addressId: string,
  ): Promise<ShippingAddressResponse[]> {
    this.assertValidAddressId(addressId);
    const user = await this.findUserWithAddresses(userId);
    const addresses = user.shippingAddresses ?? [];
    const removedAddress = addresses.find(
      (address) => address._id.toString() === addressId,
    );

    if (!removedAddress) {
      throw new NotFoundException('Address not found');
    }

    const remainingAddresses = addresses.filter(
      (address) => address._id.toString() !== addressId,
    );
    if (
      removedAddress.isDefault &&
      remainingAddresses.length > 0 &&
      !remainingAddresses.some((address) => address.isDefault)
    ) {
      remainingAddresses[0].isDefault = true;
    }

    user.shippingAddresses = remainingAddresses;
    await user.save();

    return this.mapAddresses(user.shippingAddresses);
  }

  private async findUserWithAddresses(userId: string): Promise<UserDocument> {
    const user = await this.userModel
      .findById(userId)
      .select('+shippingAddresses')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private normalizeAddress(
    payload: CreateShippingAddressDto | UpdateShippingAddressDto,
  ): Partial<ShippingAddress> {
    const normalized: Partial<ShippingAddress> = {};
    const fields = [
      'label',
      'recipientName',
      'phone',
      'street',
      'exteriorNumber',
      'interiorNumber',
      'neighborhood',
      'municipality',
      'state',
      'postalCode',
      'references',
    ] as const;

    for (const field of fields) {
      const value = payload[field];
      if (typeof value === 'string') {
        normalized[field] = value.trim();
      }
    }

    return normalized;
  }

  private mapAddresses(
    addresses: ShippingAddress[],
  ): ShippingAddressResponse[] {
    return addresses.map((address) => ({
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
    }));
  }

  private assertValidAddressId(addressId: string): void {
    if (!Types.ObjectId.isValid(addressId)) {
      throw new BadRequestException('Invalid address id');
    }
  }
}
