import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { useContainer } from 'class-validator';
import { AppModule } from '@/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // CORS — Laravel config/cors.php bilan parity:
  //   paths: api/*, v1/*, *
  //   allowed_methods: *
  //   allowed_origins: *  (origin: true → request Origin'ni qaytaradi)
  //   allowed_headers: *
  //   exposed_headers: Content-Type, X-CSRF-TOKEN
  //   supports_credentials: true
  // `origin: true` ishlatamiz (`*` emas) — credentials bilan ishlasin.
  app.enableCors({
    origin: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: '*',
    exposedHeaders: ['Content-Type', 'X-CSRF-TOKEN'],
    credentials: true,
    maxAge: 0,
  });

  // class-validator NestJS DI'ga ulanishi uchun (async validator'lar @InjectDb
  // kabi inject qila olishi uchun zarur — `@Exists` validator ishlashida).
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
      // Laravel parity — ValidationException 422 qaytaradi (default 400 emas).
      errorHttpStatusCode: 422,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('HRM Backend API')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer' }, 'access-token')
    .addGlobalParameters(
      {
        name: 'Accept-Language',
        in: 'header',
        required: false,
        schema: { type: 'string', default: 'uz', enum: ['uz', 'ru', 'en'] },
      },
      {
        name: 'X-Auth-Type',
        in: 'header',
        required: false,
        schema: {
          type: 'string',
          default: 'sanctum',
          enum: ['sanctum', 'mobile'],
        },
      },
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/documentation', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      // Default headers avtomatik yuboriladi (foydalanuvchi qo'lda kiritmasa ham).
      requestInterceptor: (req: { headers: Record<string, string> }) => {
        if (!req.headers['Accept-Language'])
          req.headers['Accept-Language'] = 'uz';
        if (!req.headers['X-Auth-Type']) req.headers['X-Auth-Type'] = 'sanctum';
        return req;
      },
    },
  });

  // Lifecycle hooks — onModuleDestroy, onApplicationShutdown chaqirilishi uchun.
  // Drizzle pool, Redis, BullMQ worker'lar shu orqali toza yopiladi.
  app.enableShutdownHooks();

  const port = Number(process.env.APP_PORT) || 8001;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`🚀 NestJS HRM running on http://localhost:${port}`);
  logger.log(`📚 Swagger: http://localhost:${port}/api/documentation`);

  // ============================================================
  // Graceful shutdown — eski watch process'lar zombie/orphan bo'lib qolmasin.
  //   SIGINT  → Ctrl+C
  //   SIGTERM → nest --watch restart, `kill PID`, Docker stop
  //   SIGHUP  → terminal yopilganda
  // ============================================================
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return; // Double-signal'dan himoyalanish
    shuttingDown = true;
    logger.log(`[${signal}] graceful shutdown boshlandi...`);
    try {
      await app.close();
      logger.log('[shutdown] toza yopildi');
      process.exit(0);
    } catch (err) {
      logger.error('[shutdown] xato:', err);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGHUP', () => void shutdown('SIGHUP'));

  // Uncaught xatolar — RAM leak oldini olish uchun toza yopiladi.
  process.on('uncaughtException', (err) => {
    logger.error('[uncaughtException]', err);
    void shutdown('uncaughtException');
  });
  process.on('unhandledRejection', (reason) => {
    logger.error('[unhandledRejection]', reason);
  });
}

void bootstrap();
