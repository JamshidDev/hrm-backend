// Umumiy CRUD helper'lari — har modulda takrorlanadigan id/insert/guard/soft-delete
// mantig'ini markazlashtirish. `soft-delete.helper.ts` (notDeleted) uslubida:
// kichik interfeys constraint + funksiya. DataSource va Tx ikkalasida ishlaydi.

import { sql, eq, and, getTableName } from 'drizzle-orm';
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';
import { I18nService } from 'nestjs-i18n';
import type { DataSource, Tx } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import {
  notDeleted,
  type SoftDeletable,
} from '@/common/database/soft-delete.helper';
import { nowDb } from '@/common/utils/datetime.util';

// `id` ustuni bor jadval (SoftDeletable uslubida).
export interface Identifiable {
  id: AnyPgColumn;
}

// DataSource yoki transaction — helper'lar ikkalasida ishlaydi.
type Db = DataSource | Tx;

// MAX(id)+1 — Laravel parallel ishlash uchun manual ID (sequence o'rniga).
// CLAUDE.md: PostgreSQL sequence migrate qilish Laravel bilan konflikt qiladi.
export async function nextId(
  db: Db,
  table: PgTable & Identifiable,
): Promise<number> {
  const [row] = await db
    .select({ maxId: sql<number>`COALESCE(MAX(${table.id}), 0)` })
    .from(table);
  return Number(row?.maxId ?? 0) + 1;
}

// General insert. `record`'da `id` bo'lmasa — atomik MAX+1 beradi (transaction +
// jadval bo'yicha advisory lock, parallel create'larda dublikat id oldini oladi);
// `id` bor bo'lsa — to'g'ridan-to'g'ri insert. Yangi qator `id` sini qaytaradi.
export async function insertRecord(
  db: Db,
  table: PgTable & Identifiable,
  record: Record<string, unknown>,
): Promise<number> {
  if (record.id != null) {
    const [row] = await db
      .insert(table)
      .values(record as never)
      .returning({ id: table.id });
    return Number(row.id);
  }
  return db.transaction(async (tx) => {
    // Jadval-darajali transaction advisory lock — MAX+1 race'ni serializatsiya
    // qiladi (outer transaction commit'ida bo'shaydi).
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${getTableName(table)}))`,
    );
    const id = await nextId(tx, table);
    const [row] = await tx
      .insert(table)
      .values({ ...record, id } as never)
      .returning({ id: table.id });
    return Number(row.id);
  });
}

// Mavjudlik guard — Laravel `findOrFail` parity. Topilmasa BusinessException(404).
export async function findByIdOrFail(
  db: Db,
  table: PgTable & Identifiable & SoftDeletable,
  id: number,
  i18n: I18nService,
  messageKey = 'messages.not_found',
): Promise<{ id: number }> {
  const [row] = await db
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.id, id), notDeleted(table)))
    .limit(1);
  if (!row) {
    throw new BusinessException(404, i18n.t(messageKey));
  }
  return { id: Number(row.id) };
}

// Soft-delete — Laravel softDelete: `deleted_at = now()` (JS app vaqti, DB NOW() emas).
export async function softDeleteById(
  db: Db,
  table: PgTable & Identifiable & SoftDeletable,
  id: number,
): Promise<void> {
  await db.update(table).set({ deleted_at: nowDb() }).where(eq(table.id, id));
}
