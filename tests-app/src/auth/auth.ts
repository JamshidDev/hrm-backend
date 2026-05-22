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
let integrationTokens: TokenPair | null = null;

async function login(
  target: 'laravel' | 'nestjs',
  phone: string,
  password: string,
): Promise<string> {
  const result = await request(target, {
    method: 'POST',
    path: '/api/auth/login',
    body: { phone, password },
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
  const [laravel, nestjs] = await Promise.all([
    login('laravel', env.adminPhone, env.adminPassword),
    login('nestjs', env.adminPhone, env.adminPassword),
  ]);
  adminTokens = { laravel, nestjs };
  return adminTokens;
}

export async function getIntegrationTokens(): Promise<TokenPair> {
  if (integrationTokens) return integrationTokens;
  const [laravel, nestjs] = await Promise.all([
    login('laravel', env.integrationPhone, env.integrationPassword),
    login('nestjs', env.integrationPhone, env.integrationPassword),
  ]);
  integrationTokens = { laravel, nestjs };
  return integrationTokens;
}

// Cache'ni tozalash (test paytida foydali emas, lekin re-run uchun).
export function resetTokenCache(): void {
  adminTokens = null;
  integrationTokens = null;
}

// AuthType → token mapping.
export async function tokensFor(auth: AuthType): Promise<TokenPair | null> {
  if (auth === 'guest') return null;
  if (auth === 'integration') return getIntegrationTokens();
  if (auth === 'admin' || auth === 'user') {
    // TODO: 'user' uchun alohida user credentials.
    return getAdminTokens();
  }
  throw new Error(`Unknown auth type: ${auth as string}`);
}
