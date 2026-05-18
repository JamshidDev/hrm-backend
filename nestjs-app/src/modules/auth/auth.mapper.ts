// Auth modul mapper'lari. OAuth check-code response uchun user shape.

import { toLaravelTimestamp } from '@/common/utils/datetime.util';
import type { ExchangeAuthCodeUser } from '@/modules/auth/types/oauth.type';

// Drizzle users.$inferSelect to'liq tipi shu fieldlarni o'z ichiga oladi.
export interface UserRow {
  id: number;
  uuid: string;
  phone: string | number; // DB bigint mode:number, lekin xavfsiz tomon
  phone_verified_at: string | null;
  is_verified: boolean;
  status: boolean;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
  organization_id: number | null;
  worker_id: number | null;
  password_changed_at: string | null;
}

export const AuthMapper = {
  // Laravel OAuthService::checkCode user shape — Eloquent toArray'dagi $hidden'dan
  // tashqari fieldlar.
  toExchangeAuthCodeUser(user: UserRow): ExchangeAuthCodeUser {
    return {
      id: user.id,
      uuid: user.uuid,
      phone: Number(user.phone),
      phone_verified_at: toLaravelTimestamp(user.phone_verified_at),
      is_verified: user.is_verified,
      status: user.status,
      created_at: toLaravelTimestamp(user.created_at),
      updated_at: toLaravelTimestamp(user.updated_at),
      deleted_at: toLaravelTimestamp(user.deleted_at),
      organization_id: user.organization_id,
      worker_id: user.worker_id,
      // Laravel'da bu field cast qilinmagan — Y-m-d H:i:s raw qaytadi.
      password_changed_at: user.password_changed_at,
    };
  },
};
