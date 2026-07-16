import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AUTH_COOKIE_NAME } from './auth.constants';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ExchangeAlexaLinkCodeDto } from './dto/exchange-alexa-link-code.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const authResponse = await this.authService.register(registerDto);
    this.setAuthCookie(response, authResponse.accessToken);
    return authResponse;
  }

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const authResponse = await this.authService.login(
      loginDto,
      this.resolveClientIp(request),
    );
    this.setAuthCookie(response, authResponse.accessToken);
    return authResponse;
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) response: Response) {
    this.clearAuthCookie(response);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return this.authService.getProfile(request.user.sub);
  }

  @Get('alexa/profile')
  getAlexaLinkedProfile(
    @Query('alexaUserId') alexaUserId: string,
    @Req() request: Request,
  ) {
    return this.authService.getAlexaLinkedProfile(
      alexaUserId,
      this.resolveClientIp(request),
    );
  }

  @Post('alexa/link-code')
  @UseGuards(JwtAuthGuard)
  generateAlexaLinkCode(@Req() request: AuthenticatedRequest) {
    return this.authService.generateAlexaLinkCode(request.user.sub);
  }

  @Delete('alexa/link-code')
  @UseGuards(JwtAuthGuard)
  revokeAlexaLinkCode(@Req() request: AuthenticatedRequest) {
    return this.authService.revokeAlexaLinkCode(request.user.sub);
  }

  @Delete('alexa/session')
  @UseGuards(JwtAuthGuard)
  unlinkAlexaAccount(@Req() request: AuthenticatedRequest) {
    return this.authService.unlinkAlexaAccount(request.user.sub);
  }

  @Post('alexa/exchange')
  exchangeAlexaLinkCode(
    @Body() exchangeDto: ExchangeAlexaLinkCodeDto,
    @Req() request: Request,
  ) {
    return this.authService.exchangeAlexaLinkCode(
      exchangeDto,
      this.resolveClientIp(request),
    );
  }

  private resolveClientIp(request: Request): string | undefined {
    const forwardedFor = request.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string') {
      return forwardedFor.split(',')[0]?.trim() || request.ip;
    }
    if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
      return forwardedFor[0]?.split(',')[0]?.trim() || request.ip;
    }
    return request.ip;
  }

  private setAuthCookie(response: Response, accessToken: string) {
    response.cookie(AUTH_COOKIE_NAME, accessToken, this.getAuthCookieOptions());
  }

  private clearAuthCookie(response: Response) {
    const { maxAge: _maxAge, ...options } = this.getAuthCookieOptions();
    response.clearCookie(AUTH_COOKIE_NAME, options);
  }

  private getAuthCookieOptions(): CookieOptions {
    const isProduction = process.env.NODE_ENV === 'production';
    const secureCookie = this.resolveBooleanEnv('AUTH_COOKIE_SECURE');
    const sameSiteCookie = this.resolveSameSiteEnv('AUTH_COOKIE_SAME_SITE');

    return {
      httpOnly: true,
      secure: secureCookie ?? isProduction,
      sameSite: sameSiteCookie ?? (isProduction ? 'none' : 'lax'),
      path: '/',
      maxAge: this.resolveCookieMaxAgeMs(),
    };
  }

  private resolveBooleanEnv(key: string): boolean | undefined {
    const value = process.env[key]?.trim().toLowerCase();

    if (value === 'true') return true;
    if (value === 'false') return false;

    return undefined;
  }

  private resolveSameSiteEnv(
    key: string,
  ): CookieOptions['sameSite'] | undefined {
    const value = process.env[key]?.trim().toLowerCase();

    if (value === 'none' || value === 'lax' || value === 'strict') {
      return value;
    }

    return undefined;
  }

  private resolveCookieMaxAgeMs(): number {
    const expiresIn = (process.env.JWT_EXPIRES_IN ?? '1d').trim();
    const match = expiresIn.match(/^(\d+)([smhd])?$/i);

    if (!match) {
      return 24 * 60 * 60 * 1000;
    }

    const value = Number(match[1]);
    const unit = match[2]?.toLowerCase() ?? 's';
    const unitMs: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * unitMs[unit];
  }
}
