// Exam moduli — sub-modullar uchun umumiy yordamchi funksiyalar.

import { max } from 'drizzle-orm';
import type { DataSource } from '@/db/types';

export interface PageQueryLike {
  page?: number | string;
  per_page?: number | string;
}

// Pagination uchun standart hisob: page, perPage, offset qaytaradi.
export function pageOf(q?: PageQueryLike) {
  const page = Number(q?.page ?? 1);
  const perPage = Number(q?.per_page ?? 10);
  return { page, perPage, offset: (page - 1) * perPage };
}

// MAX(id)+1 — Laravel parallel ishlashi uchun (sequence collision bo'lmasligi uchun).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function nextId(db: DataSource, table: any): Promise<number> {
  const [{ m }] = await db.select({ m: max(table.id) }).from(table);
  return Number(m ?? 0) + 1;
}
