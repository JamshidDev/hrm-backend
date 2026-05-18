// Tax-five Excel parser. Laravel: app/Jobs/Economist/TaxFiveUploadJob.
//
// Excel struktura (3 ta sarlavha qator skip):
//   - Index 1: full_name
//   - Index 2: PIN
//   - Index 3: total_income
//   - Index 4: reported_income
//   - Index 5: income_type (1..4)
//   - Index 6: total_tax
//   - Index 7: reported_tax

import { and, eq, inArray, sql } from 'drizzle-orm';
import type { DataSource } from '@/db/types';
import {
  tax_five_applications,
  tax_five_aggregates,
  workers,
} from '@/db/schema';
import { ExcelService } from '@/shared/excel/excel.service';

const BATCH_SIZE = 200;
const SKIP_ROWS = 3;
const AGGREGATE_COLUMNS = [
  'total_income',
  'reported_income',
  'total_tax',
  'reported_tax',
] as const;

export interface TaxFiveParseContext {
  db: DataSource;
  fileBuffer: Buffer;
  organizationId: number;
  year: number;
  month: number;
  uploadId: number;
}

export interface TaxFiveParseResult {
  inserted: number;
  errors: string[];
}

export async function parseTaxFive(
  ctx: TaxFiveParseContext,
  excel: ExcelService,
): Promise<TaxFiveParseResult> {
  const { db, fileBuffer, organizationId, year, month, uploadId } = ctx;
  const errors: string[] = [];
  const rows = await excel.readBuffer(fileBuffer, SKIP_ROWS);

  // Worker lookup
  const pins: number[] = [];
  for (const r of rows) {
    const pin = ExcelService.toPin(r[2]);
    if (pin !== null) pins.push(pin);
  }
  const uniquePins = [...new Set(pins)];
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

  const insertRecords: Record<string, unknown>[] = [];
  let rowIndex = SKIP_ROWS;
  for (const row of rows) {
    rowIndex++;
    const pin = ExcelService.toPin(row[2]);
    if (pin === null) {
      errors.push(`${rowIndex}-qatorda PIN bo'sh`);
      continue;
    }

    let incomeType = Number(ExcelService.toNumber(row[5])) || 1;
    if (![1, 2, 3, 4].includes(incomeType)) incomeType = 1;

    insertRecords.push({
      economist_upload_id: uploadId,
      organization_id: organizationId,
      worker_id: workerMap.get(pin) ?? null,
      pin,
      year,
      month,
      full_name: ExcelService.toText(row[1]) || null,
      total_income: ExcelService.toNumber(row[3]),
      reported_income: ExcelService.toNumber(row[4]),
      income_type: incomeType,
      total_tax: ExcelService.toNumber(row[6]),
      reported_tax: ExcelService.toNumber(row[7]),
      created_at: sql`NOW()`,
      updated_at: sql`NOW()`,
    });
  }

  let inserted = 0;
  for (let i = 0; i < insertRecords.length; i += BATCH_SIZE) {
    const batch = insertRecords.slice(i, i + BATCH_SIZE);
    if (batch.length === 0) continue;
    await db.insert(tax_five_applications).values(batch as never);
    inserted += batch.length;
  }

  if (inserted > 0) {
    await refreshTaxFiveAggregates(db, organizationId, year, month);
  }

  return { inserted, errors };
}

async function refreshTaxFiveAggregates(
  db: DataSource,
  organizationId: number,
  year: number,
  month: number,
) {
  await db
    .delete(tax_five_aggregates)
    .where(
      and(
        eq(tax_five_aggregates.organization_id, organizationId),
        eq(tax_five_aggregates.year, year),
        eq(tax_five_aggregates.month, month),
      ),
    );

  for (const column of AGGREGATE_COLUMNS) {
    const [{ total }] = await db.execute<{ total: number }>(
      sql`SELECT COALESCE(SUM(${sql.raw(column)}), 0) AS total
          FROM tax_five_applications
          WHERE organization_id = ${organizationId}
            AND year = ${year}
            AND month = ${month}
            AND deleted_at IS NULL`,
    );
    if (Number(total) === 0) continue;
    await db.insert(tax_five_aggregates).values({
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
