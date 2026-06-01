// Economist moduli — sub-modullar uchun umumiy yordamchi funksiyalar.

import { and, count, desc, eq, type SQL } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';

export interface PageQueryLike {
  page?: number | string;
  per_page?: number | string;
  year?: number | string;
  month?: number | string;
}

/**
 * Laravel `asset('resumes/economist/<file>')` ekvivalenti — example .xlsx
 * fayllari uchun to'liq (absolute) URL. APP_URL bazasidan quriladi
 * (Laravel APP_URL=http://localhost:8002, NestJS=http://localhost:8001 —
 * host/port tabiiy ravishda farq qiladi, shakl/path bir xil).
 */
export function economistAssetUrl(file: string): string {
  const base = (process.env.APP_URL ?? 'http://localhost:8001').replace(
    /\/+$/,
    '',
  );
  return `${base}/resumes/economist/${file}`;
}

/**
 * PHP `number_format($v, $decimals, '.', $sep)` ekvivalenti.
 *   number_format(16024162, 2, '.', ' ') → "16 024 162.00"
 *   number_format(16024162)               → "16,024,162"  (0 kasr, vergul)
 */
export function numberFormat(
  value: unknown,
  decimals = 0,
  thousandsSep: ',' | ' ' = ',',
): string {
  const n = Number(value) || 0;
  const s = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
  // en-US ',' ming ajratgich — kerakli ajratgichga almashtiramiz.
  return thousandsSep === ',' ? s : s.replace(/,/g, thousandsSep);
}

// Pagination uchun standart hisob: page, perPage, offset qaytaradi.
export function pageOf(q?: PageQueryLike) {
  const page = Number(q?.page ?? 1);
  const perPage = Number(q?.per_page ?? 10);
  return { page, perPage, offset: (page - 1) * perPage };
}

/**
 * Aksariyat Economist resurslar (statements, tax_*, pension_*, worker_categories)
 * uchun umumiy paginatsiya shartlari:
 *   - `id` (bigserial PK)
 *   - `year` (integer)
 *   - `month` (smallint|integer)
 *   - `deleted_at` (timestamp nullable)
 *
 * Drizzle har jadvalga noyob tipi beradi — bu interface'ga column'larni cast'lab
 * uzatamiz. (Tipi qattiq bo'lmasa ham, kerakli column'lar mavjudligini ta'kidlaydi.)
 */
export interface PaginatableTable extends PgTable {
  id: PgColumn;
  year: PgColumn;
  month: PgColumn;
  deleted_at: PgColumn;
}

/**
 * year/month filtri bilan jadval bo'yicha standart paginatsiya.
 * Caller `paginateByYearMonth(db, statements, q)` ko'rinishida chaqiradi —
 * Drizzle jadvali `PaginatableTable` shape'ga mos (PK + year + month + deleted_at).
 *
 * `from()`/`db.select()` Drizzle'da to'liq `PgTable` generic metadata talab qiladi,
 * shu sababli ichida `as PgTable` cast'lab uzatamiz. Caller tomonidan parametr
 * `PaginatableTable` orqali kerakli ustunlar mavjudligi tasdiqlanadi.
 */
export async function paginateByYearMonth<T extends PaginatableTable>(
  db: DataSource,
  table: T,
  q: PageQueryLike,
) {
  const { page, perPage, offset } = pageOf(q);
  const conds: SQL[] = [notDeleted(table)];
  if (q.year !== undefined) conds.push(eq(table.year, Number(q.year)));
  if (q.month !== undefined) conds.push(eq(table.month, Number(q.month)));
  const where = and(...conds);
  const t = table as PgTable;
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(t)
      .where(where)
      .orderBy(desc(table.id))
      .limit(perPage)
      .offset(offset),
    db.select({ total: count() }).from(t).where(where),
  ]);
  return {
    current_page: page,
    per_page: perPage,
    total: Number(total),
    data: rows,
  };
}
