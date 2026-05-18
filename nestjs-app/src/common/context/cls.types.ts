// CLS (AsyncLocalStorage) context type'lari.
// Har bir HTTP request davomida saqlanadi: user, lang, deviceId, IP, requestId.

import type { AuthUser } from '@/common/types/auth-user.type';

export type Lang = 'uz' | 'ru' | 'en';

export const SUPPORTED_LANGS: Lang[] = ['uz', 'ru', 'en'];
export const DEFAULT_LANG: Lang = 'uz';

export const CLS_KEYS = {
  USER: 'user',
  LANG: 'lang',
  DEVICE_ID: 'deviceId',
  IP: 'ip',
  USER_AGENT: 'userAgent',
} as const;

export type ClsUser = AuthUser | null;
