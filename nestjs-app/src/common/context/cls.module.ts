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
          cls.set(
            CLS_KEYS.DEVICE_UUID,
            (req.headers['x-device-uuid'] as string) ?? null,
          );
          cls.set(
            CLS_KEYS.AUTH_TYPE,
            (req.headers['x-auth-type'] as string) ?? null,
          );
          // Laravel `$request->ip()` parity:
          //   - IPv6 localhost `::1` → IPv4 `127.0.0.1`
          //   - IPv4-mapped IPv6 `::ffff:1.2.3.4` → `1.2.3.4`
          const rawIp = req.ip ?? req.socket?.remoteAddress ?? null;
          cls.set(CLS_KEYS.IP, normalizeIp(rawIp));
          cls.set(CLS_KEYS.USER_AGENT, req.headers['user-agent'] ?? null);
        },
      },
    }),
  ],
  exports: [NestClsModule],
})
export class HrmClsModule {}

function normalizeIp(ip: string | null): string | null {
  if (!ip) return ip;
  if (ip === '::1') return '127.0.0.1';
  if (ip.startsWith('::ffff:')) return ip.slice(7);
  return ip;
}
