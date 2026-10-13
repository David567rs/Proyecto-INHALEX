import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { CustomerOrderHistoryService } from './customer-order-history.service';
import { OrderStatus } from './enums/order-status.enum';
import type { OrderDocument } from './schemas/order.schema';
import { UserRole } from '../users/enums/user-role.enum';

const customer = {
  sub: 'account-a',
  email: 'shared@example.test',
  role: UserRole.USER,
};

function record(number: number, overrides: Record<string, unknown> = {}) {
  return {
    _id: new Types.ObjectId(number.toString(16).padStart(24, '0')),
    reference: `PED-${number}`,
    customerUserId: customer.sub,
    customerUserEmail: customer.email,
    customer: { email: customer.email, notes: 'Private customer notes' },
    status: OrderStatus.PENDING_REVIEW,
    createdAt: new Date('2026-10-13T12:00:00.000Z'),
    currency: 'MXN',
    totalItems: 2,
    subtotal: 120,
    idempotencyKey: 'private-retry-key',
    statusNotes: [{ note: 'Internal admin note' }],
    issues: [{ description: 'Internal stock details' }],
    items: [
      {
        productId: '507f1f77bcf86cd799439012',
        productName: 'Toronjil',
        presentation: '10 ml',
        image: '/toronjil.jpg',
        quantity: 2,
        unitPrice: 60,
        subtotal: 120,
        currency: 'MXN',
        stockAvailable: 99,
        reservedQuantity: 2,
        allowBackorder: true,
      },
    ],
    shippingAddress: {
      sourceAddressId: '507f1f77bcf86cd799439013',
      label: 'Casa',
      recipientName: 'Cliente',
      phone: '5555555555',
      street: 'Calle Uno',
      exteriorNumber: '12',
      interiorNumber: 'A',
      neighborhood: 'Centro',
      municipality: 'Ciudad',
      state: 'Estado',
      postalCode: '12345',
      references: 'Puerta verde',
    },
    ...overrides,
  };
}

type StoredRecord = ReturnType<typeof record>;
type Filter = Record<string, unknown>;
type QueryDouble = {
  select: jest.Mock<QueryDouble, [Record<string, number>]>;
  sort: jest.Mock<QueryDouble, [Record<string, number>]>;
  limit: jest.Mock<QueryDouble, [number]>;
  lean: jest.Mock<QueryDouble, []>;
  exec: jest.Mock<Promise<StoredRecord[] | StoredRecord | null>, []>;
};

// Small read-only model double. It evaluates query filters before returning rows,
// so an ownership or pagination regression cannot pass merely by mocking a result.
function modelDouble(records: StoredRecord[]) {
  const queries: QueryDouble[] = [];
  function scalar(value: unknown): unknown {
    return value instanceof Date
      ? value.getTime()
      : value instanceof Types.ObjectId
        ? value.toHexString()
        : value;
  }
  function matches(entry: StoredRecord, filters: Filter): boolean {
    return Object.entries(filters).every(([key, value]) => {
      if (key === '$or')
        return (value as Filter[]).some((filter) => matches(entry, filter));
      const actual = scalar((entry as Record<string, unknown>)[key]);
      if (
        value &&
        typeof value === 'object' &&
        !(value instanceof Date) &&
        !(value instanceof Types.ObjectId)
      ) {
        const condition = value as Filter;
        if ('$in' in condition)
          return (condition.$in as unknown[]).includes(actual);
        if ('$lt' in condition)
          return (
            (actual as string | number) <
            (scalar(condition.$lt) as string | number)
          );
      }
      return actual === scalar(value);
    });
  }
  function query(filters: Filter, single: boolean): QueryDouble {
    let max = Infinity;
    const chain: QueryDouble = {
      select: jest.fn<QueryDouble, [Record<string, number>]>(() => chain),
      sort: jest.fn<QueryDouble, [Record<string, number>]>(() => chain),
      limit: jest.fn((limit: number) => {
        max = limit;
        return chain;
      }),
      lean: jest.fn(() => chain),
      exec: jest.fn(() => {
        const values = records
          .filter((entry) => matches(entry, filters))
          .sort(
            (a, b) =>
              b.createdAt.getTime() - a.createdAt.getTime() ||
              b._id.toHexString().localeCompare(a._id.toHexString()),
          )
          .slice(0, max);
        return Promise.resolve(single ? (values[0] ?? null) : values);
      }),
    };
    queries.push(chain);
    return chain;
  }
  return {
    queries,
    find: jest.fn((filters: Filter) => query(filters, false)),
    findOne: jest.fn((filters: Filter) => query(filters, true)),
  };
}

function setup(records: StoredRecord[] = []) {
  const model = modelDouble(records);
  const service = new CustomerOrderHistoryService(
    model as unknown as Model<OrderDocument>,
  );
  return { model, service };
}

describe('CustomerOrderHistoryService', () => {
  it('returns only the authenticated account orders in all four published states', async () => {
    const { service, model } = setup([
      record(1),
      record(2, { status: OrderStatus.CONFIRMED }),
      record(3, { status: OrderStatus.COMPLETED }),
      record(4, { status: OrderStatus.CANCELLED }),
      record(5, { status: OrderStatus.DRAFT }),
      record(6, { customerUserId: 'account-b' }),
      record(7, { customerUserId: undefined }),
    ]);
    const response = await service.list(customer);
    expect(response.orders.map((order) => order.reference)).toEqual([
      'PED-4',
      'PED-3',
      'PED-2',
      'PED-1',
    ]);
    expect(response.nextCursor).toBeNull();
    expect(model.find.mock.calls[0][0]).toEqual({
      customerUserId: 'account-a',
      status: {
        $in: [
          OrderStatus.PENDING_REVIEW,
          OrderStatus.CONFIRMED,
          OrderStatus.CANCELLED,
          OrderStatus.COMPLETED,
        ],
      },
    });
  });

  it('paginates tied dates without repeating or dropping rows, even after a new order arrives', async () => {
    const rows = Array.from({ length: 45 }, (_, index) => record(index + 1));
    const { service, model } = setup(rows);
    const first = await service.list(customer);
    expect(first.orders).toHaveLength(20);
    expect(first.orders[0].reference).toBe('PED-45');
    expect(first.orders[19].reference).toBe('PED-26');
    expect(first.nextCursor).toMatch(/^[A-Za-z0-9_-]+$/);
    rows.push(record(46, { createdAt: new Date('2026-10-13T13:00:00.000Z') }));
    const second = await service.list(customer, first.nextCursor);
    const third = await service.list(customer, second.nextCursor);
    expect(second.orders.map((order) => order.reference)).toEqual(
      Array.from({ length: 20 }, (_, i) => `PED-${25 - i}`),
    );
    expect(third.orders.map((order) => order.reference)).toEqual([
      'PED-5',
      'PED-4',
      'PED-3',
      'PED-2',
      'PED-1',
    ]);
    expect(third.nextCursor).toBeNull();
    expect(
      new Set(
        [...first.orders, ...second.orders, ...third.orders].map(
          (order) => order.id,
        ),
      ).size,
    ).toBe(45);
    expect(model.queries[0].sort).toHaveBeenCalledWith({
      createdAt: -1,
      _id: -1,
    });
    expect(model.queries[0].limit).toHaveBeenCalledWith(21);
  });

  it('uses date before id when moving between pages', async () => {
    const rows = Array.from({ length: 20 }, (_, i) => record(i + 1));
    rows.push(record(99, { createdAt: new Date('2026-10-12T12:00:00.000Z') }));
    const { service } = setup(rows);
    const first = await service.list(customer);
    const next = await service.list(customer, first.nextCursor);
    expect(first.orders[19].reference).toBe('PED-1');
    expect(next.orders.map((order) => order.reference)).toEqual(['PED-99']);
  });

  it.each([0, 1, 20])(
    'returns no cursor when the final page has %i records',
    async (size) => {
      const { service } = setup(
        Array.from({ length: size }, (_, i) => record(i + 1)),
      );
      const response = await service.list(customer);
      expect(response.orders).toHaveLength(size);
      expect(response.nextCursor).toBeNull();
    },
  );

  it('keeps a copied cursor isolated to the current account', async () => {
    const rows = Array.from({ length: 21 }, (_, i) => record(i + 1));
    rows.push(record(1, { customerUserId: 'account-b', reference: 'OTHER-1' }));
    const { service } = setup(rows);
    const first = await service.list(customer);
    const other = await service.list(
      { ...customer, sub: 'account-b' },
      first.nextCursor,
    );
    expect(other.orders.map((order) => order.reference)).toEqual(['OTHER-1']);
  });

  it.each([
    '',
    'not-json',
    'a'.repeat(257),
    'abc=',
    ['abc'],
    { cursor: 'abc' },
    1,
    null,
    Buffer.from(
      JSON.stringify({
        v: 2,
        date: '2026-10-13T12:00:00.000Z',
        id: '000000000000000000000001',
      }),
    ).toString('base64url'),
    Buffer.from(
      JSON.stringify({ v: 1, date: 'invalid', id: '000000000000000000000001' }),
    ).toString('base64url'),
    Buffer.from(
      JSON.stringify({
        v: 1,
        date: '2026-10-13',
        id: '000000000000000000000001',
      }),
    ).toString('base64url'),
    Buffer.from(
      JSON.stringify({ v: 1, date: '2026-10-13T12:00:00.000Z', id: 'bad-id' }),
    ).toString('base64url'),
    Buffer.from(
      JSON.stringify({
        v: 1,
        date: '2026-10-13T12:00:00.000Z',
        id: '000000000000000000000001',
        customerUserId: 'account-b',
      }),
    ).toString('base64url'),
  ])('rejects malformed cursors before querying (%j)', async (cursor) => {
    const { service, model } = setup();
    await expect(service.list(customer, cursor)).rejects.toThrow(
      BadRequestException,
    );
    expect(model.find).not.toHaveBeenCalled();
  });

  it.each([
    'bad-id',
    '000000000000000000000099',
    '000000000000000000000002',
    '000000000000000000000003',
  ])(
    'returns the same 404 for invalid, absent, foreign and draft detail (%s)',
    async (id) => {
      const { service } = setup([
        record(1),
        record(2, { customerUserId: 'account-b' }),
        record(3, { status: OrderStatus.DRAFT }),
      ]);
      await expect(service.detail(customer, id)).rejects.toThrow(
        NotFoundException,
      );
    },
  );

  it('whitelists list and detail fields even when the stored record contains private fields', async () => {
    const { service, model } = setup([record(1)]);
    const list = await service.list(customer);
    const detail = await service.detail(customer, '000000000000000000000001');
    expect(Object.keys(list.orders[0]).sort()).toEqual(
      [
        'id',
        'reference',
        'status',
        'currency',
        'totalItems',
        'subtotal',
        'createdAt',
      ].sort(),
    );
    expect(detail.createdAt).toBe('2026-10-13T12:00:00.000Z');
    expect(Object.keys(detail).sort()).toEqual(
      [...Object.keys(list.orders[0]), 'items', 'shippingAddress'].sort(),
    );
    expect(Object.keys(detail.items[0]).sort()).toEqual(
      [
        'productId',
        'productName',
        'presentation',
        'image',
        'quantity',
        'unitPrice',
        'subtotal',
        'currency',
      ].sort(),
    );
    expect(Object.keys(detail.shippingAddress!).sort()).toEqual(
      [
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
      ].sort(),
    );
    expect(JSON.stringify(detail)).not.toMatch(
      /private-retry|Internal admin|stockAvailable|sourceAddressId|customerUserId/,
    );
    expect(model.findOne.mock.calls[0][0].customerUserId).toBe(customer.sub);
    expect(model.queries[1].select).toHaveBeenCalledWith(
      expect.objectContaining({
        'items.productName': 1,
        'shippingAddress.street': 1,
      }),
    );
  });

  it('returns null for older orders without a shipping address snapshot', async () => {
    const { service } = setup([record(1, { shippingAddress: undefined })]);
    expect(
      (await service.detail(customer, '000000000000000000000001'))
        .shippingAddress,
    ).toBeNull();
  });

  it('fails closed if a valid JWT payload has no subject', async () => {
    const { service, model } = setup([record(1)]);
    const invalid = { ...customer, sub: '' };
    await expect(service.list(invalid)).rejects.toThrow(UnauthorizedException);
    await expect(
      service.detail(invalid, '000000000000000000000001'),
    ).rejects.toThrow(UnauthorizedException);
    expect(model.find).not.toHaveBeenCalled();
    expect(model.findOne).not.toHaveBeenCalled();
  });
});
