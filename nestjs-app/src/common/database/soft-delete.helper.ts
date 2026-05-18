// Laravel SoftDeletes ekvivalenti — `deleted_at IS NULL` filtrlari uchun
// markazlashtirilgan helper. Har query'da `isNull(table.deleted_at)` qaytarmaslik
// uchun `notDeleted(table)` chaqiriladi.

import { isNull, type SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

// Type guard — soft-delete qo'llab-quvvatlovchi jadvalga `deleted_at` columni shart.
export interface SoftDeletable {
  deleted_at: AnyPgColumn;
}

export function notDeleted(table: SoftDeletable): SQL {
  return isNull(table.deleted_at);
}
