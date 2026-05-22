// Worker search helper. Laravel: Worker::scopeSearchByFullName().
//
// `search` bo'sh joy bilan ajratiladi va har bir term last/first/middle_name
// OR ichida qidiriladi, terms o'rtasida AND. Plus pin/card to'liq search bilan.
//
// Misol:
//   search = "jamshid raximov shuxrat"
//   terms  = ["jamshid", "raximov", "shuxrat"]
//   SQL:
//     (last_name ILIKE %jamshid% OR first_name ILIKE %jamshid% OR middle_name ILIKE %jamshid%)
//     AND (last_name ILIKE %raximov% OR ...)
//     AND (last_name ILIKE %shuxrat% OR ...)
//   OR (CAST(pin AS TEXT) ILIKE %search% OR CAST(card AS TEXT) ILIKE %search%)

import { and, ilike, or, sql, type SQL } from 'drizzle-orm';
import { workers } from '@/db/schema';

/**
 * Worker.scopeSearchByFullName parity.
 * Qaytaradi: SQL condition (OR name+pin+card), yoki undefined agar search bo'sh.
 */
export function buildWorkerSearchCond(search?: string): SQL | undefined {
  if (!search?.trim()) return undefined;

  const trimmed = search.trim();
  const terms = trimmed.split(/\s+/).filter(Boolean);

  // Har bir term — name fieldlari ichida OR; terms o'rtasida AND.
  const nameAndExprs: SQL[] = [];
  for (const term of terms) {
    const pattern = `%${term}%`;
    const nameOr = or(
      ilike(workers.last_name, pattern),
      ilike(workers.first_name, pattern),
      ilike(workers.middle_name, pattern),
    );
    if (nameOr) nameAndExprs.push(nameOr);
  }
  const nameMatch = and(...nameAndExprs);

  // PIN va card uchun to'liq search bilan match (raqamlar bilan).
  const fullPattern = `%${trimmed}%`;
  const pinMatch = sql`CAST(${workers.pin} AS TEXT) ILIKE ${fullPattern}`;
  const cardNum = Number(trimmed);
  const cardMatch = Number.isFinite(cardNum)
    ? sql`CAST(${workers.card} AS TEXT) ILIKE ${`%${cardNum}%`}`
    : undefined;

  // Yakuniy OR: name match + pin + card (Laravel `orWhereLike`'lar).
  const orParts: SQL[] = [];
  if (nameMatch) orParts.push(nameMatch);
  orParts.push(pinMatch);
  if (cardMatch) orParts.push(cardMatch);

  return or(...orParts);
}
