import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import type { Server } from 'node:http';
import request from 'supertest';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';
import { UsersService } from '../users/users.service';
import { AuthSecurityService } from './auth-security.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AUTH_COOKIE_NAME } from './auth.constants';
import { EmailVerificationRateLimitService } from './email-verification/email-verification-rate-limit.service';
import { EmailVerificationChallenge } from './email-verification/email-verification.schema';
import { EmailVerificationService } from './email-verification/email-verification.service';
import { REGISTRATION_CODE_SENDER } from './email-verification/registration-code-sender';

const registration = {
  firstName: 'María',
  lastName: 'López',
  phone: '7712345678',
  email: 'maria@example.test',
  password: 'RegistrationTest!42',
};

type DateCondition = { $gt: Date } | { $lte: Date } | { $exists: false };

type ChallengeConditions = {
  $or?: ChallengeConditions[];
  challengeId?: string;
  consumedAt?: { $exists: false };
  expiresAt?: DateCondition;
  codeExpiresAt?: DateCondition;
  remainingAttempts?: { $gt: number };
  resendAt?: DateCondition;
  sendWindowExpiresAt?: DateCondition;
  sendsInWindow?: { $lt: number };
};

type ChallengeFilter = ChallengeConditions & { _id: string };

function query<T>(value: T) {
  return { exec: () => Promise.resolve(value) };
}

function matchesDate(value: Date | undefined, condition?: DateCondition) {
  if (!condition) return true;
  if ('$exists' in condition) return value === undefined;
  if (!value) return false;
  return '$gt' in condition ? value > condition.$gt : value <= condition.$lte;
}

function matches(
  record: EmailVerificationChallenge,
  filter: ChallengeConditions,
): boolean {
  return (
    (!filter.challengeId || record.challengeId === filter.challengeId) &&
    (!filter.consumedAt || !record.consumedAt) &&
    matchesDate(record.expiresAt, filter.expiresAt) &&
    matchesDate(record.codeExpiresAt, filter.codeExpiresAt) &&
    matchesDate(record.resendAt, filter.resendAt) &&
    matchesDate(record.sendWindowExpiresAt, filter.sendWindowExpiresAt) &&
    (!filter.remainingAttempts ||
      record.remainingAttempts > filter.remainingAttempts.$gt) &&
    (!filter.sendsInWindow ||
      (record.sendsInWindow !== undefined &&
        record.sendsInWindow < filter.sendsInWindow.$lt)) &&
    (!filter.$or || filter.$or.some((branch) => matches(record, branch)))
  );
}

function createChallengeStore() {
  const records = new Map<string, EmailVerificationChallenge>();

  function find(filter: ChallengeFilter) {
    const record = records.get(filter._id);
    return record && matches(record, filter) ? record : undefined;
  }

  return {
    records,
    model: {
      updateOne(
        filter: ChallengeFilter,
        update: {
          $set: Partial<Omit<EmailVerificationChallenge, '_id'>>;
          $unset?: { consumedAt: 1 };
          $inc?: { sendsInWindow: number };
          $max?: { expiresAt: Date };
        },
        options?: { upsert: true },
      ) {
        const found = find(filter);
        if (!found && options?.upsert && records.has(filter._id)) {
          return {
            exec: () =>
              Promise.reject(
                Object.assign(new Error('Duplicate challenge'), {
                  code: 11000,
                }),
              ),
          };
        }
        if (!found && !options?.upsert)
          return query({ matchedCount: 0, modifiedCount: 0 });
        const next = {
          ...found,
          ...update.$set,
          _id: filter._id,
        } as EmailVerificationChallenge;
        if (update.$unset?.consumedAt) delete next.consumedAt;
        if (update.$inc)
          next.sendsInWindow =
            (next.sendsInWindow ?? 0) + update.$inc.sendsInWindow;
        if (update.$max && next.expiresAt < update.$max.expiresAt)
          next.expiresAt = update.$max.expiresAt;
        records.set(filter._id, next);
        return query({
          matchedCount: found ? 1 : 0,
          modifiedCount: found ? 1 : 0,
        });
      },
      findOneAndUpdate(
        filter: ChallengeFilter,
        update: { $inc: { remainingAttempts: number } },
      ) {
        const found = find(filter);
        if (!found) return query(null);
        const original = { ...found };
        found.remainingAttempts += update.$inc.remainingAttempts;
        return query(original);
      },
    },
  };
}

function newUserDocument(input: Parameters<UsersService['create']>[0]) {
  const fields = {
    ...input,
    _id: new Types.ObjectId(),
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
  };
  return {
    ...fields,
    id: fields._id.toHexString(),
    toObject: () => ({ ...fields }),
  };
}

describe('Registration verification HTTP routes', () => {
  let app: INestApplication<Server>;
  const users = {
    create: jest.fn((input: Parameters<UsersService['create']>[0]) =>
      Promise.resolve(newUserDocument(input)),
    ),
    findByEmail: jest.fn<Promise<null>, [string]>().mockResolvedValue(null),
  };
  const sender = {
    available: true,
    send: jest.fn<Promise<void>, [string, string, number]>(),
  };
  const challenges = createChallengeStore();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'registration-test-only-jwt' })],
      controllers: [AuthController],
      providers: [
        AuthService,
        EmailVerificationService,
        { provide: UsersService, useValue: users },
        { provide: AuthSecurityService, useValue: {} },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'EMAIL_VERIFICATION_SECRET'
                ? 'registration-test-only-secret-32-characters'
                : undefined,
          },
        },
        {
          provide: EmailVerificationRateLimitService,
          useValue: { assertOriginAllowed: () => Promise.resolve() },
        },
        {
          provide: getModelToken(EmailVerificationChallenge.name),
          useValue: challenges.model,
        },
        { provide: REGISTRATION_CODE_SENDER, useValue: sender },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    // Keep one listener open for the concurrent SuperTest requests.
    await app.listen(0, '127.0.0.1');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    sender.available = true;
    sender.send.mockReset().mockResolvedValue(undefined);
    challenges.records.clear();
  });

  afterAll(async () => {
    await app.close();
  });

  function post(path: string) {
    return request(app.getHttpServer()).post(`/api/auth/register${path}`);
  }

  async function issueCode() {
    const response = await post('/verification')
      .send({ email: registration.email })
      .expect(202);
    const { challengeId } = response.body as { challengeId: string };
    const [, code] = sender.send.mock.calls[0];
    return { response, challengeId, code };
  }

  it('delivers the code only to the simulated mailbox and leaves the account uncreated', async () => {
    const { response, challengeId, code } = await issueCode();
    expect(code).toMatch(/^\d{6}$/);
    expect(sender.send).toHaveBeenCalledWith(registration.email, code, 10);
    expect(sender.send).toHaveBeenCalledTimes(1);
    expect(challengeId).toMatch(/^[a-f0-9-]{36}$/);
    expect(response.body).toEqual({
      challengeId,
      expiresInSeconds: 600,
      resendAfterSeconds: 60,
    });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(users.create).not.toHaveBeenCalled();
  });

  it('rejects an incorrect code and a code for another email before creating an account', async () => {
    const { challengeId, code } = await issueCode();
    const wrongCode = code === '000000' ? '000001' : '000000';
    await post('/verified')
      .send({ ...registration, challengeId, code: wrongCode })
      .expect(400);
    await post('/verified')
      .send({ ...registration, email: 'other@example.test', challengeId, code })
      .expect(400);
    expect(users.create).not.toHaveBeenCalled();
  });

  it('creates a verified account only once and returns its existing registration payload', async () => {
    const { challengeId, code } = await issueCode();
    const input = { ...registration, challengeId, code };
    const response = await post('/verified').send(input).expect(201);
    const verifiedAt = users.create.mock.calls[0][0].emailVerifiedAt;
    expect(verifiedAt).toBeInstanceOf(Date);
    expect(response.body).toMatchObject({
      accessToken: expect.any(String) as string,
      user: {
        email: registration.email,
        emailVerifiedAt: verifiedAt?.toISOString(),
      },
    });
    expect(response.body).not.toHaveProperty('user.passwordHash');
    expect(response.body).not.toHaveProperty('user.code');
    expect(response.headers['set-cookie']).toEqual([
      expect.stringContaining(`${AUTH_COOKIE_NAME}=`),
    ]);

    await post('/verified').send(input).expect(400);
    expect(users.create).toHaveBeenCalledTimes(1);
  });

  it('rejects an expired code even while the challenge record is still present', async () => {
    const { challengeId, code } = await issueCode();
    const [challenge] = challenges.records.values();
    challenge.codeExpiresAt = new Date(0);

    await post('/verified')
      .send({ ...registration, challengeId, code })
      .expect(400);
    expect(users.create).not.toHaveBeenCalled();
  });

  it('can still consume an unexpired challenge issued by the previous schema', async () => {
    const { challengeId, code } = await issueCode();
    const [challenge] = challenges.records.values();
    delete challenge.codeExpiresAt;
    delete challenge.sendWindowExpiresAt;
    delete challenge.sendsInWindow;
    challenge.expiresAt = new Date(Date.now() + 60_000);

    await post('/verified')
      .send({ ...registration, challengeId, code })
      .expect(201);
  });

  it('allows only one account creation when two confirmations arrive together', async () => {
    const { challengeId, code } = await issueCode();
    const input = { ...registration, challengeId, code };
    const results = await Promise.all([
      post('/verified').send(input),
      post('/verified').send(input),
    ]);

    expect(results.map(({ status }) => status).sort()).toEqual([201, 400]);
    expect(users.create).toHaveBeenCalledTimes(1);
  });

  it('reports a competing account insert as a conflict and spends the code', async () => {
    const { challengeId, code } = await issueCode();
    const input = { ...registration, challengeId, code };
    users.create.mockRejectedValueOnce(
      Object.assign(new Error('duplicate'), { code: 11000 }),
    );

    await post('/verified').send(input).expect(409);
    await post('/verified').send(input).expect(400);
    expect(users.create).toHaveBeenCalledTimes(1);
  });

  it('enforces resend cooldown and invalidates the previous challenge', async () => {
    const previous = await issueCode();
    const rejected = await Promise.all(
      Array.from({ length: 5 }, () =>
        post('/verification').send({ email: registration.email }),
      ),
    );
    expect(rejected.map(({ status }) => status)).toEqual([
      429, 429, 429, 429, 429,
    ]);
    expect(sender.send).toHaveBeenCalledTimes(1);

    const [challenge] = challenges.records.values();
    expect(challenge.challengeId).toBe(previous.challengeId);
    expect(challenge.sendsInWindow).toBe(1);
    challenge.resendAt = new Date(0);
    const resend = await post('/verification')
      .send({ email: registration.email })
      .expect(202);
    const { challengeId } = resend.body as { challengeId: string };
    expect(challengeId).not.toBe(previous.challengeId);
    expect(sender.send).toHaveBeenCalledTimes(2);

    await post('/verified')
      .send({
        ...registration,
        challengeId: previous.challengeId,
        code: previous.code,
      })
      .expect(400);
    expect(users.create).not.toHaveBeenCalled();
  });

  it('limits actual delivery attempts per email and preserves the last code at the limit', async () => {
    const send = () =>
      post('/verification').send({ email: registration.email });
    const first = await Promise.all([send(), send(), send()]);
    expect(first.map(({ status }) => status).sort()).toEqual([202, 429, 429]);

    for (let sends = 1; sends < 5; sends++) {
      const [challenge] = challenges.records.values();
      challenge.resendAt = new Date(0);
      await send().expect(202);
    }
    const [last] = challenges.records.values();
    const [, code] = sender.send.mock.calls[4];
    last.resendAt = new Date(0);
    await send().expect(429);
    expect(sender.send).toHaveBeenCalledTimes(5);
    expect(last.sendsInWindow).toBe(5);
    await post('/verified')
      .send({ ...registration, challengeId: last.challengeId, code })
      .expect(201);

    const [previousWindow] = challenges.records.values();
    previousWindow.sendWindowExpiresAt = new Date(0);
    await send().expect(202);
    const [newWindow] = challenges.records.values();
    expect(newWindow.sendsInWindow).toBe(1);
    expect(sender.send).toHaveBeenCalledTimes(6);
  });

  it('blocks even the correct code after five incorrect attempts', async () => {
    const { challengeId, code } = await issueCode();
    const wrongCode = code === '000000' ? '000001' : '000000';
    for (let attempt = 0; attempt < 5; attempt++) {
      await post('/verified')
        .send({ ...registration, challengeId, code: wrongCode })
        .expect(400);
    }
    await post('/verified')
      .send({ ...registration, challengeId, code })
      .expect(400);
    expect(users.create).not.toHaveBeenCalled();
  });

  it('preserves the legacy registration contract without granting email verification', async () => {
    const response = await post('').send(registration).expect(201);
    expect(response.body).toMatchObject({
      accessToken: expect.any(String) as string,
      user: { email: registration.email },
    });
    expect(response.headers['set-cookie']).toEqual([
      expect.stringContaining(`${AUTH_COOKIE_NAME}=`),
    ]);
    expect(response.body).not.toHaveProperty('user.emailVerifiedAt');
    expect(users.create.mock.calls[0][0]).not.toHaveProperty('emailVerifiedAt');
    expect(sender.send).not.toHaveBeenCalled();
  });

  it('returns a controlled error when no mail sender is available', async () => {
    sender.available = false;
    await post('/verification').send({ email: registration.email }).expect(503);
    expect(sender.send).not.toHaveBeenCalled();
    expect(challenges.records.size).toBe(0);
    expect(users.create).not.toHaveBeenCalled();
  });

  it('invalidates failed delivery but allows retry without refunding the quota', async () => {
    sender.send.mockRejectedValueOnce(new Error('Simulated delivery failure'));
    const response = await post('/verification')
      .send({ email: registration.email })
      .expect(503);
    expect(response.body).not.toHaveProperty('challengeId');
    const [failed] = challenges.records.values();
    const [, code] = sender.send.mock.calls[0];
    expect(failed.sendsInWindow).toBe(1);
    await post('/verified')
      .send({ ...registration, challengeId: failed.challengeId, code })
      .expect(400);
    await post('/verification').send({ email: registration.email }).expect(202);
    const [retried] = challenges.records.values();
    expect(retried.sendsInWindow).toBe(2);
    expect(users.create).not.toHaveBeenCalled();
  });
});
