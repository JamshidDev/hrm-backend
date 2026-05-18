// Pension payment Excel parser. Laravel: app/Jobs/Economist/PensionPaymentUploadJob.
//
// Excel struktura (2 ta sarlavha qator skip):
//   - Index 0: PIN
//   - Index 1: last_name
//   - Index 2: first_name
//   - Index 3: middle_name
//   - Index 4: income_tax_paid
//   - Index 5: mandatory_pension_contribution
//   - Index 6: voluntary_pension_contribution
//   - Index 7: total_contributions

import { and, eq, inArray, sql } from 'drizzle-orm';
import type { DataSource } from '@/db/types';
import {
  pension_payments,
  pension_payment_aggregates,
  workers,
} from '@/db/schema';
import { ExcelService } from '@/shared/excel/excel.service';

const BATCH_SIZE = 200;
const SKIP_ROWS = 2;
const AGGREGATE_COLUMNS = [
  'income_tax_paid',
  'mandatory_pension_contribution',
  'voluntary_pension_contribution',
  'total_contributions',
] as const;

export interface PensionParseContext {
  db: DataSource;
  fileBuffer: Buffer;
  organizationId: number;
  year: number;
  month: number;
  uploadId: number;
}

export interface PensionParseResult {
  inserted: number;
  errors: string[];
}

export async function parsePension(
  ctx: PensionParseContext,
  excel: ExcelService,
): Promise<PensionParseResult> {
  const { db, fileBuffer, organizationId, year, month, uploadId } = ctx;
  const errors: string[] = [];
  const rows = await excel.readBuffer(fileBuffer, SKIP_ROWS);

  // Worker lookup (PIN → worker)
  const pins: number[] = [];
  for (const r of rows) {
    const pin = ExcelService.toPin(r[0]);
    if (pin !== null) pins.push(pin);
  }
  const uniquePins = [...new Set(pins)];
  const workerRows = uniquePins.length
    ? await db
        .select({
          id: workers.id,
          pin: workers.pin,
          last_name: workers.last_name,
          first_name: workers.first_name,
          middle_name: workers.middle_name,
        })
        .from(workers)
        .where(inArray(workers.pin, uniquePins))
    : [];
  const workerMap = new Map<number, (typeof workerRows)[0]>();
  for (const w of workerRows) {
    const pinNum = Number(w.pin);
    if (Number.isFinite(pinNum)) workerMap.set(pinNum, w);
  }

  const insertRecords: Record<string, unknown>[] = [];
  let rowIndex = SKIP_ROWS;
  for (const row of rows) {
    rowIndex++;
    const pin = ExcelService.toPin(row[0]);
    if (pin === null) {
      errors.push(`${rowIndex}-qatorda PIN bo'sh`);
      continue;
    }

    const worker = workerMap.get(pin);

    insertRecords.push({
      economist_upload_id: uploadId,
      organization_id: organizationId,
      worker_id: worker?.id ?? null,
      pin,
      year,
      month,
      // Worker topilsa, undan FIO oladi (Laravel parity); aksincha — Excel'dan
      last_name: worker?.last_name ?? ExcelService.toText(row[1]) ?? null,
      first_name: worker?.first_name ?? ExcelService.toText(row[2]) ?? null,
      middle_name: worker?.middle_name ?? ExcelService.toText(row[3]) ?? null,
      income_tax_paid: ExcelService.toNumber(row[4]),
      mandatory_pension_contribution: ExcelService.toNumber(row[5]),
      voluntary_pension_contribution: ExcelService.toNumber(row[6]),
      total_contributions: ExcelService.toNumber(row[7]),
      created_at: sql`NOW()`,
      updated_at: sql`NOW()`,
    });
  }

  let inserted = 0;
  for (let i = 0; i < insertRecords.length; i += BATCH_SIZE) {
    const batch = insertRecords.slice(i, i + BATCH_SIZE);
    if (batch.length === 0) continue;
    await db.insert(pension_payments).values(batch as never);
    inserted += batch.length;
  }

  if (inserted > 0) {
    await refreshPensionAggregates(db, organizationId, year, month);
  }

  return { inserted, errors };
}

async function refreshPensionAggregates(
  db: DataSource,
  organizationId: number,
  year: number,
  month: number,
) {
  await db
    .delete(pension_payment_aggregates)
    .where(
      and(
        eq(pension_payment_aggregates.organization_id, organizationId),
        eq(pension_payment_aggregates.year, year),
        eq(pension_payment_aggregates.month, month),
      ),
    );

  for (const column of AGGREGATE_COLUMNS) {
    const [{ total }] = await db.execute<{ total: number }>(
      sql`SELECT COALESCE(SUM(${sql.raw(column)}), 0) AS total
          FROM pension_payments
          WHERE organization_id = ${organizationId}
            AND year = ${year}
            AND month = ${month}
            AND deleted_at IS NULL`,
    );
    if (Number(total) === 0) continue;
    await db.insert(pension_payment_aggregates).values({
      organization_id: organizationId,
      year,
      month,
      column,
      total_sum: Number(total),
      created_at: sql`NOW()`,
      updated_at: sql`NOW()`,
    });
  }
}
