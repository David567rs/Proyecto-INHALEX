import {
  Controller,
  Get,
  Header,
  Post,
  UnauthorizedException,
  UseGuards,
  type INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { privateResponseCachePolicy } from './response-cache-policy';

@Controller()
class CachePolicyFixtureController {
  @Get('account')
  getAccount() {
    return { email: 'private@example.test' };
  }

  @Post('orders')
  createOrder() {
    return { reference: 'private-order' };
  }

  @Get('guarded')
  @UseGuards({
    canActivate: () => {
      throw new UnauthorizedException();
    },
  })
  guarded() {
    return {};
  }

  @Get('public-catalog')
  @Header('Cache-Control', 'public, max-age=0, must-revalidate')
  publicCatalog() {
    return { items: [] };
  }
}

describe('API response cache policy', () => {
  let app: INestApplication<Server>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [CachePolicyFixtureController],
    }).compile();
    app = module.createNestApplication();
    app.use(privateResponseCachePolicy);
    await app.init();
  });

  afterAll(async () => app.close());

  it('prevents a private GET from being stored by browsers and proxies', async () => {
    await request(app.getHttpServer())
      .get('/account')
      .expect('Cache-Control', 'private, no-store, max-age=0')
      .expect(200);
  });

  it('also covers mutations and authentication failures', async () => {
    await request(app.getHttpServer())
      .post('/orders')
      .expect('Cache-Control', 'private, no-store, max-age=0')
      .expect(201);
    await request(app.getHttpServer())
      .get('/guarded')
      .expect('Cache-Control', 'private, no-store, max-age=0')
      .expect(401);
  });

  it('requires an explicit controller policy for public responses', async () => {
    await request(app.getHttpServer())
      .get('/public-catalog')
      .expect('Cache-Control', 'public, max-age=0, must-revalidate')
      .expect(200);
  });

  it('keeps missing routes uncacheable', async () => {
    await request(app.getHttpServer())
      .get('/missing')
      .expect('Cache-Control', 'private, no-store, max-age=0')
      .expect(404);
  });
});
