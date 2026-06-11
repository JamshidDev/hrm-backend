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
  // Laravel X-Device-UUID header — UserMobileKey qidiruvi uchun.
  DEVICE_UUID: 'deviceUuid',
  // Laravel X-AUTH-TYPE header — UserResource mobile maydonlari (face/fcm/notifications) shartli.
  AUTH_TYPE: 'authType',
  IP: 'ip',
  USER_AGENT: 'userAgent',
  // Laravel QueryHelper::childIds — request davomida bir marta hisoblanadi, cache.
  ORG_SCOPE_IDS: 'orgScopeIds',
} as const;

export type ClsUser = AuthUser | null;
