import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { privateResponseCachePolicy } from '../../common/http/response-cache-policy';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { AUTH_COOKIE_NAME } from '../auth/auth.constants';
import { WebPushController } from './web-push.controller';
import { WebPushService } from './web-push.service';

describe('Web Push HTTP boundary', () => {
  let app: INestApplication<Server>;
  let token: string;
  const endpoint = 'https://fcm.googleapis.com/fcm/send/test-browser';
  const push = {
    configuration: jest
      .fn()
      .mockReturnValue({ enabled: false, publicKey: null }),
    status: jest.fn().mockResolvedValue({ subscribed: false }),
    subscribe: jest.fn().mockResolvedValue({ subscribed: true }),
    unsubscribe: jest.fn().mockResolvedValue({ subscribed: false }),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'push-http-test-only-secret' })],
      controllers: [WebPushController],
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: new ConfigService({
            JWT_SECRET: 'push-http-test-only-secret',
          }),
        },
        { provide: WebPushService, useValue: push },
      ],
    }).compile();
    app = module.createNestApplication();
    app.use(privateResponseCachePolicy);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    token = module.get(JwtService).sign({
      sub: 'authenticated-owner',
      email: 'owner@example.test',
      role: 'user',
    });
  });
  afterAll(async () => app.close());
  beforeEach(() => jest.clearAllMocks());

  it('public configuration reveals no private keys and is never cacheable', async () => {
    const response = await request(app.getHttpServer())
      .get('/notifications/push/config')
      .expect(200);
    expect(response.body).toEqual({ enabled: false, publicKey: null });
    expect(response.headers['cache-control']).toContain('no-store');
  });

  it.each(['status', 'subscriptions'])(
    'requires authentication for POST %s',
    async (path) => {
      const response = await request(app.getHttpServer())
        .post(`/notifications/push/${path}`)
        .send({ endpoint })
        .expect(401);
      expect(response.headers['cache-control']).toContain('private');
      expect(push.subscribe).not.toHaveBeenCalled();
    },
  );

  it('uses JWT ownership for status and unsubscribe, including cookie authentication', async () => {
    const response = await request(app.getHttpServer())
      .post('/notifications/push/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ endpoint })
      .expect(201);
    expect(response.headers['cache-control']).toContain('no-store');
    expect(push.status).toHaveBeenCalledWith('authenticated-owner', endpoint);
    await request(app.getHttpServer())
      .delete('/notifications/push/subscriptions')
      .set('Cookie', `${AUTH_COOKIE_NAME}=${token}`)
      .send({ endpoint })
      .expect(200);
    expect(push.unsubscribe).toHaveBeenCalledWith(
      'authenticated-owner',
      endpoint,
    );
  });

  it('validates consent, nested keys and rejects forged owner or injected fields', async () => {
    const valid = {
      endpoint,
      keys: { p256dh: 'a'.repeat(87), auth: 'a'.repeat(22) },
      consent: true,
    };
    await request(app.getHttpServer())
      .post('/notifications/push/subscriptions')
      .set('Authorization', `Bearer ${token}`)
      .send(valid)
      .expect(201);
    expect(push.subscribe).toHaveBeenCalledWith('authenticated-owner', valid);
    for (const input of [
      { ...valid, consent: false },
      { ...valid, userId: 'victim' },
      { ...valid, keys: { ...valid.keys, privateKey: 'forged' } },
      { ...valid, endpoint: { $ne: null } },
      { ...valid, keys: { p256dh: 'invalid', auth: 'invalid' } },
    ]) {
      await request(app.getHttpServer())
        .post('/notifications/push/subscriptions')
        .set('Authorization', `Bearer ${token}`)
        .send(input)
        .expect(400);
    }
    expect(push.subscribe).toHaveBeenCalledTimes(1);
  });

  it('rejects anonymous deletion', async () => {
    await request(app.getHttpServer())
      .delete('/notifications/push/subscriptions')
      .send({ endpoint })
      .expect(401);
    expect(push.unsubscribe).not.toHaveBeenCalled();
  });
});
