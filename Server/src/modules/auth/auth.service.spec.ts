import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';

function buildUser(overrides: Record<string, unknown> = {}) {
  const user = {
    id: 'user-id',
    _id: 'user-id',
    name: 'Cliente Demo',
    firstName: 'Cliente',
    lastName: 'Demo',
    email: 'cliente@demo.com',
    phone: '7711111111',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    passwordHash: 'secret-hash',
    alexaLinkCodeHash: 'stored-secret',
    alexaLinkCodeExpiresAt: new Date(),
    ...overrides,
  };

  return {
    ...user,
    toObject: jest.fn(() => ({ ...user })),
  };
}

describe('AuthService - Alexa link code', () => {
  let service: AuthService;
  let usersService: any;
  let jwtService: any;
  let authSecurityService: any;
  let configService: any;

  beforeEach(() => {
    usersService = {
      findById: jest.fn(),
      storeAlexaLinkCode: jest.fn(),
      findByAlexaLinkCodeHash: jest.fn(),
      clearAlexaLinkCode: jest.fn(),
      markLogin: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('jwt-token'),
    };
    authSecurityService = {
      assertLoginAllowed: jest.fn(),
      registerFailedLogin: jest.fn(),
      clearLoginFailures: jest.fn(),
    };
    configService = {
      get: jest.fn().mockReturnValue('test-jwt-secret'),
    };

    service = new AuthService(
      usersService,
      jwtService,
      authSecurityService,
      configService,
    );
  });

  it('genera un codigo temporal y guarda solo el hash', async () => {
    const user = buildUser();
    usersService.findById.mockResolvedValue(user);
    usersService.storeAlexaLinkCode.mockResolvedValue(user);

    const response = await service.generateAlexaLinkCode('user-id');

    expect(response.code).toMatch(/^[1-9]\d{4}$/);
    expect(response.expiresInSeconds).toBe(600);
    expect(usersService.storeAlexaLinkCode).toHaveBeenCalledWith(
      'user-id',
      expect.stringMatching(/^[a-f0-9]{64}$/),
      expect.any(Date),
    );
    expect(usersService.storeAlexaLinkCode.mock.calls[0][1]).not.toBe(
      response.code,
    );
  });

  it('intercambia un codigo valido por un accessToken y limpia el codigo', async () => {
    const user = buildUser();
    usersService.findById.mockResolvedValue(user);
    usersService.storeAlexaLinkCode.mockResolvedValue(user);
    const generated = await service.generateAlexaLinkCode('user-id');
    const storedHash = usersService.storeAlexaLinkCode.mock.calls[0][1];

    usersService.findByAlexaLinkCodeHash.mockImplementation((hash: string) =>
      Promise.resolve(hash === storedHash ? user : null),
    );
    usersService.clearAlexaLinkCode.mockResolvedValue(user);
    usersService.markLogin.mockResolvedValue(user);

    const response = await service.exchangeAlexaLinkCode(
      { code: generated.code },
      '127.0.0.1',
    );

    expect(response.accessToken).toBe('jwt-token');
    expect(response.user).not.toHaveProperty('passwordHash');
    expect(response.user).not.toHaveProperty('alexaLinkCodeHash');
    expect(usersService.clearAlexaLinkCode).toHaveBeenCalledWith(
      'user-id',
      true,
    );
    expect(authSecurityService.clearLoginFailures).toHaveBeenCalledWith(
      'alexa-link',
      '127.0.0.1',
    );
  });

  it('rechaza codigos con formato invalido', async () => {
    await expect(
      service.exchangeAlexaLinkCode({ code: 'ABCD' }, '127.0.0.1'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(authSecurityService.registerFailedLogin).toHaveBeenCalledWith(
      'alexa-link',
      '127.0.0.1',
    );
  });
});
