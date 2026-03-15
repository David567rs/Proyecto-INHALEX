import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

interface LoginAttemptState {
  count: number;
  windowStartedAt: number;
  blockedUntil?: number;
  lastAttemptAt: number;
}

@Injectable()
export class AuthSecurityService {
  private readonly loginAttempts = new Map<string, LoginAttemptState>();

  private readonly maxFailedAttempts: number;
  private readonly failedWindowMs: number;
  private readonly lockDurationMs: number;
  private readonly staleRetentionMs: number;

  private lastCleanupAt = 0;

  constructor() {
    this.maxFailedAttempts = this.readIntEnv('AUTH_MAX_FAILED_ATTEMPTS', 5, 1);
    this.failedWindowMs = this.readIntEnv(
      'AUTH_FAILED_WINDOW_MINUTES',
      15,
      1,
    ) *
      60 *
      1000;
    this.lockDurationMs = this.readIntEnv('AUTH_LOCK_MINUTES', 15, 1) * 60 * 1000;
    this.staleRetentionMs = this.readIntEnv(
      'AUTH_RATE_STALE_MINUTES',
      240,
      15,
    ) *
      60 *
      1000;
  }

  assertLoginAllowed(email: string, rawIp?: string): void {
    const now = Date.now();
    this.cleanupIfNeeded(now);

    const ip = this.normalizeIp(rawIp);
    const keys = this.buildKeys(email, ip);

    let maxRemainingMs = 0;
    for (const key of keys) {
      const state = this.loginAttempts.get(key);
      if (!state?.blockedUntil) continue;
      if (state.blockedUntil <= now) continue;
      maxRemainingMs = Math.max(maxRemainingMs, state.blockedUntil - now);
    }

    if (maxRemainingMs > 0) {
      const remainingMinutes = Math.ceil(maxRemainingMs / 60000);
      throw new HttpException(
        `Demasiados intentos de inicio de sesion. Intenta nuevamente en ${remainingMinutes} minuto(s).`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  registerFailedLogin(email: string, rawIp?: string): void {
    const now = Date.now();
    this.cleanupIfNeeded(now);

    const ip = this.normalizeIp(rawIp);
    const keys = this.buildKeys(email, ip);

    for (const key of keys) {
      const current = this.loginAttempts.get(key);
      if (!current || now - current.windowStartedAt > this.failedWindowMs) {
        this.loginAttempts.set(key, {
          count: 1,
          windowStartedAt: now,
          lastAttemptAt: now,
        });
        continue;
      }

      const nextCount = current.count + 1;
      const blockedUntil =
        nextCount >= this.maxFailedAttempts ? now + this.lockDurationMs : undefined;

      this.loginAttempts.set(key, {
        ...current,
        count: nextCount,
        blockedUntil,
        lastAttemptAt: now,
      });
    }
  }

  clearLoginFailures(email: string, rawIp?: string): void {
    const ip = this.normalizeIp(rawIp);
    const keys = this.buildKeys(email, ip);
    for (const key of keys) {
      this.loginAttempts.delete(key);
    }
  }

  private buildKeys(email: string, ip: string): string[] {
    const normalizedEmail = email.toLowerCase().trim();
    return [
      `email:${normalizedEmail}`,
      `ip:${ip}`,
      `combo:${normalizedEmail}|${ip}`,
    ];
  }

  private normalizeIp(rawIp?: string): string {
    if (!rawIp) return 'desconocida';
    const first = rawIp.split(',')[0]?.trim();
    return first || 'desconocida';
  }

  private cleanupIfNeeded(now: number): void {
    if (now - this.lastCleanupAt < 60 * 1000) return;
    this.lastCleanupAt = now;

    for (const [key, state] of this.loginAttempts.entries()) {
      const isExpired =
        now - state.lastAttemptAt > this.staleRetentionMs &&
        (!state.blockedUntil || state.blockedUntil <= now);
      if (isExpired) {
        this.loginAttempts.delete(key);
      }
    }
  }

  private readIntEnv(
    key: string,
    defaultValue: number,
    minValue: number,
  ): number {
    const rawValue = process.env[key];
    if (!rawValue) return defaultValue;
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) return defaultValue;
    if (parsed < minValue) return minValue;
    return Math.floor(parsed);
  }
}
