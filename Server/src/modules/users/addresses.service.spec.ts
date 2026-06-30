import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AddressesService } from './addresses.service';

function selectResult<T>(value: T) {
  return {
    select: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(value),
    }),
  };
}

function buildAddress(isDefault = false) {
  return {
    _id: new Types.ObjectId(),
    label: 'Casa',
    recipientName: 'Cliente Demo',
    phone: '5555555555',
    street: 'Calle Principal',
    exteriorNumber: '10',
    neighborhood: 'Centro',
    municipality: 'Cuauhtemoc',
    state: 'Ciudad de Mexico',
    postalCode: '06000',
    isDefault,
  };
}

describe('AddressesService', () => {
  let service: AddressesService;
  let userModel: any;

  beforeEach(() => {
    userModel = {
      findById: jest.fn(),
    };
    service = new AddressesService(userModel);
  });

  it('marca la primera direccion como principal', async () => {
    const user = {
      shippingAddresses: [],
      save: jest.fn().mockResolvedValue(undefined),
    };
    userModel.findById.mockReturnValue(selectResult(user));

    const addresses = await service.create(new Types.ObjectId().toString(), {
      label: 'Casa',
      recipientName: 'Cliente Demo',
      phone: '5555555555',
      street: 'Calle Principal',
      exteriorNumber: '10',
      neighborhood: 'Centro',
      municipality: 'Cuauhtemoc',
      state: 'Ciudad de Mexico',
      postalCode: '06000',
    });

    expect(addresses).toHaveLength(1);
    expect(addresses[0].isDefault).toBe(true);
  });

  it('limita la libreta a cinco direcciones', async () => {
    const user = {
      shippingAddresses: Array.from({ length: 5 }, () => buildAddress()),
      save: jest.fn(),
    };
    userModel.findById.mockReturnValue(selectResult(user));

    await expect(
      service.create(new Types.ObjectId().toString(), {
        label: 'Oficina',
        recipientName: 'Cliente Demo',
        phone: '5555555555',
        street: 'Avenida Reforma',
        exteriorNumber: '20',
        neighborhood: 'Juarez',
        municipality: 'Cuauhtemoc',
        state: 'Ciudad de Mexico',
        postalCode: '06600',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('promueve otra direccion al eliminar la principal', async () => {
    const primaryAddress = buildAddress(true);
    const secondaryAddress = buildAddress();
    const user = {
      shippingAddresses: [primaryAddress, secondaryAddress],
      save: jest.fn().mockResolvedValue(undefined),
    };
    userModel.findById.mockReturnValue(selectResult(user));

    const addresses = await service.remove(
      new Types.ObjectId().toString(),
      primaryAddress._id.toString(),
    );

    expect(addresses).toHaveLength(1);
    expect(addresses[0].id).toBe(secondaryAddress._id.toString());
    expect(addresses[0].isDefault).toBe(true);
  });
});
