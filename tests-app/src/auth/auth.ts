// Auth helper — Laravel va NestJS Sanctum token olish.
// Token cache bo'ladi — bir test run davomida bir marta login qilinadi.

import { env } from '@/configs/env';
import { request } from '@/helpers/http.client';
import type { AuthType } from '@/configs/types';

export interface TokenPair {
  laravel: string;
  nestjs: string;
}

interface LoginResponse {
  // Laravel: { access_token, message, must_change }
  // NestJS: { access_token, message, must_change }
  access_token?: string;
  data?: { access_token?: string };
}

let adminTokens: TokenPair | null = null;

async function login(target: 'laravel' | 'nestjs'): Promise<string> {
  const result = await request(target, {
    method: 'POST',
    path: '/api/auth/login',
    body: {
      phone: env.adminPhone,
      password: env.adminPassword,
    },
  });

  if (result.status !== 200) {
    throw new Error(
      `[${target}] login failed: status=${result.status}, body=${JSON.stringify(result.data)}`,
    );
  }

  const body = result.data as LoginResponse;
  // Laravel `Helper::response()` flat: { access_token, message }
  // Aslida login endpoint Helper::response orqali wrap qilingan: { message, error, data }.
  // Ikkalasini ham qo'llab-quvvatlaymiz.
  const token = body.access_token ?? body.data?.access_token;
  if (!token) {
    throw new Error(
      `[${target}] login response missing access_token: ${JSON.stringify(body)}`,
    );
  }
  return token;
}

export async function getAdminTokens(): Promise<TokenPair> {
  if (adminTokens) return adminTokens;
  const [laravel, nestjs] = await Promise.all([login('laravel'), login('nestjs')]);
  adminTokens = { laravel, nestjs };
  return adminTokens;
}

// Cache'ni tozalash (test paytida foydali emas, lekin re-run uchun).
export function resetTokenCache(): void {
  adminTokens = null;
}

// AuthType → token mapping. Hozir faqat 'admin' qo'llab-quvvatlanadi.
// Kelajakda 'user' (oddiy user), 'guest' (token yo'q) qo'shiladi.
export async function tokensFor(auth: AuthType): Promise<TokenPair | null> {
  if (auth === 'guest') return null;
  if (auth === 'admin' || auth === 'user') {
    // TODO: 'user' uchun alohida user credentials.
    return getAdminTokens();
  }
  throw new Error(`Unknown auth type: ${auth as string}`);
}
