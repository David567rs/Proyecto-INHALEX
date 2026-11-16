import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthSecurityService } from './auth-security.service';
import {
  EmailVerificationChallenge,
  EmailVerificationChallengeSchema,
} from './email-verification/email-verification.schema';
import {
  EmailVerificationRateLimitBucket,
  EmailVerificationRateLimitBucketSchema,
} from './email-verification/email-verification-rate-limit.schema';
import { EmailVerificationRateLimitService } from './email-verification/email-verification-rate-limit.service';
import { EmailVerificationService } from './email-verification/email-verification.service';
import { createGmailRegistrationCodeSender } from './email-verification/gmail-registration-code-sender';
import {
  REGISTRATION_CODE_SENDER,
  unavailableRegistrationCodeSender,
} from './email-verification/registration-code-sender';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      {
        name: EmailVerificationChallenge.name,
        schema: EmailVerificationChallengeSchema,
      },
      {
        name: EmailVerificationRateLimitBucket.name,
        schema: EmailVerificationRateLimitBucketSchema,
      },
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const expiresIn = (configService.get<string>('JWT_EXPIRES_IN') ??
          '1d') as StringValue;

        return {
          secret:
            configService.get<string>('JWT_SECRET') ?? 'dev_secret_change_me',
          signOptions: { expiresIn },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthSecurityService,
    JwtStrategy,
    JwtAuthGuard,
    EmailVerificationService,
    EmailVerificationRateLimitService,
    {
      provide: REGISTRATION_CODE_SENDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createGmailRegistrationCodeSender((key) => config.get<string>(key)) ??
        unavailableRegistrationCodeSender,
    },
  ],
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
