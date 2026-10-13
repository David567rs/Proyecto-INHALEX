import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import { Types } from 'mongoose';
import request from 'supertest';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';
import type { UserDocument } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthSecurityService } from './auth-security.service';
import { JwtStrategy } from './strategies/jwt.strategy';

const accountId = '000000000000000000000001';
const profile = {
  _id: accountId,
  name: 'María López',
  firstName: 'María',
  lastName: 'López',
  phone: '7712345678',
  email: 'maria@example.test',
  role: UserRole.USER,
  status: UserStatus.ACTIVE,
};
const update = {
  firstName: 'María',
  lastName: 'López',
  phone: '7712345678',
};

function userDocument(overrides: Record<string, unknown> = {}): UserDocument {
  const fields = {
    ...profile,
    _id: new Types.ObjectId(accountId),
    passwordHash: 'private-password-hash',
    alexaLinkCodeHash: 'private-link-code',
    alexaLinkCodeExpiresAt: new Date(),
    alexaUserIdHash: 'private-alexa-user',
    shippingAddresses: [{ label: 'private address' }],
    favoriteProductIds: ['private-favorite'],
    cartItems: [{ productId: 'private-cart' }],
    lastLoginAt: new Date(),
    lastSeenAt: new Date(),
    ...overrides,
  };
  return {
    ...fields,
    toObject: () => ({ ...fields }),
  } as unknown as UserDocument;
}

describe('Authenticated profile HTTP routes', () => {
  let app: INestApplication<Server>;
  let jwt: JwtService;
  const users = {
    markActiveUserActivity: jest.fn<Promise<UserDocument | null>, [string]>(),
    updateOwnProfile: jest.fn<
      Promise<UserDocument | null>,
      [string, typeof update]
    >(),
  };
  const payload = {
    sub: accountId,
    email: 'older-email@example.test',
    role: UserRole.USER,
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'profile-test-only-secret' })],
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtStrategy,
        { provide: UsersService, useValue: users },
        { provide: AuthSecurityService, useValue: {} },
        {
          provide: ConfigService,
          useValue: { get: () => 'profile-test-only-secret' },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    jwt = module.get(JwtService);
  });

  beforeEach(() => {
    jest.resetAllMocks();
    users.markActiveUserActivity.mockResolvedValue(userDocument());
    users.updateOwnProfile.mockResolvedValue(userDocument());
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(['get', 'patch'] as const)(
    'requires a valid signed JWT for %s /auth/me',
    async (method) => {
      await request(app.getHttpServer())
        [method]('/auth/me')
        .send(method === 'patch' ? update : undefined)
        .expect(401);
      await request(app.getHttpServer())
        [method]('/auth/me')
        .set('Authorization', 'Bearer invalid')
        .send(method === 'patch' ? update : undefined)
        .expect(401);
      expect(users.markActiveUserActivity).not.toHaveBeenCalled();
      expect(users.updateOwnProfile).not.toHaveBeenCalled();
    },
  );

  it.each(['get', 'patch'] as const)(
    'rejects an expired JWT for %s /auth/me',
    async (method) => {
      await request(app.getHttpServer())
        [method]('/auth/me')
        .set('Authorization', `Bearer ${jwt.sign(payload, { expiresIn: -10 })}`)
        .send(method === 'patch' ? update : undefined)
        .expect(401);
      expect(users.markActiveUserActivity).not.toHaveBeenCalled();
      expect(users.updateOwnProfile).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, null, '', 'another-user', ['account'], { $ne: null }])(
    'rejects a malformed signed subject: %p',
    async (sub) => {
      const token = jwt.sign({ ...payload, sub });
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
      await request(app.getHttpServer())
        .patch('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send(update)
        .expect(401);
      expect(users.markActiveUserActivity).not.toHaveBeenCalled();
      expect(users.updateOwnProfile).not.toHaveBeenCalled();
    },
  );

  it('reads only the signed subject and returns an explicit public field list', async () => {
    await request(app.getHttpServer())
      .get(
        '/auth/me?userId=000000000000000000000099&email=someone@example.test',
      )
      .set('Authorization', `Bearer ${jwt.sign(payload)}`)
      .expect('Cache-Control', 'private, no-store')
      .expect(200, profile);
    expect(users.markActiveUserActivity).toHaveBeenCalledWith(accountId);
  });

  it('updates only the signed account with normalized editable fields', async () => {
    await request(app.getHttpServer())
      .patch('/auth/me?userId=000000000000000000000099')
      .set('Authorization', `Bearer ${jwt.sign(payload)}`)
      .send({
        firstName: '  María   José ',
        lastName: ' López  ',
        phone: ' 7712345678 ',
      })
      .expect('Cache-Control', 'private, no-store')
      .expect(200, profile);
    expect(users.updateOwnProfile).toHaveBeenCalledWith(accountId, {
      firstName: 'María José',
      lastName: 'López',
      phone: '7712345678',
    });
  });

  it.each([
    '_id',
    'id',
    'userId',
    'email',
    'role',
    'status',
    'password',
    'passwordHash',
    'name',
    'alexaUserIdHash',
    '$set',
  ])('rejects the restricted property %s before persistence', async (key) => {
    await request(app.getHttpServer())
      .patch('/auth/me')
      .set('Authorization', `Bearer ${jwt.sign(payload)}`)
      .send({ ...update, [key]: 'injected value' })
      .expect(400);
    expect(users.updateOwnProfile).not.toHaveBeenCalled();
  });

  it.each([
    {},
    { ...update, firstName: undefined },
    { ...update, lastName: undefined },
    { ...update, phone: undefined },
    { ...update, firstName: null },
    { ...update, firstName: ['María'] },
    { ...update, firstName: 'A' },
    { ...update, firstName: 'A'.repeat(51) },
    { ...update, firstName: 'María123' },
    { ...update, firstName: '--' },
    { ...update, lastName: '  ' },
    { ...update, lastName: "''" },
    { ...update, lastName: 'A'.repeat(51) },
    { ...update, phone: 7712345678 },
    { ...update, phone: null },
    { ...update, phone: '123456789' },
    { ...update, phone: '1'.repeat(16) },
    { ...update, phone: '+52 7712345678' },
    { ...update, phone: 'abcdefghij' },
    { ...update, firstName: 'A'.repeat(50), lastName: 'B'.repeat(50) },
  ])('rejects invalid profile values: %p', async (input) => {
    await request(app.getHttpServer())
      .patch('/auth/me')
      .set('Authorization', `Bearer ${jwt.sign(payload)}`)
      .send(input)
      .expect(400);
    expect(users.updateOwnProfile).not.toHaveBeenCalled();
  });

  it('accepts the maximum full name and phone lengths', async () => {
    const maximum = {
      firstName: 'A'.repeat(50),
      lastName: 'B'.repeat(49),
      phone: '1'.repeat(15),
    };
    await request(app.getHttpServer())
      .patch('/auth/me')
      .set('Authorization', `Bearer ${jwt.sign(payload)}`)
      .send(maximum)
      .expect(200);
    expect(users.updateOwnProfile).toHaveBeenCalledWith(accountId, maximum);
  });

  it.each([null, UserStatus.INACTIVE])(
    'refuses read and update when the account is missing or inactive: %p',
    async (status) => {
      const user = status ? userDocument({ status }) : null;
      users.markActiveUserActivity.mockResolvedValue(user);
      users.updateOwnProfile.mockResolvedValue(user);
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${jwt.sign(payload)}`)
        .expect(401);
      await request(app.getHttpServer())
        .patch('/auth/me')
        .set('Authorization', `Bearer ${jwt.sign(payload)}`)
        .send(update)
        .expect(401);
    },
  );

  it('preserves public dates without exposing internal authentication activity', async () => {
    const dates = {
      createdAt: new Date('2026-01-01T12:00:00.000Z'),
      updatedAt: new Date('2026-10-13T12:00:00.000Z'),
      alexaLinkedAt: new Date('2026-09-01T12:00:00.000Z'),
    };
    users.markActiveUserActivity.mockResolvedValue(userDocument(dates));
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${jwt.sign(payload)}`)
      .expect(200, {
        ...profile,
        createdAt: dates.createdAt.toISOString(),
        updatedAt: dates.updatedAt.toISOString(),
        alexaLinkedAt: dates.alexaLinkedAt.toISOString(),
      });
  });
});
