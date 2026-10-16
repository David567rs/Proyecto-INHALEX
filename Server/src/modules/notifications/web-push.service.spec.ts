import {
  BadRequestException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { createECDH } from 'node:crypto';
import * as webPush from 'web-push';
import { pushEndpointHash, validatePushEndpoint } from './push-endpoint';
import { WebPushService } from './web-push.service';
import type { WebPushSubscriptionDocument } from './schemas/web-push-subscription.schema';
import type { SavePushSubscriptionDto } from './dto/push-subscription.dto';

jest.mock('web-push', () => ({ sendNotification: jest.fn() }));

// Public deterministic test fixture, never a deployment VAPID pair.
const curve = createECDH('prime256v1');
curve.setPrivateKey(Buffer.alloc(32, 1));
const testConfig = {
  VAPID_SUBJECT: 'mailto:testing@example.test',
  VAPID_PUBLIC_KEY: curve.getPublicKey().toString('base64url'),
  VAPID_PRIVATE_KEY: curve.getPrivateKey().toString('base64url'),
};
const endpoint = 'https://fcm.googleapis.com/fcm/send/test-browser-only';
const input: SavePushSubscriptionDto = {
  endpoint,
  keys: {
    p256dh: testConfig.VAPID_PUBLIC_KEY,
    auth: Buffer.alloc(16, 2).toString('base64url'),
  },
  consent: true,
};
const record = {
  _id: 'subscription-test-id',
  userId: 'owner',
  endpoint,
  endpointHash: pushEndpointHash(endpoint),
  p256dh: input.keys.p256dh,
  auth: input.keys.auth,
};

function fixture(config: Record<string, string> = testConfig) {
  const model = {
    exists: jest.fn().mockResolvedValue(null),
    findOne: jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    countDocuments: jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
    findOneAndUpdate: jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    deleteOne: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    }),
    find: jest.fn().mockReturnValue({
      limit: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue([record]) }),
    }),
  };
  const service = new WebPushService(
    model as unknown as Model<WebPushSubscriptionDocument>,
    new ConfigService(config),
  );
  return { model, service };
}

describe('Web Push subscriptions and delivery', () => {
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => jest.restoreAllMocks());

  it('disables missing or mismatched VAPID configuration without startup failure or secret exposure', async () => {
    const { service, model } = fixture({});
    expect(service.configuration()).toEqual({
      enabled: false,
      publicKey: null,
    });
    await expect(service.subscribe('owner', input)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await service.notifyAccount('owner');
    expect(model.find).not.toHaveBeenCalled();
    const mismatch = fixture({
      ...testConfig,
      VAPID_PUBLIC_KEY: 'x'.repeat(87),
    }).service;
    expect(mismatch.configuration()).toEqual({
      enabled: false,
      publicKey: null,
    });
    expect(fixture().service.configuration()).toEqual({
      enabled: true,
      publicKey: testConfig.VAPID_PUBLIC_KEY,
    });
  });

  it.each([
    'http://fcm.googleapis.com/fcm/send/a',
    'https://127.0.0.1/api',
    'https://[::1]/api',
    'https://localhost/api',
    'https://fcm.googleapis.com.attacker.test/a',
    'https://attackerpush.services.mozilla.com/a',
    'https://notify.windows.com.attacker.test/a',
    'https://fcm.googleapis.com:444/a',
    'https://user:pass@fcm.googleapis.com/a',
    'https://web.push.apple.com/a#private',
    'https://fcm.googleapis.com/',
  ])('rejects untrusted sender destination %s', (url) => {
    expect(() => validatePushEndpoint(url)).toThrow(BadRequestException);
  });

  it.each([
    endpoint,
    'https://updates.push.services.mozilla.com/wpush/v2/test',
    'https://web.push.apple.com/test',
    'https://wns2.example.notify.windows.com/w/?token=test',
  ])('accepts approved browser push service %s', (url) => {
    expect(validatePushEndpoint(url)).toBe(url);
  });

  it('stores only the authenticated owner and allows deliberate same-browser account rebinding', async () => {
    const { service, model } = fixture();
    model.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(record),
    });
    await expect(service.subscribe('new-owner', input)).resolves.toEqual({
      subscribed: true,
    });
    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { endpointHash: record.endpointHash },
      {
        $set: expect.objectContaining({
          userId: 'new-owner',
          endpoint,
          auth: input.keys.auth,
        }) as unknown,
      },
      { upsert: true, runValidators: true },
    );
    model.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ ...record, auth: 'another-secret' }),
    });
    await expect(service.subscribe('new-owner', input)).rejects.toThrow(
      'Renueva la suscripción',
    );
  });

  it('checks encryption key validity, expiration and per-account device limit', async () => {
    const { service, model } = fixture();
    await expect(
      service.subscribe('owner', {
        ...input,
        keys: { ...input.keys, p256dh: 'x'.repeat(87) },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.subscribe('owner', { ...input, expirationTime: 1 }),
    ).rejects.toThrow('caducado');
    model.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(20),
    });
    await expect(service.subscribe('owner', input)).rejects.toThrow('límite');
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('status and deletion are scoped to the current account without returning endpoint secrets', async () => {
    const { service, model } = fixture();
    expect(await service.status('different-user', endpoint)).toEqual({
      subscribed: false,
    });
    expect(model.exists).toHaveBeenCalledWith({
      userId: 'different-user',
      endpointHash: record.endpointHash,
      expiresAt: { $gt: expect.any(Date) as unknown },
    });
    expect(await service.unsubscribe('different-user', endpoint)).toEqual({
      subscribed: false,
    });
    expect(model.deleteOne).toHaveBeenCalledWith({
      userId: 'different-user',
      endpointHash: record.endpointHash,
    });
  });

  it('sends a generic fixed lock-screen payload and removes expired endpoints on 410', async () => {
    const { service, model } = fixture();
    const send = jest
      .mocked(webPush.sendNotification)
      .mockRejectedValue({ statusCode: 410 });
    await expect(service.notifyAccount('owner')).resolves.toBeUndefined();
    expect(send).toHaveBeenCalledWith(
      { endpoint, keys: input.keys },
      JSON.stringify({
        title: 'INHALEX',
        body: 'Tienes una nueva actualización en tu cuenta.',
        url: '/cuenta',
        tag: 'inhalex-account',
      }),
      expect.objectContaining({ timeout: 5000, TTL: 300 }),
    );
    expect(model.find).toHaveBeenCalledWith({
      userId: 'owner',
      expiresAt: { $gt: expect.any(Date) as unknown },
    });
    expect(model.deleteOne).toHaveBeenCalledWith({
      _id: record._id,
      userId: 'owner',
      endpointHash: record.endpointHash,
    });
  });

  it('does not send to a poisoned database endpoint or leak provider error details', async () => {
    const { service, model } = fixture();
    const send = jest
      .mocked(webPush.sendNotification)
      .mockRejectedValue({ statusCode: 503, body: 'SECRET_ENDPOINT' });
    const log = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    model.find.mockReturnValue({
      limit: jest.fn().mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue([
            { ...record, endpoint: 'https://127.0.0.1/private' },
          ]),
      }),
    });
    await expect(service.notifyAccount('owner')).resolves.toBeUndefined();
    expect(send).not.toHaveBeenCalled();
    model.find.mockReturnValue({
      limit: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue([record]) }),
    });
    await expect(service.notifyAccount('owner')).resolves.toBeUndefined();
    expect(model.deleteOne).not.toHaveBeenCalled();
    expect(JSON.stringify(log.mock.calls)).not.toContain('SECRET_ENDPOINT');
  });
});
