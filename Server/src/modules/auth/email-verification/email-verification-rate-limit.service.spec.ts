import { HttpStatus } from '@nestjs/common';
import type { Model } from 'mongoose';
import type { EmailVerificationRateLimitBucket } from './email-verification-rate-limit.schema';
import { EmailVerificationRateLimitService } from './email-verification-rate-limit.service';

function result(matchedCount: number, upsertedCount = 0) {
  return { exec: jest.fn().mockResolvedValue({ matchedCount, upsertedCount }) };
}

function failure(error: unknown) {
  return { exec: jest.fn().mockRejectedValue(error) };
}

describe('EmailVerificationRateLimitService', () => {
  const updateOne = jest.fn();
  const service = new EmailVerificationRateLimitService({
    updateOne,
  } as unknown as Model<EmailVerificationRateLimitBucket>);

  beforeEach(() => {
    updateOne.mockReset();
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T10:00:00Z'));
  });

  afterEach(() => jest.useRealTimers());

  it('checks the origin limit and can start a new window over an expired bucket', async () => {
    updateOne.mockReturnValueOnce(result(0)).mockReturnValueOnce(result(1));

    await service.assertOriginAllowed('192.0.2.1');

    const now = new Date('2026-01-01T10:00:00Z');
    const hashedId = expect.stringMatching(/^[a-f0-9]{64}$/) as unknown;
    expect(updateOne).toHaveBeenNthCalledWith(
      1,
      {
        _id: hashedId,
        expiresAt: { $gt: now },
        count: { $lt: 30 },
      },
      { $inc: { count: 1 } },
    );
    expect(updateOne).toHaveBeenNthCalledWith(
      2,
      {
        _id: hashedId,
        expiresAt: { $lte: now },
      },
      { $set: { count: 1, expiresAt: new Date('2026-01-01T11:00:00Z') } },
      { upsert: true },
    );
  });

  it('charges an existing bucket once when another request creates it first', async () => {
    updateOne
      .mockReturnValueOnce(result(0))
      .mockReturnValueOnce(failure({ code: 11000 }))
      .mockReturnValueOnce(result(1));

    await expect(
      service.assertOriginAllowed('192.0.2.1'),
    ).resolves.toBeUndefined();
    expect(updateOne).toHaveBeenCalledTimes(3);
  });

  it('blocks a full IP bucket', async () => {
    updateOne
      .mockReturnValueOnce(result(0))
      .mockReturnValueOnce(failure({ code: 11000 }))
      .mockReturnValueOnce(result(0));

    await expect(
      service.assertOriginAllowed('192.0.2.1'),
    ).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
    expect(updateOne).toHaveBeenCalledTimes(3);
  });

  it('propagates storage failures', async () => {
    const error = new Error('Storage unavailable');
    updateOne
      .mockReturnValueOnce(result(0))
      .mockReturnValueOnce(failure(error));

    await expect(service.assertOriginAllowed('192.0.2.1')).rejects.toBe(error);
    expect(updateOne).toHaveBeenCalledTimes(2);
  });
});
