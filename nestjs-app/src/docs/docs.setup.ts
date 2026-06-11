// Per-modul Swagger docs sozlamasi. /api/docs/<slug> — har biri:
//   - login (AuthModule) + o'sha modul endpointlari + "Authorize" (Bearer)
//   - bitta umumiy parol (basic-auth) bilan himoyalangan (UI ham, JSON ham)
// /api/docs — katalog (havolalar ro'yxati).

import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AuthModule } from '@/modules/auth/auth.module';
import { DOCS_GROUPS } from '@/docs/docs.modules';
import { docsBasicAuth } from '@/docs/docs.basic-auth';

const BASE = 'api/docs';

function buildConfig(title: string) {
  return new DocumentBuilder()
    .setTitle(title)
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
}

const UI_OPTIONS = {
  swaggerOptions: {
    persistAuthorization: true,
    requestInterceptor: (req: { headers: Record<string, string> }) => {
      if (!req.headers['Accept-Language'])
        req.headers['Accept-Language'] = 'uz';
      if (!req.headers['X-Auth-Type']) req.headers['X-Auth-Type'] = 'sanctum';
      return req;
    },
  },
};

function catalogHtml(): string {
  const links = DOCS_GROUPS.map(
    (g) =>
      `<li><a href="/${BASE}/${g.slug}">${g.title}</a> ` +
      `<code>/${BASE}/${g.slug}</code></li>`,
  ).join('\n');
  return `<!doctype html><html><head><meta charset="utf-8">
<title>HRM API Docs</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 16px}
h1{font-size:20px}li{margin:6px 0}code{color:#888;font-size:12px}a{text-decoration:none;color:#2563eb}</style>
</head><body><h1>HRM API — modul docs</h1>
<p>Har modul alohida hujjat. Login uchun ichidagi <code>POST /api/auth/login</code> ishlatiladi.</p>
<ul>\n${links}\n</ul></body></html>`;
}

export function setupDocs(app: NestExpressApplication): void {
  // Barcha /api/docs/* — bitta umumiy parol (UI + JSON). Setup'dan OLDIN mount.
  app.use(`/${BASE}`, docsBasicAuth);

  for (const group of DOCS_GROUPS) {
    const path = `${BASE}/${group.slug}`;
    const document = SwaggerModule.createDocument(
      app,
      buildConfig(`HRM API — ${group.title}`),
      // Login (AuthModule) har docs'ga qo'shiladi — mavjud login moduli, yangi auth emas.
      // deepScanRoutes: agregator modullarning import qilingan sub-modul controllerlarini ham qamrab oladi.
      { include: [AuthModule, group.module], deepScanRoutes: true },
    );
    SwaggerModule.setup(path, app, document, {
      ...UI_OPTIONS,
      jsonDocumentUrl: `${path}/json`,
    });
  }

  // Katalog sahifa.
  app.getHttpAdapter().get(`/${BASE}`, (_req: Request, res: Response) => {
    res.type('html').send(catalogHtml());
  });
}
