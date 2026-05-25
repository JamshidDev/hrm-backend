// Turnstile "absent scheduled workers" Excel builder.
// Laravel: App\Jobs\TurnstileJobs\TurnstileAbsentWorkersInRangeExcelJob.
//
// Berilgan sana oralig'ida jadvalga qo'yilgan, lekin turniketdan o'tmagan va
// ta'tilda bo'lmagan xodimlarni topadi (turnstile_worker_schedules + NOT EXISTS).
// turnstile_worker_schedules / terminal_events — partition jadvallar, shu sababli
// raw SQL ishlatamiz (schema.ts'da parent jadval yo'q).

import { sql } from 'drizzle-orm';
import type { DataSource } from '@/db/types';
import type { ExcelService } from '@/shared/excel/excel.service';

export interface AbsentWorkersParams {
  fromDate: string;
  toDate: string;
  // QueryHelper::childIds — foydalanuvchi ruxsat etilgan tashkilotlar.
  orgScopeIds: number[];
  // Ixtiyoriy filtrlar (filterByOrganizations).
  organizations?: string;
  organizationId?: number;
}

export async function buildAbsentWorkersExcel(
  db: DataSource,
  excel: ExcelService,
  params: AbsentWorkersParams,
  headings: string[],
): Promise<Buffer> {
  // worker_positions org-scope shartlari (Laravel WorkerPosition::filter →
  // filterByOrganizations: childIds + organizations + organization_id).
  const orgConds: ReturnType<typeof sql>[] = [];
  if (params.orgScopeIds.length > 0) {
    orgConds.push(sql`wp2.organization_id IN (${idList(params.orgScopeIds)})`);
  }
  if (params.organizations) {
    const ids = params.organizations
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
    if (ids.length > 0) {
      orgConds.push(sql`wp2.organization_id IN (${idList(ids)})`);
    }
  }
  if (params.organizationId != null) {
    orgConds.push(sql`wp2.organization_id = ${params.organizationId}`);
  }
  const orgWhere =
    orgConds.length > 0 ? sql` AND ${sql.join(orgConds, sql` AND `)}` : sql``;

  const result = await db.execute(sql`
    SELECT
      o.name as organization_name,
      CONCAT_WS(' ', w.last_name, w.first_name, w.middle_name) as full_name,
      p.name as position_name,
      COUNT(DISTINCT st.date) as absent_count,
      STRING_AGG(
        DISTINCT TO_CHAR(st.date, 'YYYY-MM-DD'),
        ', ' ORDER BY TO_CHAR(st.date, 'YYYY-MM-DD')
      ) as absent_days
    FROM turnstile_worker_schedules st
    JOIN workers w ON w.id = st.worker_id
    JOIN worker_positions wp ON wp.id = st.worker_position_id
    LEFT JOIN organizations o ON o.id = wp.organization_id
    LEFT JOIN positions p ON p.id = wp.position_id
    WHERE st.worker_position_id IN (
      SELECT wp2.id
      FROM worker_positions wp2
      WHERE wp2.status = 2
        AND wp2.is_turnstile = true
        AND wp2.deleted_at IS NULL${orgWhere}
    )
      AND st.date BETWEEN ${params.fromDate} AND ${params.toDate}
      AND st.work_status = 1
      AND st.start_time IS NOT NULL
      AND st.start_time <> '00:00:00'
      AND st.deleted_at IS NULL
      AND w.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM terminal_events te
        WHERE te.worker_id = st.worker_id
          AND te.event_date_and_time >= st.date
          AND te.event_date_and_time < st.date + INTERVAL '1 day'
          AND te.deleted_at IS NULL
      )
      AND NOT EXISTS (
        SELECT 1 FROM vacations v
        WHERE v.worker_id = st.worker_id
          AND v."from" <= st.date
          AND v."to" >= st.date
          AND v.deleted_at IS NULL
      )
    GROUP BY w.id, o.name, w.last_name, w.first_name, w.middle_name, p.name
    ORDER BY absent_count DESC, o.name, full_name
  `);

  const rows = rowsOf(result).map((r) => ({
    organization_name: (r.organization_name as string | null) ?? '',
    full_name: (r.full_name as string | null) ?? '',
    position_name: (r.position_name as string | null) ?? '',
    absent_count: Number(r.absent_count ?? 0),
    absent_days: (r.absent_days as string | null) ?? '',
  }));

  return excel.build({
    creator: 'HRM',
    sheets: [
      {
        name: 'Worksheet',
        // Laravel DynamicExportFromArray::styles — 1-qator faqat bold.
        headerStyle: { bold: true },
        columns: [
          { header: headings[0], key: 'organization_name', width: 30 },
          { header: headings[1], key: 'full_name', width: 30 },
          { header: headings[2], key: 'position_name', width: 28 },
          { header: headings[3], key: 'absent_count', width: 14 },
          { header: headings[4], key: 'absent_days', width: 50 },
        ],
        rows,
      },
    ],
  });
}

// db.execute natijasidan qatorlarni ajratadi.
function rowsOf(result: unknown): Record<string, unknown>[] {
  const r = result as { rows?: unknown[] };
  return (Array.isArray(r.rows) ? r.rows : result) as Record<string, unknown>[];
}

// number[] → SQL "1, 2, 3" fragmenti.
function idList(ids: number[]): ReturnType<typeof sql.join> {
  return sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  );
}
