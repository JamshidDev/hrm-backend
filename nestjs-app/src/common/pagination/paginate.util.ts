// Reusable pagination utility. Laravel `paginate($per_page)` ekvivalenti.
//
// Foydalanish — oddiy:
//   return paginate({
//     db: this.db,
//     countTable: countries,
//     countWhere: where,
//     query: ({ limit, offset }) =>
//       this.db.select().from(countries).where(where).orderBy(countries.id).limit(limit).offset(offset),
//     page,
//     perPage,
//     mapper: CountryMapper.toItem,
//   });
//
// Foydalanish — relational query (with relations):
//   return paginate({
//     db: this.db,
//     countTable: regions,
//     countWhere: where,
//     query: ({ limit, offset }) =>
//       this.db.query.regions.findMany({
//         where: { ... }, with: { country: true }, limit, offset,
//       }),
//     page,
//     perPage,
//     mapper: RegionMapper.toItem,
//   });

import { count, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import type { DataSource, Tx } from '@/db/types';

export interface PaginateOptions<TRow, TItem> {
  db: DataSource | Tx;
  // Count query uchun jadval va WHERE.
  countTable: PgTable;
  countWhere?: SQL | undefined;
  // List query — user yozadi (relational API yoki select() builder ham bo'ladi).
  query: (args: { limit: number; offset: number }) => Promise<TRow[]>;
  page: number;
  perPage: number;
  // Row → response item conversion.
  mapper: (row: TRow) => TItem;
}

export interface PaginatedResult<T> {
  current_page: number;
  total: number;
  data: T[];
}

export async function paginate<TRow, TItem>(
  opts: PaginateOptions<TRow, TItem>,
): Promise<PaginatedResult<TItem>> {
  const { db, countTable, countWhere, query, page, perPage, mapper } = opts;
  const offset = (page - 1) * perPage;

  // Count query — alohida.
  const countQuery = db.select({ total: count() }).from(countTable);
  if (countWhere) countQuery.where(countWhere);

  // List + count parallel.
  const [rows, [{ total }]] = await Promise.all([
    query({ limit: perPage, offset }),
    countQuery,
  ]);

  return {
    current_page: page,
    total: Number(total),
    data: rows.map(mapper),
  };
}
