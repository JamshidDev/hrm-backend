// Tax-four Excel parser. Laravel: app/Jobs/Economist/TaxFourUploadJob.
//
// Excel struktura (3 ta sarlavha qator skip):
//   - Index 1: full_name
//   - Index 2: position
//   - Index 3: PIN
//   - Index 4: employee_status (1..2)
//   - Index 5: contract_type (1..4)
//   - Index 6: total_salary_income
//   - Index 7: reported_salary_income
//   - Index 8: total_tax
//   - Index 9: reported_tax

import { and, eq, inArray, sql } from 'drizzle-orm';
import type { DataSource } from '@/db/types';
import {
  tax_four_applications,
  tax_four_aggregates,
  workers,
} from '@/db/schema';
import { ExcelService } from '@/shared/excel/excel.service';

const BATCH_SIZE = 200;
const SKIP_ROWS = 3;
const AGGREGATE_COLUMNS = [
  'total_salary_income',
  'reported_salary_income',
  'total_tax',
  'reported_tax',
] as const;

export interface TaxFourParseContext {
  db: DataSource;
  fileBuffer: Buffer;
  organizationId: number;
  year: number;
  month: number;
  uploadId: number;
}

export interface TaxFourParseResult {
  inserted: number;
  errors: string[];
}

export async function parseTaxFour(
  ctx: TaxFourParseContext,
  excel: ExcelService,
): Promise<TaxFourParseResult> {
  const { db, fileBuffer, organizationId, year, month, uploadId } = ctx;
  const errors: string[] = [];
  const rows = await excel.readBuffer(fileBuffer, SKIP_ROWS);

  // Worker lookup
  const pins: number[] = [];
  for (const r of rows) {
    const pin = ExcelService.toPin(r[3]);
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

  // Build records
  const insertRecords: Record<string, unknown>[] = [];
  let rowIndex = SKIP_ROWS;
  for (const row of rows) {
    rowIndex++;
    const pin = ExcelService.toPin(row[3]);
    if (pin === null) {
      errors.push(`${rowIndex}-qatorda PIN bo'sh`);
      continue;
    }

    // Status va contract_type — 1..2 va 1..4 oraliqlarida bo'lishi kerak
    let status = Number(ExcelService.toNumber(row[4])) || 1;
    if (![1, 2].includes(status)) status = 1;
    let contractType = Number(ExcelService.toNumber(row[5])) || 1;
    if (![1, 2, 3, 4].includes(contractType)) contractType = 1;

    insertRecords.push({
      economist_upload_id: uploadId,
      organization_id: organizationId,
      worker_id: workerMap.get(pin) ?? null,
      pin,
      year,
      month,
      full_name: ExcelService.toText(row[1]) || null,
      position: ExcelService.toText(row[2]) || null,
      employee_status: status,
      contract_type: contractType,
      total_salary_income: ExcelService.toNumber(row[6]),
      reported_salary_income: ExcelService.toNumber(row[7]),
      total_tax: ExcelService.toNumber(row[8]),
      reported_tax: ExcelService.toNumber(row[9]),
      created_at: sql`NOW()`,
      updated_at: sql`NOW()`,
    });
  }

  // Batch insert
  let inserted = 0;
  for (let i = 0; i < insertRecords.length; i += BATCH_SIZE) {
    const batch = insertRecords.slice(i, i + BATCH_SIZE);
    if (batch.length === 0) continue;
    await db.insert(tax_four_applications).values(batch as never);
    inserted += batch.length;
  }

  // Aggregate
  if (inserted > 0) {
    await refreshTaxFourAggregates(db, organizationId, year, month);
  }

  return { inserted, errors };
}

async function refreshTaxFourAggregates(
  db: DataSource,
  organizationId: number,
  year: number,
  month: number,
) {
  await db
    .delete(tax_four_aggregates)
    .where(
      and(
        eq(tax_four_aggregates.organization_id, organizationId),
        eq(tax_four_aggregates.year, year),
        eq(tax_four_aggregates.month, month),
      ),
    );

  for (const column of AGGREGATE_COLUMNS) {
    const [{ total }] = await db.execute<{ total: number }>(
      sql`SELECT COALESCE(SUM(${sql.raw(column)}), 0) AS total
          FROM tax_four_applications
          WHERE organization_id = ${organizationId}
            AND year = ${year}
            AND month = ${month}
            AND deleted_at IS NULL`,
    );
    if (Number(total) === 0) continue;
    await db.insert(tax_four_aggregates).values({
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
