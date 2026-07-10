import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHmac, randomInt } from 'crypto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ExchangeAlexaLinkCodeDto } from './dto/exchange-alexa-link-code.dto';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { UserStatus } from '../users/enums/user-status.enum';
import { AuthSecurityService } from './auth-security.service';

const ALEXA_LINK_CODE_LENGTH = 5;
const ALEXA_LINK_CODE_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly authSecurityService: AuthSecurityService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);

    if (existingUser) {
      throw new ConflictException('El correo electrónico ya está en uso');
    }

    const firstName = registerDto.firstName.trim();
    const lastName = registerDto.lastName.trim();
    const fullName = `${firstName} ${lastName}`.replace(/\s+/g, ' ').trim();
    const phone = registerDto.phone.trim();
    const now = new Date();

    const passwordHash = await bcrypt.hash(registerDto.password, 12);
    const user = await this.usersService.create({
      name: fullName,
      firstName,
      lastName,
      email: registerDto.email,
      phone,
      passwordHash,
      lastLoginAt: now,
      lastSeenAt: now,
    });

    const accessToken = await this.generateAccessToken(user);
    return {
      accessToken,
      user: this.sanitizeUser(user),
    };
  }

  async login(loginDto: LoginDto, clientIp?: string) {
    const normalizedEmail = loginDto.email.toLowerCase().trim();
    this.authSecurityService.assertLoginAllowed(normalizedEmail, clientIp);

    const user = await this.usersService.findByEmail(normalizedEmail, true);

    if (!user) {
      this.authSecurityService.registerFailedLogin(normalizedEmail, clientIp);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      this.authSecurityService.registerFailedLogin(normalizedEmail, clientIp);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.status !== UserStatus.ACTIVE) {
      this.authSecurityService.registerFailedLogin(normalizedEmail, clientIp);
      throw new UnauthorizedException('La cuenta de usuario está inactiva');
    }

    this.authSecurityService.clearLoginFailures(normalizedEmail, clientIp);

    const activeUser = (await this.usersService.markLogin(user.id)) ?? user;
    const accessToken = await this.generateAccessToken(activeUser);
    return {
      accessToken,
      user: this.sanitizeUser(activeUser),
    };
  }

  async getProfile(userId: string) {
    const user =
      (await this.usersService.markActivity(userId)) ??
      (await this.usersService.findById(userId));

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return this.sanitizeUser(user);
  }

  async getAlexaLinkedProfile(alexaUserId: string, clientIp?: string) {
    const normalizedAlexaUserId = this.normalizeAlexaUserId(alexaUserId);
    const user = await this.usersService.findByAlexaUserIdHash(
      this.hashAlexaUserId(normalizedAlexaUserId),
    );

    if (!user) {
      this.logger.warn(
        `Alexa profile no vinculado ip=${clientIp ?? 'desconocida'}`,
      );
      throw new UnauthorizedException('Cuenta de Alexa no vinculada');
    }

    const activeUser = (await this.usersService.markLogin(user.id)) ?? user;
    const accessToken = await this.generateAccessToken(activeUser);

    return {
      accessToken,
      user: this.sanitizeUser(activeUser),
    };
  }

  async generateAlexaLinkCode(userId: string) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('La cuenta de usuario esta inactiva');
    }

    const rawCode = this.createAlexaLinkCode();
    const expiresAt = new Date(Date.now() + ALEXA_LINK_CODE_TTL_MS);
    const updatedUser = await this.usersService.storeAlexaLinkCode(
      userId,
      this.hashAlexaLinkCode(rawCode),
      expiresAt,
    );

    if (!updatedUser) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return {
      code: this.formatAlexaLinkCode(rawCode),
      expiresAt: expiresAt.toISOString(),
      expiresInSeconds: Math.floor(ALEXA_LINK_CODE_TTL_MS / 1000),
    };
  }

  async revokeAlexaLinkCode(userId: string) {
    await this.usersService.clearAlexaLinkCode(userId);
    return { revoked: true };
  }

  async exchangeAlexaLinkCode(
    exchangeDto: ExchangeAlexaLinkCodeDto,
    clientIp?: string,
  ) {
    let normalizedCode: string;
    try {
      normalizedCode = this.normalizeAlexaLinkCode(exchangeDto.code);
    } catch (error) {
      this.logger.warn(
        `Alexa link formato invalido ip=${clientIp ?? 'desconocida'} code=${this.maskAlexaLinkCode(exchangeDto.code)}`,
      );
      throw error;
    }

    this.logger.log(
      `Alexa link intento ip=${clientIp ?? 'desconocida'} code=${this.maskAlexaLinkCode(normalizedCode)}`,
    );

    const user = await this.usersService.findByAlexaLinkCodeHash(
      this.hashAlexaLinkCode(normalizedCode),
    );

    if (!user) {
      this.logger.warn(
        `Alexa link codigo no encontrado o expirado ip=${clientIp ?? 'desconocida'} code=${this.maskAlexaLinkCode(normalizedCode)}`,
      );
      throw new UnauthorizedException('Codigo de Alexa invalido o expirado');
    }

    await this.usersService.clearAlexaLinkCode(user.id, true);

    const activeUser = (await this.usersService.markLogin(user.id)) ?? user;
    const accessToken = await this.generateAccessToken(activeUser);

    return {
      accessToken,
      user: this.sanitizeUser(activeUser),
    };
  }

  private sanitizeUser(user: UserDocument) {
    const userObject = user.toObject() as unknown as {
      passwordHash?: string;
      alexaLinkCodeHash?: string;
      alexaLinkCodeExpiresAt?: Date;
      [key: string]: unknown;
    };
    const {
      passwordHash: _passwordHash,
      alexaLinkCodeHash: _alexaLinkCodeHash,
      alexaLinkCodeExpiresAt: _alexaLinkCodeExpiresAt,
      ...safeUser
    } = userObject;

    return safeUser;
  }

  private async generateAccessToken(user: UserDocument): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.signAsync(payload);
  }

  private createAlexaLinkCode(): string {
    let code = randomInt(1, 10).toString();

    for (let index = 1; index < ALEXA_LINK_CODE_LENGTH; index += 1) {
      code += randomInt(0, 10).toString();
    }

    return code;
  }

  private formatAlexaLinkCode(code: string): string {
    return code;
  }

  private maskAlexaLinkCode(code: string): string {
    const normalizedCode = code.replace(/\D/g, '');

    if (!normalizedCode) {
      return 'empty';
    }

    return '*'.repeat(Math.max(0, normalizedCode.length - 2)) +
      normalizedCode.slice(-2);
  }

  private normalizeAlexaLinkCode(code: string): string {
    const normalizedCode = code.replace(/\D/g, '');

    if (
      normalizedCode.length !== ALEXA_LINK_CODE_LENGTH ||
      !new RegExp(`^\\d{${ALEXA_LINK_CODE_LENGTH}}$`).test(normalizedCode)
    ) {
      throw new BadRequestException('Codigo de Alexa invalido');
    }

    return normalizedCode;
  }

  private normalizeAlexaUserId(alexaUserId: string): string {
    const normalizedAlexaUserId = String(alexaUserId || '').trim();

    if (
      normalizedAlexaUserId.length < 10 ||
      normalizedAlexaUserId.length > 300
    ) {
      throw new BadRequestException('Alexa user id invalido');
    }

    return normalizedAlexaUserId;
  }

  private hashAlexaLinkCode(code: string): string {
    return createHmac('sha256', this.getJwtSecret())
      .update(`alexa-link:${code}`)
      .digest('hex');
  }

  private hashAlexaUserId(alexaUserId: string): string {
    return createHmac('sha256', this.getJwtSecret())
      .update(`alexa-user:${alexaUserId}`)
      .digest('hex');
  }

  private getJwtSecret(): string {
    return this.configService.get<string>('JWT_SECRET') ?? 'dev_secret_change_me';
  }
}
