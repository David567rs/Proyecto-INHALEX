import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import {
  createHmac,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { Model } from 'mongoose';
import { EmailVerificationChallenge } from './email-verification.schema';
import { EmailVerificationRateLimitService } from './email-verification-rate-limit.service';
import {
  REGISTRATION_CODE_SENDER,
  type RegistrationCodeSender,
} from './registration-code-sender';

const CODE_TTL_MINUTES = 10;
const RESEND_DELAY_SECONDS = 60;
const MAX_ATTEMPTS = 5;
const SENDS_PER_EMAIL = 5;
const EMAIL_SEND_WINDOW_MS = 60 * 60_000;
const INVALID_CODE =
  'El código es incorrecto, venció o ya se usó. Solicita otro si lo necesitas.';

function unexpiredCode(now: Date) {
  return {
    $or: [
      { codeExpiresAt: { $gt: now } },
      { codeExpiresAt: { $exists: false }, expiresAt: { $gt: now } },
    ],
  };
}

@Injectable()
export class EmailVerificationService {
  constructor(
    @InjectModel(EmailVerificationChallenge.name)
    private readonly challenges: Model<EmailVerificationChallenge>,
    private readonly config: ConfigService,
    private readonly rateLimit: EmailVerificationRateLimitService,
    @Inject(REGISTRATION_CODE_SENDER)
    private readonly sender: RegistrationCodeSender,
  ) {}

  async issue(rawEmail: string, clientIp: string) {
    const secret = this.getSecret();
    if (!this.sender.available) {
      throw new ServiceUnavailableException(
        'El envío de correo no está disponible.',
      );
    }

    const email = rawEmail.trim().toLowerCase();
    await this.rateLimit.assertOriginAllowed(clientIp);

    const now = new Date();
    const codeExpiresAt = new Date(now.getTime() + CODE_TTL_MINUTES * 60_000);
    const challengeId = randomUUID();
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const _id = this.digest(secret, ['registration-email', email]);
    const codeDigest = this.digest(secret, [
      'registration-code',
      _id,
      challengeId,
      code,
    ]);

    const nextCode = {
      challengeId,
      codeDigest,
      remainingAttempts: MAX_ATTEMPTS,
      resendAt: new Date(now.getTime() + RESEND_DELAY_SECONDS * 1_000),
      codeExpiresAt,
    };
    const readyToResend = { _id, resendAt: { $lte: now } };
    // Updating the challenge and its quota together keeps rejected resends
    // from spending a slot or replacing the last code.
    const reserved = await this.challenges
      .updateOne(
        {
          ...readyToResend,
          sendWindowExpiresAt: { $gt: now },
          sendsInWindow: { $lt: SENDS_PER_EMAIL },
        },
        {
          $set: nextCode,
          $inc: { sendsInWindow: 1 },
          $max: { expiresAt: codeExpiresAt },
          $unset: { consumedAt: 1 },
        },
      )
      .exec();
    if (reserved.matchedCount === 0) {
      await this.startSendWindow(readyToResend, nextCode, now);
    }

    try {
      await this.sender.send(email, code, CODE_TTL_MINUTES);
    } catch {
      // Release the cooldown for retry while retaining the spent send slot.
      // A later resend may already have replaced this challenge.
      await this.challenges
        .updateOne(
          { _id, challengeId },
          { $set: { remainingAttempts: 0, resendAt: new Date() } },
        )
        .exec()
        .catch(() => undefined);
      throw new ServiceUnavailableException(
        'No pudimos enviar el código. Inténtalo de nuevo.',
      );
    }

    return {
      challengeId,
      expiresInSeconds: CODE_TTL_MINUTES * 60,
      resendAfterSeconds: RESEND_DELAY_SECONDS,
    };
  }

  private async startSendWindow(
    readyToResend: { _id: string; resendAt: { $lte: Date } },
    nextCode: Pick<
      EmailVerificationChallenge,
      | 'challengeId'
      | 'codeDigest'
      | 'remainingAttempts'
      | 'resendAt'
      | 'codeExpiresAt'
    >,
    now: Date,
  ): Promise<void> {
    const sendWindowExpiresAt = new Date(now.getTime() + EMAIL_SEND_WINDOW_MS);
    try {
      await this.challenges
        .updateOne(
          {
            ...readyToResend,
            $or: [
              { sendWindowExpiresAt: { $lte: now } },
              { sendWindowExpiresAt: { $exists: false } },
            ],
          },
          {
            $set: {
              ...nextCode,
              sendWindowExpiresAt,
              sendsInWindow: 1,
              expiresAt: sendWindowExpiresAt,
            },
            $unset: { consumedAt: 1 },
          },
          { upsert: true },
        )
        .exec();
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 11000
      ) {
        throw new HttpException(
          'Aún no puedes pedir otro código. Espera antes de volver a intentarlo.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw error;
    }
  }

  async consume(
    rawEmail: string,
    challengeId: string,
    code: string,
  ): Promise<Date> {
    const secret = this.getSecret();
    const email = rawEmail.trim().toLowerCase();
    const _id = this.digest(secret, ['registration-email', email]);
    const filter = { _id, challengeId, consumedAt: { $exists: false } };
    // Reserve an attempt atomically before checking the code. Concurrent guesses
    // cannot all be evaluated against the same remaining attempt.
    const challenge = await this.challenges
      .findOneAndUpdate(
        {
          ...filter,
          ...unexpiredCode(new Date()),
          remainingAttempts: { $gt: 0 },
        },
        { $inc: { remainingAttempts: -1 } },
      )
      .exec();
    if (!challenge) throw new BadRequestException(INVALID_CODE);

    const candidate = this.digest(secret, [
      'registration-code',
      _id,
      challengeId,
      code,
    ]);
    if (
      !timingSafeEqual(
        Buffer.from(challenge.codeDigest, 'hex'),
        Buffer.from(candidate, 'hex'),
      )
    ) {
      throw new BadRequestException(INVALID_CODE);
    }

    const verifiedAt = new Date();
    const result = await this.challenges
      .updateOne(
        { ...filter, ...unexpiredCode(verifiedAt) },
        { $set: { consumedAt: verifiedAt } },
      )
      .exec();
    if (result.modifiedCount !== 1) throw new BadRequestException(INVALID_CODE);
    return verifiedAt;
  }

  private getSecret(): string {
    const secret = this.config.get<string>('EMAIL_VERIFICATION_SECRET')?.trim();
    if (!secret || secret.length < 32) {
      throw new ServiceUnavailableException(
        'La verificación de correo no está disponible.',
      );
    }
    return secret;
  }

  private digest(secret: string, fields: string[]): string {
    return createHmac('sha256', secret)
      .update(JSON.stringify(fields))
      .digest('hex');
  }
}
