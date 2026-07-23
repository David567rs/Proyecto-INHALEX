import 'reflect-metadata';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { MonthlyDemandController } from './monthly-demand.controller';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';

const VALID_PRODUCT_ID = '507f1f77bcf86cd799439011';

describe('Intelligence HTTP contracts', () => {
  describe('POST /recommendations/basket', () => {
    let app: INestApplication<App>;
    let recommendationsService: {
      recommendForBasket: jest.Mock;
      getAdminSummary: jest.Mock;
    };

    beforeAll(async () => {
      recommendationsService = {
        recommendForBasket: jest.fn().mockResolvedValue({
          source: 'none',
          recommendations: [],
          model: {
            version: 'test',
            isSynthetic: true,
            generatedAt: '2026-07-23T00:00:00.000Z',
          },
        }),
        getAdminSummary: jest.fn(),
      };

      const moduleFixture: TestingModule = await Test.createTestingModule({
        controllers: [RecommendationsController],
        providers: [
          {
            provide: RecommendationsService,
            useValue: recommendationsService,
          },
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: () => true })
        .overrideGuard(RolesGuard)
        .useValue({ canActivate: () => true })
        .compile();

      app = moduleFixture.createNestApplication();
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );
      await app.init();
    });

    afterAll(async () => {
      await app?.close();
    });

    beforeEach(() => {
      recommendationsService.recommendForBasket.mockClear();
    });

    it('accepts a valid basket, transforms limit and responds with HTTP 200', async () => {
      const response = await request(app.getHttpServer())
        .post('/recommendations/basket')
        .send({
          productIds: [VALID_PRODUCT_ID],
          limit: '2',
        })
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(
        expect.objectContaining({
          source: 'none',
          recommendations: [],
        }),
      );
      expect(recommendationsService.recommendForBasket).toHaveBeenCalledWith(
        [VALID_PRODUCT_ID],
        2,
      );
    });

    it.each([
      {
        name: 'an empty basket',
        payload: { productIds: [] },
      },
      {
        name: 'a non-Mongo product id',
        payload: { productIds: ['not-a-mongo-id'] },
      },
      {
        name: 'more than 25 products',
        payload: {
          productIds: Array.from({ length: 26 }, () => VALID_PRODUCT_ID),
        },
      },
      {
        name: 'an unsupported property',
        payload: { productIds: [VALID_PRODUCT_ID], unexpected: true },
      },
      {
        name: 'a limit outside the supported range',
        payload: { productIds: [VALID_PRODUCT_ID], limit: 4 },
      },
    ])('rejects $name with HTTP 400', async ({ payload }) => {
      await request(app.getHttpServer())
        .post('/recommendations/basket')
        .send(payload)
        .expect(HttpStatus.BAD_REQUEST);

      expect(recommendationsService.recommendForBasket).not.toHaveBeenCalled();
    });
  });

  describe('admin endpoint protection metadata', () => {
    it('protects the Apriori summary with JWT, roles guard and ADMIN role', () => {
      const handler = Object.getOwnPropertyDescriptor(
        RecommendationsController.prototype,
        'getAdminSummary',
      )?.value as object;

      expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
        JwtAuthGuard,
        RolesGuard,
      ]);
      expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([UserRole.ADMIN]);
    });

    it('protects the monthly demand forecast with JWT, roles guard and ADMIN role', () => {
      expect(
        Reflect.getMetadata(GUARDS_METADATA, MonthlyDemandController),
      ).toEqual([JwtAuthGuard, RolesGuard]);
      expect(Reflect.getMetadata(ROLES_KEY, MonthlyDemandController)).toEqual([
        UserRole.ADMIN,
      ]);
    });
  });
});
