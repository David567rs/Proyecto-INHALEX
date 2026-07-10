import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ExchangeAlexaLinkCodeDto } from './dto/exchange-alexa-link-code.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  login(@Body() loginDto: LoginDto, @Req() request: Request) {
    return this.authService.login(loginDto, this.resolveClientIp(request));
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
}
