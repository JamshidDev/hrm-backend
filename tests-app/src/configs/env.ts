// Environment config — .env'dan yuklanadi.

import 'dotenv/config';

function required(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (!value) {
    throw new Error(`Missing required env variable: ${key}`);
  }
  return value;
}

export const env = {
  laravelBaseUrl: required('LARAVEL_BASE_URL', 'http://localhost:8000'),
  nestjsBaseUrl: required('NESTJS_BASE_URL', 'http://localhost:8001'),
  adminPhone: required('ADMIN_PHONE'),
  adminPassword: required('ADMIN_PASSWORD'),
  httpTimeout: Number(process.env.HTTP_TIMEOUT ?? '15000'),
};
