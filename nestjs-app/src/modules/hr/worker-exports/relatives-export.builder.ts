// HR ishchilar qarindoshlari Excel builder.
// Laravel: App\Jobs\HR\WorkerRelativesExportJob.
//
// Ma'lumotlar oqimi:
//   1. worker_positions (scope + ACTIVE) → worker_id'lar.
//   2. worker_relatives (shu workerlar bo'yicha) + workers (full_name/pin) join.
//   3. Har qator: full_name, pin, relative (uz label), last/first/middle_name,
//      birthday, birth_place, post_name, address.

import { and, eq, sql } from 'drizzle-orm';
import type { DataSource } from '@/db/types';
import { worker_positions, worker_relatives, workers } from '@/db/schema';
import { notDeleted } from '@/common/database/soft-delete.helper';
import type { ExcelService } from '@/shared/excel/excel.service';

const POSITION_STATUS_ACTIVE = 2;

// Laravel `messages.worker.family.{one..fifteen}` — qarindoshlik turi.
const RELATIVE_KEYS: Record<number, string> = {
  1: 'one',
  2: 'two',
  3: 'three',
  4: 'four',
  5: 'five',
  6: 'six',
  7: 'seven',
  8: 'eight',
  9: 'nine',
  10: 'ten',
  11: 'eleven',
  12: 'twelve',
  13: 'thirteen',
  14: 'fourteen',
  15: 'fifteen',
};

export interface RelativesExportParams {
  orgScopeIds: number[];
  organizations?: string;
  organizationId?: number;
  // Qarindoshlik turi → label (uz/ru/en).
  relativeLabels: Record<number, string>;
}

export async function buildRelativesExcel(
  db: DataSource,
  excel: ExcelService,
  params: RelativesExportParams,
  headings: string[],
): Promise<Buffer> {
  if (params.orgScopeIds.length === 0) {
    return excel.build({
      creator: 'HRM',
      sheets: [
        {
          name: 'Worksheet',
          headerStyle: { bold: true },
          columns: emptyColumns(headings),
          rows: [],
        },
      ],
    });
  }

  // Memory'da huge IN listi o'rniga — bitta SQL'da EXISTS subquery + JOIN.
  // 63K+ worker IDni JS heap'ga olib chiqarmaymiz.
  const orgList = sql.join(
    params.orgScopeIds.map((id) => sql`${id}`),
    sql`, `,
  );
  let extraOrgsCond = sql``;
  if (params.organizations) {
    const extra = params.organizations
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
    if (extra.length > 0) {
      const extraList = sql.join(
        extra.map((id) => sql`${id}`),
        sql`, `,
      );
      extraOrgsCond = sql` AND wp.organization_id IN (${extraList})`;
    }
  }
  const singleOrgCond =
    params.organizationId != null
      ? sql` AND wp.organization_id = ${params.organizationId}`
      : sql``;

  // Bitta SELECT — worker_relatives + workers join + worker_positions EXISTS.
  const rows = await db
    .select({
      relative_type: worker_relatives.relative,
      r_last: worker_relatives.last_name,
      r_first: worker_relatives.first_name,
      r_middle: worker_relatives.middle_name,
      birthday: worker_relatives.birthday,
      birth_place: worker_relatives.birth_place,
      post_name: worker_relatives.post_name,
      address: worker_relatives.address,
      w_last: workers.last_name,
      w_first: workers.first_name,
      w_middle: workers.middle_name,
      pin: workers.pin,
    })
    .from(worker_relatives)
    .innerJoin(workers, eq(workers.id, worker_relatives.worker_id))
    .where(
      and(
        notDeleted(worker_relatives),
        sql`EXISTS (
          SELECT 1 FROM worker_positions wp
          WHERE wp.worker_id = ${worker_relatives.worker_id}
            AND wp.status = ${POSITION_STATUS_ACTIVE}
            AND wp.deleted_at IS NULL
            AND wp.organization_id IN (${orgList})${extraOrgsCond}${singleOrgCond}
        )`,
      ),
    );

  // 3-bosqich: qatorlarni map qilish (Laravel WorkerRelativesExportJob mapper'i).
  const data = rows.map((r) => ({
    full_name: joinName(r.w_last, r.w_first, r.w_middle),
    pin: r.pin != null ? String(r.pin) : '',
    relative:
      r.relative_type != null
        ? (params.relativeLabels[r.relative_type] ?? '')
        : '',
    last_name: r.r_last ?? '',
    first_name: r.r_first ?? '',
    middle_name: r.r_middle ?? '',
    birthday: r.birthday ?? '',
    birth_place: r.birth_place ?? '',
    post_name: r.post_name ?? '',
    address: r.address ?? '',
  }));

  return excel.build({
    creator: 'HRM',
    sheets: [
      {
        name: 'Worksheet',
        headerStyle: { bold: true },
        columns: [
          { header: headings[0], key: 'full_name', width: 30 },
          { header: headings[1], key: 'pin', width: 18 },
          { header: headings[2], key: 'relative', width: 18 },
          { header: headings[3], key: 'last_name', width: 22 },
          { header: headings[4], key: 'first_name', width: 22 },
          { header: headings[5], key: 'middle_name', width: 22 },
          { header: headings[6], key: 'birthday', width: 14 },
          { header: headings[7], key: 'birth_place', width: 30 },
          { header: headings[8], key: 'post_name', width: 26 },
          { header: headings[9], key: 'address', width: 32 },
        ],
        rows: data,
      },
    ],
  });
}

function joinName(
  last: string | null,
  first: string | null,
  middle: string | null,
): string {
  return [last, first, middle].filter((x) => x).join(' ');
}

function emptyColumns(headings: string[]) {
  return [
    { header: headings[0], key: 'full_name', width: 30 },
    { header: headings[1], key: 'pin', width: 18 },
    { header: headings[2], key: 'relative', width: 18 },
    { header: headings[3], key: 'last_name', width: 22 },
    { header: headings[4], key: 'first_name', width: 22 },
    { header: headings[5], key: 'middle_name', width: 22 },
    { header: headings[6], key: 'birthday', width: 14 },
    { header: headings[7], key: 'birth_place', width: 30 },
    { header: headings[8], key: 'post_name', width: 26 },
    { header: headings[9], key: 'address', width: 32 },
  ];
}

// `OrgScopeService`'siz holatlar uchun ham foydali — RELATIVE_KEYS export.
export { RELATIVE_KEYS };
