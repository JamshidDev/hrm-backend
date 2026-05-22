// Report Excel builder — POST /api/v1/structure/report/excel.
// Laravel: ReportController::viewExcel + ReportService::{typeOne,typeTwo,typeThree}Excel
//          + Report{One,Two,Three}StatsExport.
//
// 3 ta hisobot turi (one/two/three) bir xil skeletga ega:
//   6 sarlavha qatori + 2 ustun-sarlavha qatori + dinamik chuqurlikdagi tashkilot
//   daraxti + outline + merge + rang bloklari.
// Farqlar — har tur uchun config (stat ustunlar, sarlavha matnlari, merge/rang).
//
// report/excel SAQLANGAN report_details.data ('stats' / 'contracts') o'qiydi —
// SQL agregatsiya YO'Q (report-export.builder.ts'dan farqli). Total qatori ham yo'q.

import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import type { Worksheet } from 'exceljs';
import type { DataSource } from '@/db/types';
import type { ExcelService } from '@/shared/excel/excel.service';
import type {
  ExcelCellStyle,
  ExcelColumn,
  ExcelHeaderRow,
} from '@/shared/excel/types';
import { organizations, report_details, reports } from '@/db/schema';

// ============================================================
// TIPLAR
// ============================================================

export type ReportExcelType = 'one' | 'two' | 'three';

export interface ReportExcelBuildParams {
  type: ReportExcelType;
  // report uuid bo'yicha topilgan id (bo'lsa — report yo'li).
  reportId?: number;
  // reportId yo'q bo'lsa — year/month yo'li.
  year: number;
  month: number;
}

// report_details.data tuzilishi.
interface StatItem {
  key: string;
  value: unknown;
}
interface ReportDetailData {
  stats?: StatItem[];
  contracts?: Array<Record<string, unknown>>;
}

interface OrgRow {
  id: number;
  name: string | null;
  parent_id: number | null;
  _lft: number;
}
interface OrgNode extends OrgRow {
  children: OrgNode[];
}

type FlatRow = Record<string, unknown>;

interface FlattenCtx {
  rows: FlatRow[];
  maxDepth: number;
}

// Har bir hisobot turining konfiguratsiyasi.
interface TypeConfig {
  filename: string;
  numberHeader: string;
  isContract: boolean;
  statColumns: string[];
  titleTexts: string[]; // 6 ta
  statHeader7: string[]; // uzunlik = statColumns.length
  statHeader8: string[]; // uzunlik = statColumns.length
  horizontalMerges: Array<[number, number]>; // md+a..md+b, 7-qator
  verticalMergeOffsets: number[]; // md+k, 7:8-qator
  colors: Array<[number, number, string]>; // md+a..md+b, ARGB, 7:8-qator
  treeLoopFrom: number; // 4-kenglikdagi ustunlar sikli boshlanishi (1 yoki 2)
  widthByOffset: Record<number, number>; // md+k => kenglik
  absoluteWidths: Record<number, number>; // absolyut ustun => kenglik
}

// Rang kodlari (Laravel ARGB — 'FF' alpha prefiksi bilan).
const FILL = {
  blue: 'FFB8CCE4',
  green: 'FF92D050',
  orange: 'FFFFC000',
  lightGreen: 'FFD9EAD3',
  cream: 'FFFFF2CC',
  pink: 'FFF4CCCC',
};

// ============================================================
// TYPE CONFIG'LAR
// ============================================================

const TYPE_CONFIGS: Record<ReportExcelType, TypeConfig> = {
  // ---- TYPE ONE — ReportOneStatsExport ----
  one: {
    filename: 'stats.xlsx',
    numberHeader: '№',
    isContract: false,
    statColumns: [
      'all_rate',
      'workers_count',
      'men',
      'women',
      'age_under_30',
      'age_31_45',
      'age_46_plus',
      'higher_men_count',
      'higher_women_count',
      'higher_count',
      'special_men_count',
      'special_women_count',
      'special_count',
      'middle_men_count',
      'middle_women_count',
      'middle_count',
      'pension_count_men',
      'pension_count_women',
      'pension_age_count',
      'disability_men_count',
      'disability_women_count',
      'disability_count',
      'vacation_count',
      'part_time_contract',
    ],
    titleTexts: [
      '"O‘zbekiston temir yo‘llari" AJ boshqaruv raisining',
      '2024 yil “04” sentyabrdagi',
      '561-N sonli buyrug‘iga 1-ilova',
      '',
      '"O‘zbekiston temir yo‘llari" AJ korxona va muassasalarda 2025 yil noyabr oyidagi ishchi-xodimlar to‘g‘risida',
      'M A ‘ L U M O T',
    ],
    statHeader7: [
      'Tasdiqlangan shtat birligi',
      'Amaldagi xodimlar soni',
      'Shundan',
      ' ',
      '30 yoshgacha',
      '30-45 yoshgacha',
      '45 yoshdan yuqori',
      "Oliy ma'lumotli",
      ' ',
      'Jami Oliy',
      'O‘rta-maxsus',
      ' ',
      'Jami o‘rta-maxsus',
      "O'rta",
      ' ',
      'Jami o‘rta',
      'Pensiya yoshdagilar',
      ' ',
      'Jami pensiya yoshdagilar',
      'Nogironligi mavjud',
      ' ',
      'Jami nogironligi mavjud',
      'Bola parvarishlash ta‘tilida',
      'FXSH',
    ],
    statHeader8: [
      ' ',
      ' ',
      'Erkak',
      'Ayol',
      ' ',
      ' ',
      ' ',
      'Erkak',
      'Ayol',
      ' ',
      'Erkak',
      'Ayol',
      ' ',
      'Erkak',
      'Ayol',
      ' ',
      'Erkak',
      'Ayol',
      ' ',
      'Erkak',
      'Ayol',
      ' ',
      ' ',
      ' ',
    ],
    horizontalMerges: [
      [4, 5],
      [9, 10],
      [12, 13],
      [15, 16],
      [18, 19],
      [21, 22],
    ],
    verticalMergeOffsets: [2, 3, 6, 7, 8, 11, 14, 17, 20, 23, 24, 25],
    colors: [
      [0, 3, FILL.blue],
      [4, 5, FILL.green],
      [6, 8, FILL.blue],
      [9, 11, FILL.green],
      [12, 14, FILL.blue],
      [15, 17, FILL.green],
      [18, 20, FILL.blue],
      [21, 23, FILL.green],
      [24, 24, FILL.blue],
      [25, 25, FILL.orange],
    ],
    treeLoopFrom: 1,
    widthByOffset: {},
    absoluteWidths: { 9: 10, 10: 10, 11: 10, 23: 11, 26: 11, 27: 11 },
  },

  // ---- TYPE TWO — ReportTwoStatsExport (kontraktlar) ----
  two: {
    filename: 'created-workers.xlsx',
    numberHeader: 'N',
    isContract: true,
    statColumns: [
      'full_name',
      'birthday',
      'position_name',
      'educations',
      'old_organization_name',
      'old_position_name',
      'old_position_date',
      'command',
      'command_reason',
      'type',
    ],
    titleTexts: [
      '"Ozbekiston temir yollari" AJ boshqaruv raisining',
      '2024 yil "04" sentyabrdagi',
      '561-N sonli buyrugiga 1-ilova',
      '',
      '"Ozbekiston temir yollari" AJ korxona va muassasalarda ishga qabul qilingan xodimlar to‘g‘risida',
      'M A ‘ L U M O T',
    ],
    statHeader7: [
      'F.I.Sh.',
      'Tugilgan sanasi',
      'Ishga qabul qilingan lavozimi',
      'Malumoti va mutaxassisligi',
      'Oldingi mehnat faoliyati',
      ' ',
      ' ',
      'Ishga qabul qilinganligi togrisida',
      ' ',
      'Ish faoliyat turi',
    ],
    statHeader8: [
      ' ',
      ' ',
      ' ',
      ' ',
      'Korxona nomi',
      'Lavozimi',
      'Ishdan boshagan sanasi',
      'Buyruq nomeri va sanasi',
      'Buyruq asosi',
      ' ',
    ],
    horizontalMerges: [
      [6, 8],
      [9, 10],
    ],
    verticalMergeOffsets: [2, 3, 4, 5, 11],
    colors: [
      [2, 5, FILL.blue],
      [6, 8, FILL.lightGreen],
      [9, 10, FILL.cream],
      [11, 11, FILL.pink],
    ],
    treeLoopFrom: 2,
    widthByOffset: {
      2: 28,
      3: 16,
      4: 24,
      5: 28,
      6: 24,
      7: 24,
      8: 16,
      9: 24,
      10: 18,
      11: 24,
    },
    absoluteWidths: {},
  },

  // ---- TYPE THREE — ReportThreeStatsExport ----
  three: {
    filename: 'stats.xlsx',
    numberHeader: '№',
    isContract: false,
    statColumns: [
      'month_created',
      'month_other_created',
      'month_other_created_men',
      'month_other_created_women',
      'month_updated',
      'month_updated_men',
      'month_updated_women',
      'month_created_30',
      'month_created_univer',
      'month_created_tex',
      'month_created_other_univer',
      'month_created_coll',
      'month_created_school',
      'month_created_band',
      'month_deleted',
      'vacancies',
    ],
    titleTexts: [
      '"O‘zbekiston temir yo‘llari" AJ boshqaruv rasining',
      '2024 yil “04” sentyabrdagi',
      '561-N sonli buyrug‘iga 1-ilova',
      '',
      '"O‘zbekiston temir yo‘llari" AJ korxona va muassasalarda 2025 yil noyabr oyida ishga qabul qilingan hamda mehnat\n                shartnomasi bekor qilingan ishchi-xodimlar to‘g‘risida',
      'M A ‘ L U M O T',
    ],
    statHeader7: [
      'Ishga qabul qilinganlar soni',
      'Tashqaridan qabul qilinganlar soni',
      'Shundan',
      ' ',
      'Jamiyat korxonalaridan ichki siljish asosida qabul qilinganlar soni',
      'Shundan',
      ' ',
      'Shundan 30 yoshgacha qabul qilinganlar soni',
      'Shundan, qabul qilingan bitiruvchilar',
      ' ',
      ' ',
      ' ',
      'O‘rta ma‘lumotlilar',
      'Shundan bandlik organlarining yo‘llanmasi asosida ishga olinganlar soni',
      'Mehnat shartnomasi bekor qilinganlar soni',
      'Korxonada mavjud bo‘sh ish o‘rinlari soni',
    ],
    statHeader8: [
      ' ',
      ' ',
      'Erkak',
      'Ayol',
      ' ',
      'Erkak',
      'Ayol',
      ' ',
      'TDTrU',
      'Temir yo‘l transport texnikumlari',
      "Boshqa oliy ta'lim tashkilotlari",
      'Boshqa o‘rta-maxsus kasb-hunar kollejlari',
      ' ',
      ' ',
      ' ',
      ' ',
    ],
    horizontalMerges: [
      [4, 5],
      [7, 8],
      [10, 13],
    ],
    verticalMergeOffsets: [2, 3, 6, 9, 14, 15, 16, 17],
    colors: [
      [2, 5, FILL.blue],
      [6, 9, FILL.lightGreen],
      [10, 13, FILL.cream],
      [14, 17, FILL.pink],
    ],
    treeLoopFrom: 2,
    widthByOffset: {
      2: 14,
      3: 16,
      4: 10,
      5: 10,
      6: 16,
      7: 10,
      8: 10,
      9: 14,
      10: 14,
      11: 16,
      12: 18,
      13: 16,
      14: 16,
      15: 16,
      16: 16,
      17: 16,
    },
    absoluteWidths: {},
  },
};

// ============================================================
// PUBLIC — Excel buffer hosil qilish
// ============================================================

export async function buildReportExcel(
  db: DataSource,
  excel: ExcelService,
  params: ReportExcelBuildParams,
): Promise<{ buffer: Buffer; filename: string }> {
  const config = TYPE_CONFIGS[params.type];
  const { tree, statsByOrg } = await fetchReportData(db, params);

  // Flatten — depth-first, 1-asosli daraja. Total qatori YO'Q.
  const ctx: FlattenCtx = { rows: [], maxDepth: 1 };
  if (config.isContract) {
    flattenContracts(tree, statsByOrg, 1, ctx);
  } else {
    flattenStats(tree, statsByOrg, 1, ctx);
  }

  const normRows = normalizeRows(ctx.rows, config, ctx.maxDepth);
  const buffer = await renderExcel(excel, config, normRows, ctx.maxDepth);
  return { buffer, filename: config.filename };
}

// ============================================================
// DATA OLISH — Laravel ReportService::organizations() porti
// ============================================================

async function fetchReportData(
  db: DataSource,
  params: ReportExcelBuildParams,
): Promise<{ tree: OrgNode[]; statsByOrg: Map<number, ReportDetailData> }> {
  // report_details — report uuid yoki year/month bo'yicha.
  let details: Array<{ organization_id: number; data: unknown }>;
  if (params.reportId != null) {
    details = await db
      .select({
        organization_id: report_details.organization_id,
        data: report_details.data,
      })
      .from(report_details)
      .where(
        and(
          eq(report_details.report_id, params.reportId),
          isNull(report_details.deleted_at),
        ),
      );
  } else {
    details = await db
      .select({
        organization_id: report_details.organization_id,
        data: report_details.data,
      })
      .from(report_details)
      .innerJoin(reports, eq(reports.id, report_details.report_id))
      .where(
        and(
          eq(reports.year, params.year),
          eq(reports.month, params.month),
          isNull(reports.deleted_at),
          isNull(report_details.deleted_at),
        ),
      );
  }

  // keyBy(organization_id) — Laravel kabi oxirgisi g'olib.
  const statsByOrg = new Map<number, ReportDetailData>();
  const orgIdSet = new Set<number>();
  for (const d of details) {
    orgIdSet.add(d.organization_id);
    statsByOrg.set(d.organization_id, d.data ?? {});
  }

  const orgIds = [...orgIdSet];
  if (orgIds.length === 0) return { tree: [], statsByOrg };

  // Organization::whereIn('id', orgIds)->getTree() — _lft tartibida.
  const orgRows = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      parent_id: organizations.parent_id,
      _lft: organizations._lft,
    })
    .from(organizations)
    .where(
      and(inArray(organizations.id, orgIds), isNull(organizations.deleted_at)),
    )
    .orderBy(asc(organizations._lft));

  return { tree: buildTree(orgRows), statsByOrg };
}

// ============================================================
// DARAXT QURISH — Laravel nestedset toTree() porti
// ============================================================

function buildTree(rows: OrgRow[]): OrgNode[] {
  if (rows.length === 0) return [];
  const nodes: OrgNode[] = rows.map((r) => ({ ...r, children: [] }));
  const byId = new Map<number, OrgNode>();
  for (const n of nodes) byId.set(n.id, n);

  // toTree(): eng kichik _lft tugunining parent_id'si — "root parent" id.
  let leastLft = Infinity;
  let rootParentId: number | null = null;
  for (const n of nodes) {
    if (n._lft < leastLft) {
      leastLft = n._lft;
      rootParentId = n.parent_id;
    }
  }

  // Root — parent_id === rootParentId. Aks holda ota daraxtda bo'lsa — bola.
  const roots: OrgNode[] = [];
  for (const n of nodes) {
    if (n.parent_id === rootParentId) {
      roots.push(n);
    } else if (n.parent_id != null) {
      const parent = byId.get(n.parent_id);
      if (parent) parent.children.push(n);
    }
  }
  return roots;
}

// ============================================================
// FLATTEN — Laravel flatten{One,Two,Three}Tree porti
// ============================================================

// flattenOneTree / flattenThreeTree — bir xil mantiq (Laravel'da ham).
function flattenStats(
  nodes: OrgNode[],
  statsByOrg: Map<number, ReportDetailData>,
  level: number,
  ctx: FlattenCtx,
): void {
  for (const node of nodes) {
    const detail = statsByOrg.get(node.id);
    const hasChild = node.children.length > 0;
    const row: FlatRow = {
      id: node.id,
      level,
      has_child: hasChild,
      [`name_level_${level}`]: node.name,
    };

    if (detail) {
      const stats = Array.isArray(detail.stats) ? detail.stats : [];
      for (const item of stats) {
        if (item && typeof item.key === 'string') {
          row[item.key] = item.value;
        }
      }
      ctx.rows.push(row);
      ctx.maxDepth = Math.max(ctx.maxDepth, level);
    }

    if (hasChild) {
      flattenStats(node.children, statsByOrg, level + 1, ctx);
    }
  }
}

// flattenTwoTree — har kontrakt alohida qator. $index har rekursiyada qaytadan.
function flattenContracts(
  nodes: OrgNode[],
  statsByOrg: Map<number, ReportDetailData>,
  level: number,
  ctx: FlattenCtx,
): void {
  let index = 0;
  for (const node of nodes) {
    const detail = statsByOrg.get(node.id);
    const contracts = Array.isArray(detail?.contracts) ? detail.contracts : [];
    const hasChild = node.children.length > 0;

    for (const contract of contracts) {
      index++;
      ctx.rows.push({
        id: index,
        level,
        has_child: false,
        [`name_level_${level}`]: node.name,
        full_name: contract.full_name ?? '',
        birthday: contract.birthday ?? '',
        position_name: contract.position_name ?? '',
        educations: contract.educations ?? '',
        old_organization_name: contract.old_organization_name ?? '',
        old_position_name: contract.old_position_name ?? '',
        old_position_date: contract.old_position_date ?? '',
        command: contract.command ?? '',
        command_reason: contract.command_reason ?? '',
        type: contract.type ?? '',
      });
      ctx.maxDepth = Math.max(ctx.maxDepth, level);
    }

    if (hasChild) {
      flattenContracts(node.children, statsByOrg, level + 1, ctx);
    }
  }
}

// Laravel collection() — har qatorni to'liq ustun to'plamiga keltiradi.
function normalizeRows(
  flat: FlatRow[],
  config: TypeConfig,
  md: number,
): Record<string, unknown>[] {
  const defaultVal: unknown = config.isContract ? '' : 0;
  return flat.map((r) => {
    const out: Record<string, unknown> = { id: r.id };
    for (let i = 1; i <= md; i++) {
      out[`name_level_${i}`] = r[`name_level_${i}`] ?? null;
    }
    for (const c of config.statColumns) {
      out[c] = r[c] ?? defaultVal;
    }
    out.level = r.level ?? 1;
    out.has_child = r.has_child ?? false;
    return out;
  });
}

// ============================================================
// EXCEL HOSIL QILISH
// ============================================================

async function renderExcel(
  excel: ExcelService,
  config: TypeConfig,
  normRows: Record<string, unknown>[],
  md: number,
): Promise<Buffer> {
  const statN = config.statColumns.length;
  const totalCols = 1 + md + statN + 2;

  // ----- Ustun ta'riflari -----
  const columns: ExcelColumn[] = [{ header: '', key: 'id', width: 6 }];
  for (let i = 1; i <= md; i++) {
    columns.push({ header: '', key: `name_level_${i}`, width: 10 });
  }
  for (const c of config.statColumns) {
    columns.push({ header: '', key: c, width: 12 });
  }
  columns.push({ header: '', key: 'level', width: 8 });
  columns.push({ header: '', key: 'has_child', width: 8 });

  // ----- 7-8 ustun sarlavhalari -----
  const blank = (n: number): string[] =>
    Array<string>(Math.max(0, n)).fill(' ');
  const headerRow7: string[] = [
    config.numberHeader,
    'Korxona nomi',
    ...blank(md - 1),
    ...config.statHeader7,
  ];
  const headerRow8: string[] = [...blank(md + 1), ...config.statHeader8];

  // ----- Merge'lar (oxirgi header qatoriga biriktiramiz) -----
  const merges: string[] = [];
  const totalColL = colLetter(totalCols);
  for (let r = 1; r <= 6; r++) merges.push(`A${r}:${totalColL}${r}`);
  merges.push('A7:A8');
  merges.push(`B7:${colLetter(md + 1)}8`);
  for (const [s, e] of config.horizontalMerges) {
    merges.push(`${colLetter(md + s)}7:${colLetter(md + e)}7`);
  }
  for (const k of config.verticalMergeOffsets) {
    merges.push(`${colLetter(md + k)}7:${colLetter(md + k)}8`);
  }

  // ----- Header qatorlari -----
  const headerRows: ExcelHeaderRow[] = [];
  config.titleTexts.forEach((text, idx) => {
    const rowNo = idx + 1;
    const align: 'right' | 'center' = rowNo <= 3 ? 'right' : 'center';
    headerRows.push({
      values: [text],
      style: { bold: true, align, verticalAlign: 'middle', wrapText: true },
    });
  });
  const headerCellStyle: ExcelCellStyle = {
    bold: true,
    align: 'center',
    verticalAlign: 'middle',
    wrapText: true,
    border: 'thin',
  };
  headerRows.push({ values: headerRow7, style: headerCellStyle, height: 30 });
  headerRows.push({
    values: headerRow8,
    style: headerCellStyle,
    height: 30,
    merges,
  });

  return excel.build({
    creator: 'HRM',
    sheets: [
      {
        name: 'Report',
        columns,
        rows: normRows,
        headerRows,
        customize: (ws) => {
          applyStyles(ws, config, normRows, md, totalCols);
        },
      },
    ],
  });
}

// ============================================================
// CUSTOMIZE — page setup, kengliklar, ranglar, outline, name-merge
// ============================================================

function applyStyles(
  ws: Worksheet,
  config: TypeConfig,
  normRows: Record<string, unknown>[],
  md: number,
  totalCols: number,
): void {
  const lastDataRow = 8 + normRows.length;

  // ----- Sahifa sozlamalari -----
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
  ws.properties.outlineProperties = {
    summaryBelow: false,
    summaryRight: false,
  };

  // ----- Qator balandliklari -----
  ws.getRow(7).height = 30;
  ws.getRow(8).height = 30;

  // ----- Ustun kengliklari (Laravel getStyleEvent tartibida) -----
  ws.getColumn(1).width = 5;
  for (let i = config.treeLoopFrom; i <= md; i++) {
    ws.getColumn(i).width = 4;
  }
  ws.getColumn(md + 1).width = 20;
  for (const [off, w] of Object.entries(config.widthByOffset)) {
    ws.getColumn(md + Number(off)).width = w;
  }
  for (const [abs, w] of Object.entries(config.absoluteWidths)) {
    ws.getColumn(Number(abs)).width = w;
  }

  // ----- Title alignment (1-3 o'ng, 5-6 markaz) -----
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

  // ----- Jadval bordeli (7..oxirgi data qatori) -----
  for (let r = 7; r <= lastDataRow; r++) {
    for (let c = 1; c <= totalCols; c++) {
      ws.getRow(r).getCell(c).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    }
  }

  // ----- Header (7-8) alignment + bold -----
  for (let r = 7; r <= 8; r++) {
    for (let c = 1; c <= totalCols; c++) {
      const cell = ws.getRow(r).getCell(c);
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };
      cell.font = { ...cell.font, bold: true };
    }
  }

  // ----- Rang bloklari (7:8) -----
  for (const [s, e, argb] of config.colors) {
    for (let r = 7; r <= 8; r++) {
      for (let c = md + s; c <= md + e; c++) {
        ws.getRow(r).getCell(c).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb },
        };
      }
    }
  }

  // ----- Data qatorlari: outline, name-merge, has_child shrifti -----
  const endColL = colLetter(md + 1);
  normRows.forEach((row, idx) => {
    const rowIndex = 9 + idx;
    const level = Number(row.level ?? 1);
    if (level > 1) {
      ws.getRow(rowIndex).outlineLevel = level - 1;
    }

    const colIndex = config.isContract
      ? Math.min(level + 1, md + 1)
      : level + 1;
    const nameColL = colLetter(colIndex);
    if (nameColL !== endColL) {
      ws.mergeCells(`${nameColL}${rowIndex}:${endColL}${rowIndex}`);
    }

    if (row.has_child === true) {
      ws.getCell(`${nameColL}${rowIndex}`).font = {
        bold: true,
        color: { argb: 'FF0000FF' },
      };
    }
  });

  // ----- Yashirin meta ustunlar (level, has_child) -----
  ws.getColumn(totalCols - 1).hidden = true;
  ws.getColumn(totalCols).hidden = true;
}

// Ustun raqami → Excel ustun harfi (1 → A, 27 → AA).
function colLetter(n: number): string {
  let s = '';
  let x = n;
  while (x > 0) {
    const rem = (x - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}
