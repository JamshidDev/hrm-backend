// Turnstile module — shared helpers used across sub-modules.

import { max } from 'drizzle-orm';
import type { DataSource } from '@/db/types';

export interface PageQueryLike {
  page?: number | string;
  per_page?: number | string;
}

export function pageOf(q?: PageQueryLike) {
  const page = Number(q?.page ?? 1);
  const perPage = Number(q?.per_page ?? 10);
  return { page, perPage, offset: (page - 1) * perPage };
}

// MAX(id)+1 — used to keep Laravel parallel-running parity (no sequence collision).

export async function nextId(db: DataSource, table: any): Promise<number> {
  const [{ m }] = await db.select({ m: max(table.id) }).from(table);
  return Number(m ?? 0) + 1;
}

// Laravel: ScheduleTypeEnum::get($type) — lang bo'yicha tarjima.
// Source: lang/{uz,ru,en}/messages.php → turnstile.schedules.types.{one..five}.
const SCHEDULE_TYPE_NAMES: Record<string, Record<number, string>> = {
  uz: {
    1: 'Smena',
    2: 'Xar kunlik',
    3: '15 kunlik',
    4: '1 xaftalik',
    5: 'Maxsus',
  },
  ru: {
    1: 'Смена',
    2: 'Ежедневный',
    3: '15-дневный',
    4: 'Неделя (1 недельный)',
    5: 'Особенный',
  },
  en: {
    1: 'Shift',
    2: 'Daily',
    3: '15-day schedule',
    4: 'Weekly (1-week)',
    5: 'Custom schedule',
  },
};
export function scheduleTypeName(type: number, lang = 'uz'): string {
  const map = SCHEDULE_TYPE_NAMES[lang] ?? SCHEDULE_TYPE_NAMES.uz;
  return map[type] ?? '';
}

// Laravel: ScheduleTypeEnum::list — array of {id, name} (5 entries).
export function scheduleTypeList(
  lang = 'uz',
): Array<{ id: number; name: string }> {
  return [1, 2, 3, 4, 5].map((id) => ({
    id,
    name: scheduleTypeName(id, lang),
  }));
}

// Hardcoded white-list of worker_ids excluded from turnstile stats (Laravel: TurnstileService->whiteList).
export const TURNSTILE_WHITELIST = [62309, 16655, 25394, 19278, 587] as const;

// Organizations where turnstile devices aren't installed (Laravel: dontInstallDeviceOrgIds).
export const NO_DEVICE_ORG_IDS = [
  1, 222, 208, 197, 194, 188, 189, 192, 152, 153, 151, 63,
] as const;
