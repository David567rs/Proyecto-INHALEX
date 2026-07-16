import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AUTH_COOKIE_NAME } from '../auth.constants';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

function extractJwtFromCookie(request: Request): string | null {
  const rawCookie = request.headers.cookie;

  if (!rawCookie) {
    return null;
  }

  const cookies = rawCookie.split(';');
  const authCookie = cookies.find((cookie) => {
    const [name] = cookie.trim().split('=');
    return name === AUTH_COOKIE_NAME;
  });

  if (!authCookie) {
    return null;
  }

  const [, ...valueParts] = authCookie.trim().split('=');
  const value = valueParts.join('=');

  if (!value) {
    return null;
  }

  return decodeURIComponent(value);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        extractJwtFromCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') ?? 'dev_secret_change_me',
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
