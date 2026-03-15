import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { UserStatus } from '../users/enums/user-status.enum';
import { AuthSecurityService } from './auth-security.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly authSecurityService: AuthSecurityService,
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

    const passwordHash = await bcrypt.hash(registerDto.password, 12);
    const user = await this.usersService.create({
      name: fullName,
      firstName,
      lastName,
      email: registerDto.email,
      phone,
      passwordHash,
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

    const accessToken = await this.generateAccessToken(user);
    return {
      accessToken,
      user: this.sanitizeUser(user),
    };
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return this.sanitizeUser(user);
  }

  private sanitizeUser(user: UserDocument) {
    const userObject = user.toObject() as unknown as {
      passwordHash?: string;
      [key: string]: unknown;
    };
    const { passwordHash: _passwordHash, ...safeUser } = userObject;

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
}
