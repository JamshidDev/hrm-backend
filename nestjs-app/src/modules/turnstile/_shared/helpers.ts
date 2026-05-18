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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function nextId(db: DataSource, table: any): Promise<number> {
  const [{ m }] = await db.select({ m: max(table.id) }).from(table);
  return Number(m ?? 0) + 1;
}

// Laravel: ScheduleTypeEnum::get($type) — translated label.
// Source: lang/uz/messages.php → turnstile.schedules.types.{one..five}.
export function scheduleTypeName(type: number): string {
  const map: Record<number, string> = {
    1: 'Smena',
    2: 'Xar kunlik',
    3: '15 kunlik',
    4: '1 xaftalik',
    5: 'Maxsus',
  };
  return map[type] ?? '';
}

// Laravel: ScheduleTypeEnum::list — array of {id, name} (5 entries).
export function scheduleTypeList(): Array<{ id: number; name: string }> {
  return [1, 2, 3, 4, 5].map((id) => ({ id, name: scheduleTypeName(id) }));
}

// Hardcoded white-list of worker_ids excluded from turnstile stats (Laravel: TurnstileService->whiteList).
export const TURNSTILE_WHITELIST = [62309, 16655, 25394, 19278, 587] as const;

// Organizations where turnstile devices aren't installed (Laravel: dontInstallDeviceOrgIds).
export const NO_DEVICE_ORG_IDS = [1, 222, 208, 197, 194, 188, 189, 192, 152, 153, 151, 63] as const;
