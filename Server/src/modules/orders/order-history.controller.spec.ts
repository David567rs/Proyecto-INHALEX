import { NotFoundException, type INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { UserRole } from '../users/enums/user-role.enum';
import { CustomerOrderHistoryService } from './customer-order-history.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

describe('Customer order history HTTP routes', () => {
  let app: INestApplication<Server>;
  let jwt: JwtService;
  const payload = {
    sub: 'account-a',
    email: 'same@example.test',
    role: UserRole.USER,
  };
  const history = { list: jest.fn(), detail: jest.fn(), tracking: jest.fn() };
  const orders = { listReceiptConfirmationOrders: jest.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        JwtModule.register({ secret: 'order-history-test-only-secret' }),
      ],
      controllers: [OrdersController],
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: { get: () => 'order-history-test-only-secret' },
        },
        { provide: CustomerOrderHistoryService, useValue: history },
        { provide: OrdersService, useValue: orders },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    jwt = module.get(JwtService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    history.list.mockResolvedValue({ orders: [], nextCursor: null });
    history.detail.mockResolvedValue({ id: '000000000000000000000001' });
    history.tracking.mockResolvedValue({
      id: '000000000000000000000001',
      status: 'pending_review',
      confirmedAt: null,
      cancelledAt: null,
      completedAt: null,
    });
    orders.listReceiptConfirmationOrders.mockResolvedValue([]);
  });
  afterAll(async () => {
    await app.close();
  });

  it.each([
    '/orders/me',
    '/orders/me/000000000000000000000001',
    '/orders/me/000000000000000000000001/tracking',
  ])('requires a signed JWT for %s', async (url) => {
    await request(app.getHttpServer()).get(url).expect(401);
    await request(app.getHttpServer())
      .get(url)
      .set('Authorization', 'Bearer invalid')
      .expect(401);
    expect(history.list).not.toHaveBeenCalled();
    expect(history.detail).not.toHaveBeenCalled();
    expect(history.tracking).not.toHaveBeenCalled();
  });

  it.each(['/orders/me', '/orders/me/000000000000000000000001/tracking'])(
    'rejects an expired token for %s',
    async (url) => {
      await request(app.getHttpServer())
        .get(url)
        .set('Authorization', `Bearer ${jwt.sign(payload, { expiresIn: -10 })}`)
        .expect(401);
      expect(history.list).not.toHaveBeenCalled();
      expect(history.tracking).not.toHaveBeenCalled();
    },
  );

  it('takes list ownership from the signed subject and passes the opaque cursor unchanged', async () => {
    await request(app.getHttpServer())
      .get('/orders/me?cursor=opaque_cursor&customerUserId=account-b')
      .set('Authorization', `Bearer ${jwt.sign(payload)}`)
      .expect('Cache-Control', 'private, no-store')
      .expect(200, { orders: [], nextCursor: null });
    expect(history.list).toHaveBeenCalledWith(
      expect.objectContaining(payload),
      'opaque_cursor',
    );
  });

  it('passes the signed subject to detail', async () => {
    await request(app.getHttpServer())
      .get('/orders/me/000000000000000000000001')
      .set('Authorization', `Bearer ${jwt.sign(payload)}`)
      .expect('Cache-Control', 'private, no-store')
      .expect(200);
    expect(history.detail).toHaveBeenCalledWith(
      expect.objectContaining(payload),
      '000000000000000000000001',
    );
  });

  it('preserves receipt-confirmations precedence over the detail parameter', async () => {
    await request(app.getHttpServer())
      .get('/orders/me/receipt-confirmations')
      .set('Authorization', `Bearer ${jwt.sign(payload)}`)
      .expect(200, []);
    expect(orders.listReceiptConfirmationOrders).toHaveBeenCalledWith(
      expect.objectContaining(payload),
    );
    expect(history.detail).not.toHaveBeenCalled();
  });

  it('passes tracking ownership from the signed subject and prevents response caching', async () => {
    await request(app.getHttpServer())
      .get(
        '/orders/me/000000000000000000000001/tracking?customerUserId=account-b',
      )
      .set('Authorization', `Bearer ${jwt.sign(payload)}`)
      .expect('Cache-Control', 'private, no-store')
      .expect(200, {
        id: '000000000000000000000001',
        status: 'pending_review',
        confirmedAt: null,
        cancelledAt: null,
        completedAt: null,
      });
    expect(history.tracking).toHaveBeenCalledWith(
      expect.objectContaining(payload),
      '000000000000000000000001',
    );
    expect(history.detail).not.toHaveBeenCalled();
  });

  it('returns the service tracking 404 without revealing another account', async () => {
    history.tracking.mockRejectedValueOnce(
      new NotFoundException('No encontramos ese pedido en tu cuenta.'),
    );
    await request(app.getHttpServer())
      .get('/orders/me/000000000000000000000001/tracking')
      .set('Authorization', `Bearer ${jwt.sign(payload)}`)
      .expect(404, {
        message: 'No encontramos ese pedido en tu cuenta.',
        error: 'Not Found',
        statusCode: 404,
      });
  });
});
