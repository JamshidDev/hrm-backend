// Statement Excel parser. Laravel: app/Jobs/Economist/StatementUploadJob.
//
// Excel struktura (Laravel `CollectionImportHeadingRow(2)` parity):
//   - 0..1 indeksli qatorlar — sarlavha (skip)
//   - 2+ indeksli qatorlar — ma'lumot
//   - Index 0: full_name
//   - Index 1: PIN
//   - Index 2: position
//   - Index 3: main_salary
//   - Index 4: work_time
//   - Keyingi index'lar = to'lov kodlari raqamiga teng (index 5 → kod '005')
//
// Natija: `statements` jadvaliga 200ta qatordan iborat batch'larda insert,
// keyin `statement_aggregates`'ni har kod uchun yangilash.

import { sql } from 'drizzle-orm';
import type { DataSource } from '@/db/types';
import { statements, statement_aggregates, workers } from '@/db/schema';
import { ExcelService } from '@/shared/excel/excel.service';
import {
  TOTAL_ONE_COLUMNS,
  TOTAL_TWO_COLUMNS,
  TOTAL_THREE_COLUMNS,
  TOTAL_FIVE_COLUMNS,
  UNIQUE_CODES,
} from '@/modules/economist/_shared/code-groups';
import { inArray } from 'drizzle-orm';
import { eq, and } from 'drizzle-orm';

const BATCH_SIZE = 200;
const SKIP_ROWS = 2; // Sarlavha qatorlari

export interface StatementParseContext {
  db: DataSource;
  fileBuffer: Buffer;
  organizationId: number;
  year: number;
  month: number;
  uploadId: number;
}

export interface StatementParseResult {
  inserted: number;
  errors: string[];
}

/**
 * Statement Excel faylini parse qilib, `statements` jadvaliga insert,
 * keyin `statement_aggregates`'ni yangilaydi.
 */
export async function parseStatement(
  ctx: StatementParseContext,
  excel: ExcelService,
): Promise<StatementParseResult> {
  const { db, fileBuffer, organizationId, year, month, uploadId } = ctx;
  const errors: string[] = [];

  // 1. Excel'ni o'qish (2 ta sarlavha qatorni o'tkazib yuborish)
  const rows = await excel.readBuffer(fileBuffer, SKIP_ROWS);

  // 2. PIN'larni yig'ib, worker_id ga moslash uchun batch lookup
  const allPins: number[] = [];
  for (let i = 0; i < rows.length; i++) {
    const pin = ExcelService.toPin(rows[i][1]);
    if (pin !== null) allPins.push(pin);
  }
  const uniquePins = [...new Set(allPins)];
  const workerRows = uniquePins.length
    ? await db
        .select({ id: workers.id, pin: workers.pin })
        .from(workers)
        .where(inArray(workers.pin, uniquePins))
    : [];
  const workerMap = new Map<number, number>();
  for (const w of workerRows) {
    const pinNum = Number(w.pin);
    if (Number.isFinite(pinNum)) workerMap.set(pinNum, w.id);
  }

  // 3. Har qatorni statements record'iga aylantirish.
  // `Set<string>` qilamiz — `.has(code: string)` ga ruxsat beradi (typeof literal'lar emas).
  const ones = new Set<string>(TOTAL_ONE_COLUMNS);
  const twos = new Set<string>(TOTAL_TWO_COLUMNS);
  const threes = new Set<string>(TOTAL_THREE_COLUMNS);
  const fives = new Set<string>(TOTAL_FIVE_COLUMNS);
  const allUnique = new Set<string>(UNIQUE_CODES);

  const insertRecords: Record<string, unknown>[] = [];
  let rowIndex = SKIP_ROWS;
  for (const row of rows) {
    rowIndex++;
    const pin = ExcelService.toPin(row[1]);
    if (pin === null) {
      errors.push(`${rowIndex}-qatorda PIN bo'sh`);
      continue;
    }

    const fullName = ExcelService.toText(row[0]);
    const workerId = workerMap.get(pin) ?? null;
    if (!workerId) {
      errors.push(`${fullName || pin} tizimda topilmadi`);
    }

    // Codes: column index 5+ = kod raqami. Index N → kod String(N).padStart(3, '0').
    const codeValues: Record<string, number> = {};
    let totalOne = 0;
    let totalTwo = 0;
    let totalThree = 0;
    let totalFive = 0;

    // Excel ustun index 5+ — to'lov kodlari
    for (let i = 5; i < row.length; i++) {
      const code = String(i).padStart(3, '0');
      const value = ExcelService.toNumber(row[i]);
      if (value === 0) continue;

      if (ones.has(code)) {
        totalOne += value;
        codeValues[`s_${code}`] = value;
      } else if (twos.has(code)) {
        totalTwo += value;
        // Laravel parity: total_two saqlanadi, lekin s_<code> emas
      } else if (threes.has(code)) {
        totalThree += value;
        if (allUnique.has(code)) codeValues[`s_${code}`] = value;
      } else if (fives.has(code)) {
        totalFive += value;
        codeValues[`s_${code}`] = value;
      }
    }
    const totalFour = totalOne + totalThree;

    insertRecords.push({
      economist_upload_id: uploadId,
      organization_id: organizationId,
      worker_id: workerId,
      pin,
      year,
      month,
      full_name: fullName || null,
      position: ExcelService.toText(row[2]) || null,
      main_salary: ExcelService.toNumber(row[3]),
      work_time: ExcelService.toNumber(row[4]),
      total_one: totalOne,
      total_two: totalTwo,
      total_three: totalThree,
      total_four: totalFour,
      total_five: totalFive,
      ...codeValues,
      created_at: sql`NOW()`,
      updated_at: sql`NOW()`,
    });
  }

  // 4. Batch insert (200tadan)
  let inserted = 0;
  for (let i = 0; i < insertRecords.length; i += BATCH_SIZE) {
    const batch = insertRecords.slice(i, i + BATCH_SIZE);
    if (batch.length === 0) continue;
    // Drizzle insert.values() har bir field uchun aniq tip kutadi (200+ s_NNN);
    // dynamic record sifatida `as never` orqali type-safe cast (runtime to'g'ri).
    await db.insert(statements).values(batch as never);
    inserted += batch.length;
  }

  // 5. Aggregatsiya — har kod uchun statement_aggregates'ni yangilash
  if (inserted > 0) {
    await refreshStatementAggregates(db, organizationId, year, month);
  }

  return { inserted, errors };
}

/**
 * Berilgan (organization, year, month) uchun har bir s_<code> ustunidan
 * statement_aggregates'ni qayta hisoblash (upsert).
 *
 * Laravel: `SELECT month, year, organization_id, SUM(COALESCE(s_NNN,0)) AS s_NNN
 *           FROM statements WHERE org=? AND year=? AND month=? GROUP BY org, year, month`
 * keyin har bir code uchun updateOrInsert.
 */
async function refreshStatementAggregates(
  db: DataSource,
  organizationId: number,
  year: number,
  month: number,
) {
  // Birinchi: shu period uchun eski aggregate'larni o'chiramiz (clean slate)
  await db
    .delete(statement_aggregates)
    .where(
      and(
        eq(statement_aggregates.organization_id, organizationId),
        eq(statement_aggregates.year, year),
        eq(statement_aggregates.month, month),
      ),
    );

  // SUM(s_<code>) — bir queryda barcha kodlar bo'yicha
  const sumFragments = UNIQUE_CODES.map(
    (c) => sql`SUM(COALESCE(${sql.raw(`s_${c}`)}, 0)) AS s_${sql.raw(c)}`,
  );

  const [aggRow] = await db.execute<Record<string, number>>(
    sql`SELECT ${sql.join(sumFragments, sql.raw(', '))}
        FROM statements
        WHERE organization_id = ${organizationId}
          AND year = ${year}
          AND month = ${month}
          AND deleted_at IS NULL`,
  );

  if (!aggRow) return;

  // Har kod uchun yangi qator
  const aggInserts: Record<string, unknown>[] = [];
  for (const code of UNIQUE_CODES) {
    const key = `s_${code}`;
    const value = Number(aggRow[key] ?? 0);
    if (value === 0) continue;
    aggInserts.push({
      organization_id: organizationId,
      year,
      month,
      code: Number(code),
      total_sum: value,
      created_at: sql`NOW()`,
      updated_at: sql`NOW()`,
    });
  }

  if (aggInserts.length > 0) {
    await db.insert(statement_aggregates).values(aggInserts as never);
  }
}
