import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { useContainer, type ValidationError } from 'class-validator';
import methodOverride from 'method-override';
import type { Request } from 'express';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { AppModule } from '@/app.module';
import { LaravelValidationException } from '@/common/exceptions/validation.exception';
import { setupDocs } from '@/docs/docs.setup';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  // E-IMZO imzo `code` (PKCS7) ~300KB+ keladi; OnlyOffice callback va base64
  // upload'lar ham katta. NestJS default 100KB limitini Laravel kabi oshiramiz
  // (Laravel `post_max_size` odatda 50M). 50MB — barcha holatlar uchun yetarli.
  app.useBodyParser('json', { limit: '50mb' });
  app.useBodyParser('urlencoded', { limit: '50mb', extended: true });

  // Laravel `public/` statik fayllari — `asset('resumes/...')` ekvivalenti.
  // example .xlsx fayllar `/resumes/economist/*.xlsx` URL'da yuklab olinadi.
  app.useStaticAssets(join(__dirname, '..', '..', 'public'));

  // Laravel'da ETag avtomatik yaratilmaydi — Express default'ini o'chiramiz.
  // Frontend `If-None-Match` yuborganda 304 Not Modified qaytmasligi uchun
  // (304 + bo'sh body Laravel parity'ni buzadi).
  app.getHttpAdapter().getInstance().set('etag', false);

  // Laravel parity — `?_method=PUT/PATCH/DELETE` orqali POST so'rovni
  // mos HTTP method'ga aylantirish (Laravel'da `_method` field standart).
  // Frontend multipart/form-data bilan PUT yuborishda shu pattern ishlatadi.
  app.use(
    methodOverride((req: Request): string => {
      const fromQuery = req.query?._method;
      if (typeof fromQuery === 'string') return fromQuery;
      const body = req.body as Record<string, unknown> | undefined;
      const fromBody = body?._method;
      return typeof fromBody === 'string' ? fromBody : '';
    }),
  );

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
      // Laravel ValidationException body parity: { message, errors }.
      // Xom xatolarni exception'ga o'rab beramiz — localize'ni filter qiladi.
      exceptionFactory: (errors: ValidationError[]) =>
        new LaravelValidationException(errors),
    }),
  );

  // Per-modul API docs — /api/docs/<modul> (login + modul, bitta umumiy parol).
  setupDocs(app);

  // Lifecycle hooks — onModuleDestroy, onApplicationShutdown chaqirilishi uchun.
  // Drizzle pool, Redis, BullMQ worker'lar shu orqali toza yopiladi.
  app.enableShutdownHooks();

  const port = Number(process.env.APP_PORT) || 8001;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`🚀 NestJS HRM running on http://localhost:${port}`);
  logger.log(`📚 API docs (katalog): http://localhost:${port}/api/docs`);

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
