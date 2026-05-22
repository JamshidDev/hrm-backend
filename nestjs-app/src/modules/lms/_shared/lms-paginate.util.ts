// LMS uchun Laravel-parity pagination utility.
// Laravel response: { current_page, total, data } — per_page YO'Q.
// (Mavjud common/pagination/paginate.util.ts per_page qaytaradi; LMS modulida
//  parity uchun shu utilni ishlatamiz.)

import { count, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import type { DataSource, Tx } from '@/db/types';

export interface LmsPaginated<T> {
  current_page: number;
  total: number;
  data: T[];
}

export interface LmsPaginateOptions<TRow, TItem> {
  db: DataSource | Tx;
  countTable: PgTable;
  countWhere?: SQL;
  query: (args: { limit: number; offset: number }) => Promise<TRow[]>;
  page: number;
  perPage: number;
  mapper: (row: TRow, ctx?: unknown) => TItem;
  // mapList — agar mapper bir vaqtning o'zida barcha rowlarga kerakli kontekstga
  // muhtoj bo'lsa (masalan: positions_count batch joini), shu funksiya
  // mapping'ni o'z qo'lida qiladi. Bu holatda `mapper` e'tiborga olinmaydi.
  mapList?: (rows: TRow[]) => Promise<TItem[]> | TItem[];
}

export async function lmsPaginate<TRow, TItem>(
  opts: LmsPaginateOptions<TRow, TItem>,
): Promise<LmsPaginated<TItem>> {
  const { db, countTable, countWhere, query, page, perPage, mapper, mapList } =
    opts;
  const offset = (page - 1) * perPage;

  const countQuery = db.select({ total: count() }).from(countTable);
  if (countWhere) countQuery.where(countWhere);

  const [rows, [{ total }]] = await Promise.all([
    query({ limit: perPage, offset }),
    countQuery,
  ]);

  const data = mapList ? await mapList(rows) : rows.map((r) => mapper(r));

  return {
    current_page: page,
    total: Number(total),
    data,
  };
}

/** Page va perPage'ni query'dan normallashtirish. Default 1/10, max perPage 100. */
export function readPaging(q?: { page?: number; per_page?: number }) {
  const page = Math.max(1, Number(q?.page ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(q?.per_page ?? 10)));
  return { page, perPage };
}
