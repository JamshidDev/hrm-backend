// Global CLS modul. Har request uchun: lang (Accept-Language), deviceId, IP, userAgent.
// User'ni AuthHybridGuard keyin set qiladi.

import { Module } from '@nestjs/common';
import { ClsModule as NestClsModule } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import {
  CLS_KEYS,
  DEFAULT_LANG,
  SUPPORTED_LANGS,
  type Lang,
} from '@/common/context/cls.types';

@Module({
  imports: [
    NestClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
        idGenerator: () => randomUUID(),
        setup: (cls, req: Request) => {
          // Laravel SetLocale bilan ekzakt mos: Accept-Language header.
          const rawLang = (req.headers['accept-language'] as string) ?? '';
          const lang: Lang = SUPPORTED_LANGS.includes(rawLang as Lang)
            ? (rawLang as Lang)
            : DEFAULT_LANG;

          cls.set(CLS_KEYS.USER, null);
          cls.set(CLS_KEYS.LANG, lang);
          cls.set(
            CLS_KEYS.DEVICE_ID,
            (req.headers['x-device-id'] as string) ?? null,
          );
          cls.set(CLS_KEYS.IP, req.ip ?? req.socket?.remoteAddress ?? null);
          cls.set(CLS_KEYS.USER_AGENT, req.headers['user-agent'] ?? null);
        },
      },
    }),
  ],
  exports: [NestClsModule],
})
export class HrmClsModule {}
