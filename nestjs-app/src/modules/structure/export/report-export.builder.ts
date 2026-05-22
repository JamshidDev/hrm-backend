// Report-export hisobotini Excel buffer'iga aylantiruvchi builder.
// Laravel: App\Jobs\ReportExport\ByEducationJob + Modules\HR\Exports\OrganizationStatsDynamicExport.
//
// Ikki bosqich:
//   1. SQL agregatsiya — tashkilotlar bo'yicha xodimlar statistikasi (department_positions
//      + worker_positions + workers + worker_disabilities).
//   2. Tashkilot daraxti — leaderOrganizations qamrovi, parent_id bo'yicha tree, depth-first
//      flatten, oxirida 'Total' qatori.
// So'ng OrganizationStatsDynamicExport formatига mos Excel hosil qilinadi.

import { sql } from 'drizzle-orm';
import type { Worksheet } from 'exceljs';
import type { DataSource } from '@/db/types';
import type { ExcelService } from '@/shared/excel/excel.service';
import type { ExcelHeaderRow } from '@/shared/excel/types';

// ============================================================
// TIPLAR
// ============================================================

export interface ReportExportParams {
  // Joriy foydalanuvchining tashkiloti — leaderOrganizations qamrovini aniqlaydi.
  userOrgId: number | null;
  // Vergul bilan ajratilgan tashkilot id'lari (ixtiyoriy filtr).
  organizations?: string;
  // Hisobot turi (hozircha faqat 'by-education-age-invalid').
  type: string;
}

// SQL'dan kelgan tashkilot qatori (statistika bilan birga).
interface OrgStatRow {
  id: number;
  parent_id: number | null;
  name: string | null;
  _lft: number;
  approved_staff: number;
  workers_count: number;
  workers_man_count: number;
  workers_woman_count: number;
  age_under_30: number;
  age_30_45: number;
  age_over_45: number;
  education1_count: number;
  education1_man_count: number;
  education1_woman_count: number;
  education2_count: number;
  education2_man_count: number;
  education2_woman_count: number;
  education3_count: number;
  education3_man_count: number;
  education3_woman_count: number;
  pension_total_count: number;
  pension_man_count: number;
  pension_woman_count: number;
  disabled_total_count: number;
  disabled_man_count: number;
  disabled_woman_count: number;
  workers_contract2_count: number;
}

// Daraxt tuguni — bola tashkilotlar bilan.
interface OrgNode extends OrgStatRow {
  children: OrgNode[];
}

// Flatten qilingan qator (Laravel `flattenTree` natijasi).
type FlatRow = Record<string, string | number | boolean | null>;

// 23 ta statistik ustun — Laravel `flattenTree` $row tartibida.
const STAT_COLUMNS = [
  'approved_staff',
  'workers_count',
  'workers_man_count',
  'workers_woman_count',
  'age_under_30',
  'age_30_45',
  'age_over_45',
  'education1_count',
  'education1_man_count',
  'education1_woman_count',
  'education2_count',
  'education2_man_count',
  'education2_woman_count',
  'education3_count',
  'education3_man_count',
  'education3_woman_count',
  'pension_total_count',
  'pension_man_count',
  'pension_woman_count',
  'disabled_total_count',
  'disabled_man_count',
  'disabled_woman_count',
  'workers_contract2_count',
] as const;

// Rang kodlari (Laravel `getStyleEventByEducationAgeInvalid` ARGB qiymatlari).
const FILL_BLUE = 'FFB8CCE4';
const FILL_GREEN = 'FF92D050';
const FILL_ORANGE = 'FFFFC000';

// ============================================================
// PUBLIC — Excel buffer hosil qilish
// ============================================================

export async function buildReportExportExcel(
  db: DataSource,
  excel: ExcelService,
  params: ReportExportParams,
): Promise<Buffer> {
  const orgRows = await fetchOrgStats(db, params);
  const tree = buildTree(orgRows);

  // Flatten — depth-first, 1-based level. Totals har bir raqamli maydon bo'yicha.
  const rows: FlatRow[] = [];
  const totals: Record<string, number> = {};
  let maxDepth = 1;

  const flatten = (nodes: OrgNode[], level: number): void => {
    for (const node of nodes) {
      const hasChild = node.children.length > 0;
      const row: FlatRow = {
        id: node.id,
        level,
        has_child: hasChild,
        [`name_level_${level}`]: node.name,
        // approved_staff — Laravel: round(approved_staff / 100).
        approved_staff: Math.round((node.approved_staff ?? 0) / 100),
        workers_count: node.workers_count ?? 0,
        workers_man_count: node.workers_man_count ?? 0,
        workers_woman_count: node.workers_woman_count ?? 0,
        age_under_30: node.age_under_30 ?? 0,
        age_30_45: node.age_30_45 ?? 0,
        age_over_45: node.age_over_45 ?? 0,
        education1_count: node.education1_count ?? 0,
        education1_man_count: node.education1_man_count ?? 0,
        education1_woman_count: node.education1_woman_count ?? 0,
        education2_count: node.education2_count ?? 0,
        education2_man_count: node.education2_man_count ?? 0,
        education2_woman_count: node.education2_woman_count ?? 0,
        education3_count: node.education3_count ?? 0,
        education3_man_count: node.education3_man_count ?? 0,
        education3_woman_count: node.education3_woman_count ?? 0,
        pension_total_count: node.pension_total_count ?? 0,
        pension_man_count: node.pension_man_count ?? 0,
        pension_woman_count: node.pension_woman_count ?? 0,
        disabled_total_count: node.disabled_total_count ?? 0,
        disabled_man_count: node.disabled_man_count ?? 0,
        disabled_woman_count: node.disabled_woman_count ?? 0,
        workers_contract2_count: node.workers_contract2_count ?? 0,
      };

      // Raqamli maydonlarni totals'ga yig'amiz (id va level bundan mustasno).
      for (const [key, value] of Object.entries(row)) {
        if (typeof value === 'number' && key !== 'level' && key !== 'id') {
          totals[key] = (totals[key] ?? 0) + value;
        }
      }

      rows.push(row);
      maxDepth = Math.max(maxDepth, level);

      if (hasChild) {
        flatten(node.children, level + 1);
      }
    }
  };

  flatten(tree, 1);

  // Yakuniy 'Total' qatori.
  rows.push({
    id: 'Total',
    level: 1,
    has_child: false,
    name_level_1: 'Jami',
    ...totals,
  });

  return renderExcel(excel, rows, maxDepth);
}

// ============================================================
// SQL AGREGATSIYA — Laravel ByEducationJob::handle() porti
// ============================================================

async function fetchOrgStats(
  db: DataSource,
  params: ReportExportParams,
): Promise<OrgStatRow[]> {
  // leaderOrganizations — joriy foydalanuvchi tashkiloti subdaraxti.
  // Laravel scopeLeaderOrganizations: descendantsAndSelf bo'yicha har bir tugun uchun
  //   _lft BETWEEN max(node._lft - 1, userOrg._lft) AND node._rgt.
  // Bizda foydalanuvchi tashkiloti subdaraxti ([userOrg._lft, userOrg._rgt]) bilan
  // bir xil natija beradi — pastdagi `org_scope` shu diapazon.
  const leaderCond = await buildLeaderScope(db, params.userOrgId);

  // Ixtiyoriy `organizations` filtri — id'lar ro'yxati.
  const orgIds = params.organizations
    ? params.organizations
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0)
    : [];
  const orgIdsFilter =
    orgIds.length > 0
      ? sql`AND o.id IN (${sql.join(
          orgIds.map((id) => sql`${id}`),
          sql`, `,
        )})`
      : sql``;

  // ACTIVE worker_position status = 2 (PositionStatusEnum::ACTIVE).
  // Quyidagi SQL — Laravel ByEducationJob ichidagi raw SQL'ning aynan ko'chirmasi.
  const result = await db.execute(sql`
    WITH dept_sub AS (
      SELECT organization_id, SUM(rate) AS approved_staff
      FROM department_positions
      WHERE deleted_at IS NULL
      GROUP BY organization_id
    ),
    worker_sub AS (
      SELECT
        wp.organization_id,
        COUNT(DISTINCT wp.worker_id) as workers_count,
        COUNT(DISTINCT CASE WHEN w.sex = true THEN wp.worker_id END) as workers_man_count,
        COUNT(DISTINCT CASE WHEN w.sex = false THEN wp.worker_id END) as workers_woman_count,
        COUNT(DISTINCT CASE
            WHEN DATE_PART('year', AGE(CURRENT_DATE, w.birthday)) < 30
            THEN wp.worker_id END
        ) as age_under_30,
        COUNT(DISTINCT CASE
            WHEN DATE_PART('year', AGE(CURRENT_DATE, w.birthday)) BETWEEN 30 AND 45
            THEN wp.worker_id END
        ) as age_30_45,
        COUNT(DISTINCT CASE
            WHEN DATE_PART('year', AGE(CURRENT_DATE, w.birthday)) > 45
            THEN wp.worker_id END
        ) as age_over_45,
        /* ===== EDUCATION 1 ===== */
        COUNT(DISTINCT CASE
            WHEN w.education = 1 THEN wp.worker_id
        END) as education1_count,
        COUNT(DISTINCT CASE
            WHEN w.education = 1 AND w.sex = true THEN wp.worker_id
        END) as education1_man_count,
        COUNT(DISTINCT CASE
            WHEN w.education = 1 AND w.sex = false THEN wp.worker_id
        END) as education1_woman_count,
        /* ===== EDUCATION 2 ===== */
        COUNT(DISTINCT CASE
            WHEN w.education = 2 THEN wp.worker_id
        END) as education2_count,
        COUNT(DISTINCT CASE
            WHEN w.education = 2 AND w.sex = true THEN wp.worker_id
        END) as education2_man_count,
        COUNT(DISTINCT CASE
            WHEN w.education = 2 AND w.sex = false THEN wp.worker_id
        END) as education2_woman_count,
        /* ===== EDUCATION 3 ===== */
        COUNT(DISTINCT CASE
            WHEN w.education = 3 THEN wp.worker_id
        END) as education3_count,
        COUNT(DISTINCT CASE
            WHEN w.education = 3 AND w.sex = true THEN wp.worker_id
        END) as education3_man_count,
        COUNT(DISTINCT CASE
            WHEN w.education = 3 AND w.sex = false THEN wp.worker_id
        END) as education3_woman_count,
        /* ===== PENSION AGE ===== */
        COUNT(DISTINCT CASE
            WHEN (
                (w.sex = true  AND DATE_PART('year', AGE(CURRENT_DATE, w.birthday)) >= 60)
             OR (w.sex = false AND DATE_PART('year', AGE(CURRENT_DATE, w.birthday)) >= 55)
            )
            THEN wp.worker_id END
        ) as pension_total_count,
        COUNT(DISTINCT CASE
            WHEN w.sex = true
             AND DATE_PART('year', AGE(CURRENT_DATE, w.birthday)) >= 60
            THEN wp.worker_id END
        ) as pension_man_count,
        COUNT(DISTINCT CASE
            WHEN w.sex = false
             AND DATE_PART('year', AGE(CURRENT_DATE, w.birthday)) >= 55
            THEN wp.worker_id END
        ) as pension_woman_count,
        /* ===== DISABILITY ===== */
        COUNT(DISTINCT CASE
            WHEN wd.id IS NOT NULL THEN wp.worker_id
        END) as disabled_total_count,
        COUNT(DISTINCT CASE
            WHEN wd.id IS NOT NULL AND w.sex = true THEN wp.worker_id
        END) as disabled_man_count,
        COUNT(DISTINCT CASE
            WHEN wd.id IS NOT NULL AND w.sex = false THEN wp.worker_id
        END) as disabled_woman_count,
        COUNT(DISTINCT CASE WHEN wp.type = 2 THEN wp.worker_id END) as workers_contract2_count
      FROM worker_positions wp
      JOIN workers w ON w.id = wp.worker_id
      LEFT JOIN worker_disabilities wd
        ON wd.worker_id = w.id
       AND wd.deleted_at IS NULL
       AND (wd."from" IS NULL OR wd."from" <= CURRENT_DATE)
       AND (wd."to" IS NULL OR wd."to" >= CURRENT_DATE)
      WHERE wp.deleted_at IS NULL
        AND wp.status = 2
      GROUP BY wp.organization_id
    )
    SELECT
      o.id,
      o.parent_id,
      o.name,
      o._lft,
      COALESCE(dp.approved_staff, 0) as approved_staff,
      COALESCE(ws.workers_count, 0) as workers_count,
      COALESCE(ws.workers_man_count, 0) as workers_man_count,
      COALESCE(ws.workers_woman_count, 0) as workers_woman_count,
      COALESCE(ws.age_under_30, 0) as age_under_30,
      COALESCE(ws.age_30_45, 0) as age_30_45,
      COALESCE(ws.age_over_45, 0) as age_over_45,
      COALESCE(ws.education1_count, 0) as education1_count,
      COALESCE(ws.education1_man_count, 0) as education1_man_count,
      COALESCE(ws.education1_woman_count, 0) as education1_woman_count,
      COALESCE(ws.education2_count, 0) as education2_count,
      COALESCE(ws.education2_man_count, 0) as education2_man_count,
      COALESCE(ws.education2_woman_count, 0) as education2_woman_count,
      COALESCE(ws.education3_count, 0) as education3_count,
      COALESCE(ws.education3_man_count, 0) as education3_man_count,
      COALESCE(ws.education3_woman_count, 0) as education3_woman_count,
      COALESCE(ws.pension_total_count, 0) as pension_total_count,
      COALESCE(ws.pension_man_count, 0) as pension_man_count,
      COALESCE(ws.pension_woman_count, 0) as pension_woman_count,
      COALESCE(ws.disabled_total_count, 0) as disabled_total_count,
      COALESCE(ws.disabled_man_count, 0) as disabled_man_count,
      COALESCE(ws.disabled_woman_count, 0) as disabled_woman_count,
      COALESCE(ws.workers_contract2_count, 0) as workers_contract2_count
    FROM organizations o
    LEFT JOIN dept_sub dp ON dp.organization_id = o.id
    LEFT JOIN worker_sub ws ON ws.organization_id = o.id
    WHERE o.deleted_at IS NULL
      ${leaderCond}
      ${orgIdsFilter}
    ORDER BY o._lft ASC
  `);

  const raw = ((result as { rows?: unknown[] }).rows ?? result) as Record<
    string,
    unknown
  >[];
  return raw.map((r) => normalizeStatRow(r));
}

// leaderOrganizations qamrovini SQL shartiga aylantiradi.
// Foydalanuvchi tashkiloti yo'q bo'lsa — barcha tashkilotlar (shart yo'q).
async function buildLeaderScope(
  db: DataSource,
  userOrgId: number | null,
): Promise<ReturnType<typeof sql>> {
  if (!userOrgId) return sql``;

  const result = await db.execute(sql`
    SELECT _lft, _rgt FROM organizations WHERE id = ${userOrgId} LIMIT 1
  `);
  const rows = ((result as { rows?: unknown[] }).rows ?? result) as Array<{
    _lft: number;
    _rgt: number;
  }>;
  const org = rows[0];
  if (!org) return sql``;

  // Subdaraxt: _lft BETWEEN userOrg._lft AND userOrg._rgt.
  return sql`AND o._lft BETWEEN ${Number(org._lft)} AND ${Number(org._rgt)}`;
}

// SQL'dan kelgan xom qatorni raqamli OrgStatRow'ga aylantiradi.
function normalizeStatRow(r: Record<string, unknown>): OrgStatRow {
  const num = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  return {
    id: num(r.id),
    parent_id: r.parent_id == null ? null : num(r.parent_id),
    name: (r.name as string | null) ?? null,
    _lft: num(r._lft),
    approved_staff: num(r.approved_staff),
    workers_count: num(r.workers_count),
    workers_man_count: num(r.workers_man_count),
    workers_woman_count: num(r.workers_woman_count),
    age_under_30: num(r.age_under_30),
    age_30_45: num(r.age_30_45),
    age_over_45: num(r.age_over_45),
    education1_count: num(r.education1_count),
    education1_man_count: num(r.education1_man_count),
    education1_woman_count: num(r.education1_woman_count),
    education2_count: num(r.education2_count),
    education2_man_count: num(r.education2_man_count),
    education2_woman_count: num(r.education2_woman_count),
    education3_count: num(r.education3_count),
    education3_man_count: num(r.education3_man_count),
    education3_woman_count: num(r.education3_woman_count),
    pension_total_count: num(r.pension_total_count),
    pension_man_count: num(r.pension_man_count),
    pension_woman_count: num(r.pension_woman_count),
    disabled_total_count: num(r.disabled_total_count),
    disabled_man_count: num(r.disabled_man_count),
    disabled_woman_count: num(r.disabled_woman_count),
    workers_contract2_count: num(r.workers_contract2_count),
  };
}

// ============================================================
// DARAXT QURISH — Laravel toTree() porti
// ============================================================

function buildTree(rows: OrgStatRow[]): OrgNode[] {
  const byId = new Map<number, OrgNode>();
  for (const r of rows) {
    byId.set(r.id, { ...r, children: [] });
  }

  const roots: OrgNode[] = [];
  for (const node of byId.values()) {
    const parent =
      node.parent_id != null ? byId.get(node.parent_id) : undefined;
    // Ota tashkilot natija to'plamida bo'lsa — bola, bo'lmasa — root (orphan).
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Har bir daraja _lft bo'yicha tartiblanadi (nested-set tabiiy tartibi).
  const sortRec = (nodes: OrgNode[]): void => {
    nodes.sort((a, b) => a._lft - b._lft);
    for (const n of nodes) sortRec(n.children);
  };
  sortRec(roots);

  return roots;
}

// ============================================================
// EXCEL HOSIL QILISH — OrganizationStatsDynamicExport porti
// ============================================================

function renderExcel(
  excel: ExcelService,
  rows: FlatRow[],
  maxDepth: number,
): Promise<Buffer> {
  // Ustun harfi yordamchisi (1 → A, 27 → AA).
  const colLetter = (n: number): string => {
    let s = '';
    let x = n;
    while (x > 0) {
      const rem = (x - 1) % 26;
      s = String.fromCharCode(65 + rem) + s;
      x = Math.floor((x - 1) / 26);
    }
    return s;
  };

  // Ustun tartibi (Laravel collection()): id, name_level_1..maxDepth, 23 stat, level, has_child.
  // Jami ustun soni = 1 + maxDepth + 23 + 2.
  const nameCount = maxDepth;
  const statStart = 1 + nameCount + 1; // birinchi stat ustun (1-asosli)
  const statEnd = statStart + STAT_COLUMNS.length - 1; // oxirgi stat ustun
  const lastVisibleCol = statEnd;
  const totalCols = 1 + nameCount + STAT_COLUMNS.length + 2;
  const totalColLetter = colLetter(lastVisibleCol);

  // ----- Ustun ta'riflari -----
  const columns: { header: string; key: string; width: number }[] = [];
  columns.push({ header: '', key: 'id', width: 6 });
  for (let i = 1; i <= nameCount; i++) {
    columns.push({ header: '', key: `name_level_${i}`, width: 30 });
  }
  for (const c of STAT_COLUMNS) {
    columns.push({ header: '', key: c, width: 13 });
  }
  columns.push({ header: '', key: 'level', width: 8 });
  columns.push({ header: '', key: 'has_child', width: 8 });

  // ----- Sarlavha qatorlari (1-8) -----
  // 1-6: matnli sarlavhalar (A:totalCol birlashtirilgan).
  // 7-8: ikki qatorli ustun sarlavhasi.
  const blank = (n: number): string[] => Array<string>(n).fill('');

  // 7-qator: № + Korxona nomi + maxDepth-1 bo'sh + 23 stat sarlavha.
  const headerRow7: string[] = [
    '№',
    'Korxona nomi',
    ...blank(Math.max(0, maxDepth - 1)),
    'Tasdiqlangan shtat birligi',
    'Amaldagi xodimlar soni',
    'Shundan',
    '',
    '30 yoshgacha',
    '30-45 yoshgacha',
    '45 yoshdan yuqori',
    "Oliy ma'lumotli",
    '',
    'Jami Oliy',
    "O'rta-maxsus",
    '',
    "Jami o'rta-maxsus",
    "O'rta",
    '',
    "Jami o'rta",
    'Pensiya yoshdagilar',
    '',
    'Jami pensiya yoshdagilar',
    'Nogironligi mavjud',
    '',
    'Jami nogironligi mavjud',
    'FXSH',
  ];

  // 8-qator: maxDepth+1 bo'sh + 23 stat sub-sarlavha (Erkak/Ayol).
  const headerRow8: string[] = [
    ...blank(maxDepth + 1),
    '',
    '',
    'Erkak',
    'Ayol',
    '',
    '',
    '',
    'Erkak',
    'Ayol',
    '',
    'Erkak',
    'Ayol',
    '',
    'Erkak',
    'Ayol',
    '',
    'Erkak',
    'Ayol',
    '',
    'Erkak',
    'Ayol',
    '',
    '',
  ];

  // 7-qatordagi guruh merge'lari (2-ustunli guruhlar) + 7:8 vertikal merge'lar.
  const headerMerges: string[] = [];
  const md = maxDepth;
  // 7-qator gorizontal merge'lar (2-ustunli juftliklar):
  headerMerges.push(`${colLetter(md + 4)}7:${colLetter(md + 5)}7`); // Shundan
  headerMerges.push(`${colLetter(md + 9)}7:${colLetter(md + 10)}7`); // Oliy
  headerMerges.push(`${colLetter(md + 12)}7:${colLetter(md + 13)}7`); // O'rta-maxsus
  headerMerges.push(`${colLetter(md + 15)}7:${colLetter(md + 16)}7`); // O'rta
  headerMerges.push(`${colLetter(md + 18)}7:${colLetter(md + 19)}7`); // Pensiya
  headerMerges.push(`${colLetter(md + 21)}7:${colLetter(md + 22)}7`); // Nogironlik
  // 7:8 vertikal merge'lar (bitta ustunli sarlavhalar):
  headerMerges.push(`A7:A8`); // №
  headerMerges.push(`${colLetter(2)}7:${colLetter(md + 1)}8`); // Korxona nomi
  for (const c of [
    md + 2,
    md + 3,
    md + 6,
    md + 7,
    md + 8,
    md + 11,
    md + 14,
    md + 17,
    md + 20,
    md + 23,
    md + 24,
  ]) {
    headerMerges.push(`${colLetter(c)}7:${colLetter(c)}8`);
  }

  // Title sarlavhalar (1-6 qator) — har biri A:totalCol bo'ylab birlashtiriladi.
  const titleTexts = [
    '"O‘zbekiston temir yo‘llari" AJ boshqaruv rasining',
    '2024 yil “04” sentyabrdagi',
    '561-N sonli buyrug‘iga 1-ilova',
    '',
    '"O‘zbekiston temir yo‘llari" AJ korxona va muassasalarda 2025 yil noyabr oyida ishga qabul qilingan xodimlar to‘g‘risida',
    'M A ʼ L U M O T',
  ];

  const headerRows: ExcelHeaderRow[] = titleTexts.map((text, idx) => {
    const rowNo = idx + 1;
    // 1-3 o'ngga, 5-6 markazga (Laravel alignment).
    const align: 'right' | 'center' =
      rowNo >= 1 && rowNo <= 3 ? 'right' : 'center';
    return {
      values: [text, ...blank(totalCols - 1)],
      merges: [`A${rowNo}:${totalColLetter}${rowNo}`],
      style: {
        bold: true,
        align,
        verticalAlign: 'middle',
        wrapText: true,
      },
    };
  });

  // 7-8 ustun sarlavhalari — bold + markaz + border.
  const headerCellStyle = {
    bold: true,
    align: 'center' as const,
    verticalAlign: 'middle' as const,
    wrapText: true,
    border: 'thin' as const,
  };
  headerRows.push({
    values: headerRow7,
    style: headerCellStyle,
    height: 40,
  });
  headerRows.push({
    values: headerRow8,
    style: headerCellStyle,
    height: 24,
  });
  // Merge'larni oxirgi header qatoriga biriktiramiz (writeHeaderRows tartibi).
  headerRows[headerRows.length - 1].merges = headerMerges;

  // Birinchi data qatori — title(6) + header(2) dan keyin = 9.
  const firstDataRow = headerRows.length + 1;

  return excel.build({
    creator: 'HRM',
    sheets: [
      {
        name: 'Report',
        columns,
        rows,
        headerRows,
        customize: (ws) => {
          applyReportStyles(ws, rows, maxDepth, {
            firstDataRow,
            statStart,
            statEnd,
            totalCols,
            colLetter,
          });
        },
      },
    ],
  });
}

// ============================================================
// CUSTOMIZE — daraxt outline, name-merge, ranglar, Total, page setup
// ============================================================

interface StyleCtx {
  firstDataRow: number;
  statStart: number;
  statEnd: number;
  totalCols: number;
  colLetter: (n: number) => string;
}

function applyReportStyles(
  ws: Worksheet,
  rows: FlatRow[],
  maxDepth: number,
  ctx: StyleCtx,
): void {
  const { firstDataRow, statStart, statEnd, colLetter } = ctx;
  const md = maxDepth;
  const headerRow1 = 7; // ustun sarlavhasi boshlanishi
  const headerRow2 = 8;
  const lastDataRow = firstDataRow + rows.length - 1;
  const totalColLetter = colLetter(statEnd);
  const nameEndCol = colLetter(md + 1); // oxirgi name ustun harfi

  // Laravel: setShowSummaryBelow(false) — outline jamlovchi yuqorida.
  ws.properties.outlineProperties = {
    summaryBelow: false,
    summaryRight: false,
  };

  // ----- Sahifa sozlamalari (landscape, fit-to-width) -----
  ws.pageSetup.orientation = 'landscape';
  ws.pageSetup.fitToPage = true;
  ws.pageSetup.fitToWidth = 1;
  ws.pageSetup.fitToHeight = 0;
  ws.pageSetup.horizontalCentered = true;
  ws.pageSetup.margins = {
    left: 0.5,
    right: 0.5,
    top: 0.5,
    bottom: 0.5,
    header: 0,
    footer: 0,
  };

  // ----- Title (1-3, 5-6) alignment — Laravel A1:A3 o'ng, A5:A6 markaz -----
  for (let r = 1; r <= 3; r++) {
    ws.getCell(`A${r}`).alignment = {
      horizontal: 'right',
      vertical: 'middle',
      wrapText: true,
    };
  }
  for (let r = 5; r <= 6; r++) {
    ws.getCell(`A${r}`).alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };
  }

  // ----- Ustun sarlavhasi (7-8) ranglari (Laravel ARGB fill'lari) -----
  // 7-qatorgina: maxDepth..maxDepth+3 — ko'k.
  fillRange(
    ws,
    colLetter(md),
    headerRow1,
    colLetter(md + 3),
    headerRow1,
    FILL_BLUE,
  );
  // 7-8 qator: rangli stat guruhlar.
  const groups: Array<[number, number, string]> = [
    [md + 4, md + 5, FILL_GREEN], // Shundan Erkak/Ayol
    [md + 6, md + 8, FILL_BLUE], // yosh guruhlari
    [md + 9, md + 11, FILL_GREEN], // Oliy
    [md + 12, md + 14, FILL_BLUE], // O'rta-maxsus
    [md + 15, md + 17, FILL_GREEN], // O'rta
    [md + 18, md + 20, FILL_BLUE], // Pensiya
    [md + 21, md + 23, FILL_GREEN], // Nogironlik
    [md + 24, md + 24, FILL_ORANGE], // FXSH
  ];
  for (const [from, to, color] of groups) {
    fillRange(
      ws,
      colLetter(from),
      headerRow1,
      colLetter(to),
      headerRow2,
      color,
    );
  }

  // ----- Ustun sarlavhasi + data uchun ingichka border -----
  for (let r = headerRow1; r <= lastDataRow; r++) {
    for (let c = 1; c <= statEnd; c++) {
      ws.getCell(`${colLetter(c)}${r}`).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    }
  }

  // ----- Data qatorlari: outline, name-merge, has_child shrifti, Total -----
  rows.forEach((row, idx) => {
    const rowIndex = firstDataRow + idx;
    const level = Number(row.level ?? 1);
    const hasChild = Boolean(row.has_child);
    const isTotal = row.id === 'Total';

    // Daraxt outline darajasi (Laravel setOutlineLevel(level - 1)).
    if (level > 1) {
      ws.getRow(rowIndex).outlineLevel = level - 1;
    }

    // Name ustunini birlashtirish: level+1-ustundan oxirgi name ustunigacha.
    const nameColIdx = level + 1;
    const nameColLetter = colLetter(nameColIdx);
    if (nameColLetter !== nameEndCol) {
      ws.mergeCells(`${nameColLetter}${rowIndex}:${nameEndCol}${rowIndex}`);
    }

    // has_child qatori — qalin ko'k shrift (Laravel Color::COLOR_BLUE).
    if (hasChild) {
      ws.getCell(`${nameColLetter}${rowIndex}`).font = {
        bold: true,
        color: { argb: 'FF0000FF' },
      };
    }

    // Total qatori — qalin shrift + ko'k fon (butun qator bo'ylab).
    if (isTotal) {
      for (let c = 1; c <= statEnd; c++) {
        const cell = ws.getCell(`${colLetter(c)}${rowIndex}`);
        cell.font = { ...cell.font, bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: FILL_BLUE },
        };
      }
    }

    // Stat yacheykalari — markazga tekislash (raqamlar).
    for (let c = statStart; c <= statEnd; c++) {
      ws.getCell(`${colLetter(c)}${rowIndex}`).alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };
    }
  });

  // ----- Yashirin meta ustunlar (level, has_child) -----
  ws.getColumn(statEnd + 1).hidden = true;
  ws.getColumn(statEnd + 2).hidden = true;

  void totalColLetter;
}

// Berilgan diapazonni bir rang bilan to'ldiradi.
function fillRange(
  ws: Worksheet,
  fromCol: string,
  fromRow: number,
  toCol: string,
  toRow: number,
  argb: string,
): void {
  const colIdx = (letter: string): number => {
    let n = 0;
    for (let i = 0; i < letter.length; i++) {
      n = n * 26 + (letter.charCodeAt(i) - 64);
    }
    return n;
  };
  const c1 = colIdx(fromCol);
  const c2 = colIdx(toCol);
  for (let r = fromRow; r <= toRow; r++) {
    for (let c = c1; c <= c2; c++) {
      ws.getRow(r).getCell(c).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb },
      };
    }
  }
}
