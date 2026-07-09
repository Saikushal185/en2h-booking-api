import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { AllExceptionsFilter } from './../src/common/filters/all-exceptions.filter';

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

/**
 * End-to-end happy path for authentication. Requires the Postgres container to
 * be running and migrations applied (see README). Mirrors the app's global
 * pipe/filter/prefix so behaviour matches production.
 */
describe('Auth flow (e2e)', () => {
  let app: INestApplication<App>;
  const email = `e2e_${Date.now()}@en2h.com`;
  const password = 'S3curePass!';
  let refreshToken: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers a new user and returns tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password })
      .expect(201);
    const body = res.body as TokenResponse;
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
    refreshToken = body.refreshToken;
  });

  it('rejects duplicate registration with 409', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password })
      .expect(409);
  });

  it('logs in with valid credentials', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);
  });

  it('rejects invalid credentials with 401', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'wrong-password' })
      .expect(401);
  });

  it('exchanges a refresh token for a new pair', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(200);
    const body = res.body as TokenResponse;
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
  });

  it('blocks protected routes without a token', async () => {
    await request(app.getHttpServer()).get('/api/services').expect(401);
  });
});
