// HTTP client — Laravel va NestJS uchun bir xil interface.
// `targetApp` orqali qaysi app'ga so'rov yuborilayotgani aniqlanadi.

import axios, { AxiosError, AxiosResponse } from 'axios';
import { env } from '@/configs/env';

export type TargetApp = 'laravel' | 'nestjs';

export interface RequestOpts {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string; // Misol: '/api/v1/structure/regions?per_page=3'
  body?: unknown;
  token?: string; // Sanctum token
}

export interface HttpResult {
  status: number;
  data: unknown;
  durationMs: number;
}

const baseUrls: Record<TargetApp, string> = {
  laravel: env.laravelBaseUrl,
  nestjs: env.nestjsBaseUrl,
};

export async function request(
  target: TargetApp,
  opts: RequestOpts,
): Promise<HttpResult> {
  const start = Date.now();
  const url = baseUrls[target] + opts.path;

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      // Laravel auth.hybrid middleware shu header bilan Sanctum guard tanlaydi.
      'X-Auth-Type': 'sanctum',
      // i18n default — Laravel/NestJS ikkalasi ham bir xil til ko'rsin.
      'Accept-Language': 'uz',
    };
    if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

    const response: AxiosResponse = await axios({
      method: opts.method,
      url,
      data: opts.body,
      headers,
      timeout: env.httpTimeout,
      // Laravel xato status'larida ham response.data kerak — har qanday status'ni qabul qilamiz.
      validateStatus: () => true,
    });

    return {
      status: response.status,
      data: response.data,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    const durationMs = Date.now() - start;
    if (err instanceof AxiosError) {
      // Connection refused, timeout, va h.k. — request HTTP'gacha yetib bormadi.
      throw new Error(
        `[${target}] HTTP error for ${opts.method} ${url}: ${err.message}`,
      );
    }
    throw err;
  }
}

// Helper — bir paytda ikkala app'ga so'rov yuborish.
export async function requestBoth(opts: {
  method: RequestOpts['method'];
  path: string;
  body?: unknown;
  laravelToken?: string;
  nestjsToken?: string;
}): Promise<{ laravel: HttpResult; nestjs: HttpResult }> {
  const [laravel, nestjs] = await Promise.all([
    request('laravel', {
      method: opts.method,
      path: opts.path,
      body: opts.body,
      token: opts.laravelToken,
    }),
    request('nestjs', {
      method: opts.method,
      path: opts.path,
      body: opts.body,
      token: opts.nestjsToken,
    }),
  ]);
  return { laravel, nestjs };
}
