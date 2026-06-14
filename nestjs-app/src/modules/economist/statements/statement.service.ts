// Statement service. Laravel: Economist/StatementController.
// Asosiy oylik hisobot yozuvlari (statements) ustida CRUD + extras + Excel eksport.

import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import { ExportTaskRunner } from '@/shared/export-task/export-task-runner.service';
import {
  statements,
  positions,
  statement_aggregates,
  organizations,
  workers,
} from '@/db/schema';
import {
  economistAssetUrl,
  type PageQueryLike,
} from '@/modules/economist/_shared/helpers';
import { buildWorkerSearchCond } from '@/modules/hr/_shared/worker-search.helper';
import {
  StatementMapper,
  type StatementRow,
} from '@/modules/economist/statements/statement.mapper';
import {
  TOTAL_ONE_COLUMNS,
  TOTAL_TWO_COLUMNS,
  TOTAL_FOUR_COLUMNS,
  TOTAL_FIVE_COLUMNS,
} from '@/modules/economist/_shared/code-groups';
import { getCodeNamesOrdered } from '@/modules/economist/_shared/code-names';
import { ExcelService } from '@/shared/excel/excel.service';
import { HEADER_BLUE, FMT } from '@/shared/excel/style-presets';
import type { ExcelHeaderRow } from '@/shared/excel/types';

// O'zbek tilidagi oylar (Excel sarlavhalar uchun).
const MONTHS_UZ = [
  'Yanvar',
  'Fevral',
  'Mart',
  'Aprel',
  'May',
  'Iyun',
  'Iyul',
  'Avgust',
  'Sentabr',
  'Oktabr',
  'Noyabr',
  'Dekabr',
];

/**
 * Decoding va decodingByOrganization endpointlari qaytaradigan har bir qator tipi.
 * Sarlavhalar (`type_name`, `type_code`) + dynamic ustunlar (`1`..`12` yoki `org_NN`).
 */
type DecodingRow = Record<string, string | number | null>;

// Laravel StatementIndexRequest sort_by allowed list → Drizzle ustunlari.
const SORT_COLUMNS: Record<string, PgColumn> = {
  id: statements.id,
  organization_id: statements.organization_id,
  worker_id: statements.worker_id,
  main_salary: statements.main_salary,
  work_time: statements.work_time,
  full_name: statements.full_name,
  position: statements.position,
  pin: statements.pin,
  year: statements.year,
  month: statements.month,
  total_one: statements.total_one,
  total_two: statements.total_two,
  total_three: statements.total_three,
  total_four: statements.total_four,
  total_five: statements.total_five,
};

// Service-darajadagi list query shape (StatementListQueryDto bilan mos).
interface ByPositionsQueryLike extends PageQueryLike {
  positions?: string;
  organizations?: string;
  organization_id?: number;
}

interface StatementListQuery extends PageQueryLike {
  organizations?: string;
  search?: string;
  code?: string;
  status?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  start_hours?: number | string;
  end_hours?: number | string;
}

@Injectable()
export class StatementService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly excel: ExcelService,
    private readonly scope: OrgScopeService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
    private readonly exportRunner: ExportTaskRunner,
    private readonly i18n: I18nService,
  ) {}

  // ============================================================
  // CRUD
  // ============================================================

  // GET /api/v1/economist/statements — Laravel StatementQueryService::paginate.
  // filter($user, {organizations}) + year/month + search/code/hours/status,
  // orderBy(sort_by ?? id, sort_order ?? desc), paginate(per_page ?? 10).
  async list(q: StatementListQuery) {
    const lang = this.ctx.lang;
    const year =
      q.year !== undefined ? Number(q.year) : new Date().getFullYear();
    const month =
      q.month !== undefined ? Number(q.month) : new Date().getMonth() + 1;
    const page = q.page ? Number(q.page) : 1;
    const perPage = q.per_page ? Number(q.per_page) : 10;
    const offset = (page - 1) * perPage;

    // Laravel filter($user, $filters) — StatementIndexRequest faqat `organizations`
    // validatsiya qiladi (organization_id YO'Q) → rol-scope + organizations csv.
    const inScope = await this.scope.whereOrg(statements.organization_id, {
      organizations: q.organizations,
    });

    const conds: SQL[] = [
      notDeleted(statements),
      eq(statements.year, year),
      eq(statements.month, month),
    ];
    if (inScope) conds.push(inScope);

    // search: whereHas('worker', searchByFullName) OR full_name LIKE OR pin LIKE
    if (q.search) {
      const term = `%${q.search}%`;
      const workerCond = buildWorkerSearchCond(q.search);
      const orParts: SQL[] = [];
      if (workerCond) {
        orParts.push(
          sql`exists (select 1 from ${workers} where ${workers.id} = ${statements.worker_id} and ${workers.deleted_at} is null and (${workerCond}))`,
        );
      }
      orParts.push(ilike(statements.full_name, term));
      orParts.push(sql`cast(${statements.pin} as text) ilike ${term}`);
      const orCond = or(...orParts);
      if (orCond) conds.push(orCond);
    }

    // code: s_<code> > 0 (faqat 3 raqamli kod)
    if (q.code && /^\d{3}$/.test(q.code)) {
      conds.push(sql`${sql.identifier('s_' + q.code)} > 0`);
    }

    // start_hours / end_hours: work_time oraliq.
    if (q.start_hours !== undefined && q.start_hours !== null) {
      conds.push(gte(statements.work_time, Number(q.start_hours)));
    }
    if (q.end_hours !== undefined && q.end_hours !== null) {
      conds.push(lte(statements.work_time, Number(q.end_hours)));
    }

    // Laravel: array_key_exists('status', $filters) → worker_id IS NULL
    // (qiymatdan qat'i nazar, mavjud bo'lsa filtr qo'llanadi).
    if (q.status !== undefined) {
      conds.push(isNull(statements.worker_id));
    }

    const where = and(...conds);

    const sortCol = SORT_COLUMNS[q.sort_by ?? 'id'] ?? statements.id;
    const dir = q.sort_order === 'asc' ? asc : desc;

    // Laravel paginate() — AVVAL count, total=0 bo'lsa items query UMUMAN
    // ishlamaydi. Bizda ham shunday qilamiz: aks holda `ORDER BY id DESC LIMIT n`
    // bo'sh natijada (masalan ma'lumot yo'q oy) butun id-indeksni teskari skan
    // qiladi (~1.8M qator → so'rov osilib qoladi). Shu sabab parallel emas:
    // count → (faqat >0 bo'lsa) items.
    const [{ total }] = await this.db
      .select({ total: count() })
      .from(statements)
      .where(where);
    const totalNum = Number(total);
    if (totalNum === 0) {
      // Laravel PaginateResource — per_page YO'Q.
      return { current_page: page, total: 0, data: [] };
    }

    const rows = await this.db
      .select({
        id: statements.id,
        organization_id: statements.organization_id,
        worker_id: statements.worker_id,
        main_salary: statements.main_salary,
        work_time: statements.work_time,
        full_name: statements.full_name,
        position: statements.position,
        pin: statements.pin,
        year: statements.year,
        month: statements.month,
        total_one: statements.total_one,
        total_two: statements.total_two,
        total_three: statements.total_three,
        total_four: statements.total_four,
        total_five: statements.total_five,
        org_id: organizations.id,
        org_name: organizations.name,
        org_name_ru: organizations.name_ru,
        org_name_en: organizations.name_en,
        org_group: organizations.group,
        w_id: workers.id,
        w_last_name: workers.last_name,
        w_first_name: workers.first_name,
        w_middle_name: workers.middle_name,
        w_photo: workers.photo,
      })
      .from(statements)
      .leftJoin(
        organizations,
        and(
          eq(organizations.id, statements.organization_id),
          notDeleted(organizations),
        ),
      )
      .leftJoin(
        workers,
        and(eq(workers.id, statements.worker_id), notDeleted(workers)),
      )
      .where(where)
      .orderBy(dir(sortCol))
      .limit(perPage)
      .offset(offset);

    const data = await Promise.all(
      rows.map((r) =>
        StatementMapper.toItem(r as StatementRow, lang, this.minio),
      ),
    );

    // Laravel PaginateResource — per_page YO'Q.
    return { current_page: page, total: totalNum, data };
  }

  // GET /api/v1/economist/statements/{id} — bitta yozuv. Topilmasa 404.
  async show(id: number) {
    const [row] = await this.db
      .select()
      .from(statements)
      .where(eq(statements.id, id))
      .limit(1);
    if (!row) throw new BusinessException(404, 'not_found');
    return row;
  }

  // POST /api/v1/economist/statements — manual insert.
  // Laravel'da odatda Excel uploadidan keyin avtomatik bo'ladi — manual create stub.
  // Stub uchun `async` saqlanmoqda (controller `await` qiladi), `await` keyinroq qo'shiladi.
  // eslint-disable-next-line @typescript-eslint/require-await
  async create(_body: unknown) {
    return { created: true };
  }

  // PUT /api/v1/economist/statements/{id} — manual update (stub).
  // eslint-disable-next-line @typescript-eslint/require-await
  async update(_id: number, _body: unknown) {
    return { updated: true };
  }

  // DELETE /api/v1/economist/statements/{id} — soft-delete.
  async remove(id: number) {
    await this.db
      .update(statements)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(statements.id, id));
  }

  // ============================================================
  // EXTRAS
  // ============================================================

  // GET /api/v1/economist/statements-count — umumiy son (filtersiz).
  async statementsCount() {
    const [{ total }] = await this.db
      .select({ total: count() })
      .from(statements)
      .where(notDeleted(statements));
    // Laravel: Helper::response(true, $count) — xom son (scalar), {count} EMAS.
    return Number(total);
  }

  /**
   * GET /api/v1/economist/statement-decoding — yillik kodlar bo'yicha pivot.
   * Har kod uchun 12 oylik summa + yillik jami.
   * Kodlar 4 guruhga bo'lingan: plus / minus_one / minus_two / hold.
   * Har guruh oxirida "Jami" qator, eng oxirida kombinatsiya qatorlari.
   */
  async decoding(q: {
    year?: string | number;
    month?: string | number;
    organizations?: string;
    lang?: string;
    download?: string;
  }): Promise<DecodingRow[] | string> {
    const year =
      q?.year !== undefined ? Number(q.year) : new Date().getFullYear();
    // Laravel: trans()/names() app locale (Accept-Language) ishlatadi, `?lang` emas.
    const lang = this.ctx.lang;

    // Laravel StatementAggregate::filter($user, $filters) → rol org-scope +
    // organizations csv. `month` decode()'da ishlatilmaydi (12 oy pivot).
    const inScope = await this.scope.whereOrg(
      statement_aggregates.organization_id,
      { organizations: q.organizations },
    );
    const conds: SQL[] = [
      notDeleted(statement_aggregates),
      eq(statement_aggregates.year, year),
    ];
    if (inScope) conds.push(inScope);

    // 1. statement_aggregates'dan har month × code uchun SUM
    const rows = await this.db
      .select({
        month: statement_aggregates.month,
        code: statement_aggregates.code,
        total_sum: sql<number>`SUM(${statement_aggregates.total_sum})`,
      })
      .from(statement_aggregates)
      .where(and(...conds))
      .groupBy(statement_aggregates.month, statement_aggregates.code);

    // 2. monthData[month][code] = sum
    const monthData = new Map<number, Map<number, number>>();
    for (const r of rows) {
      if (!monthData.has(r.month)) monthData.set(r.month, new Map());
      monthData.get(r.month)!.set(r.code, Number(r.total_sum ?? 0));
    }

    // 3. Kod guruhlari (set'lar — tezroq qidiruv uchun)
    const plusCodes = new Set([...TOTAL_ONE_COLUMNS].map(Number));
    const minusOneCodes = new Set([...TOTAL_FOUR_COLUMNS].map(Number));
    const minusTwoCodes = new Set([...TOTAL_TWO_COLUMNS].map(Number));
    const holdCodes = new Set([...TOTAL_FIVE_COLUMNS].map(Number));

    // 5. Har guruh uchun rows + sums
    const plusList: DecodingRow[] = [];
    const minusOneList: DecodingRow[] = [];
    const minusTwoList: DecodingRow[] = [];
    const holdList: DecodingRow[] = [];

    // Har guruhda monthlySum[1..12] + yearTotal
    const sums = {
      plus: this.initSums(),
      minus_one: this.initSums(),
      minus_two: this.initSums(),
      hold: this.initSums(),
    };

    // 6. Barcha kodlar bo'yicha aylanish — Laravel paymentTypes (lug'at tartibi).
    for (const [codeStr, name] of getCodeNamesOrdered(lang)) {
      const code = Number(codeStr);
      const row: DecodingRow = {
        type_name: name,
        type_code: codeStr,
      };
      let total = 0;
      const monthlyValues: number[] = [];

      for (let m = 1; m <= 12; m++) {
        const v = monthData.get(m)?.get(code) ?? 0;
        row[String(m)] = this.fmt(v);
        monthlyValues.push(v);
        total += v;
      }
      row.total_year = this.fmt(total);

      // Qaysi guruhga tegishli
      if (plusCodes.has(code)) {
        plusList.push(row);
        this.addToSums(sums.plus, monthlyValues, total);
      } else if (minusOneCodes.has(code)) {
        minusOneList.push(row);
        this.addToSums(sums.minus_one, monthlyValues, total);
      } else if (minusTwoCodes.has(code)) {
        minusTwoList.push(row);
        this.addToSums(sums.minus_two, monthlyValues, total);
      } else if (holdCodes.has(code)) {
        holdList.push(row);
        this.addToSums(sums.hold, monthlyValues, total);
      }
    }

    // 7. Laravel StatementDecodingService::decode yig'ilishi — i18n labellar.
    const t = (k: string): string =>
      this.i18n.t(`messages.economist.statement.decoding.${k}`, { lang });
    const MONTHS_LOWER = [
      'yanvar',
      'fevral',
      'mart',
      'aprel',
      'may',
      'iyun',
      'iyul',
      'avgust',
      'sentyabr',
      'oktyabr',
      'noyabr',
      'dekabr',
    ];

    // initHeaderRow: type_name=four, type_code=five, 1=year, 2..12=' ', total=in_year.
    const headerRow: DecodingRow = {
      type_name: t('four'),
      type_code: t('five'),
    };
    headerRow['1'] = String(year);
    for (let m = 2; m <= 12; m++) headerRow[String(m)] = ' ';
    headerRow.total_year = t('in_year');

    // initEmptyMonthRow: 1..12 = oy nomi (kichik harf), qolgani ' '.
    const monthRow: DecodingRow = { type_name: '', type_code: ' ' };
    for (let m = 1; m <= 12; m++) monthRow[String(m)] = MONTHS_LOWER[m - 1];
    monthRow.total_year = ' ';

    // initEmptyRow: section sarlavhasi (barcha katak ' ').
    const sectionRow = (typeName: string): DecodingRow => {
      const r: DecodingRow = { type_name: typeName, type_code: ' ' };
      for (let m = 1; m <= 12; m++) r[String(m)] = ' ';
      r.total_year = ' ';
      return r;
    };

    const result: DecodingRow[] = [
      headerRow,
      monthRow,
      sectionRow(t('one')),
      ...plusList,
      this.summaryRow(sums.plus, t('six')),
      sectionRow(t('two')),
      ...minusOneList,
      this.summaryRow(sums.minus_one, t('six')),
      sectionRow(t('eight')),
      ...minusTwoList,
      this.summaryRow(sums.minus_two, t('six')),
      this.combinedRow(
        t('seven'),
        this.sumOfSums(sums.minus_one, sums.minus_two),
      ),
      this.combinedRow(
        t('nine'),
        this.sumOfSums(sums.plus, sums.minus_one, sums.minus_two),
      ),
      sectionRow(t('three')),
      ...holdList,
      this.summaryRow(sums.hold, t('six')),
    ];

    // Laravel: array_key_exists('download') → UserExportTask + fonda Excel,
    // javob faqat success xabari (string). Aks holda matritsa.
    if (q.download !== undefined) {
      await this.exportRunner.run({
        type: 15, // ExportTaskEnum.STATEMENTS_WITH_CODES
        folder: 'statements',
        build: () => this.buildDecodingExcel(result),
      });
      return this.i18n.t('messages.successfully_exported', { lang });
    }

    return result;
  }

  /** StatementDecodingByMonthExport — decode matritsasini Excel'ga (FromArray). */
  private buildDecodingExcel(rows: DecodingRow[]): Promise<Buffer> {
    // Ustun kalitlari: type_name, type_code, (oylar 1..12 yoki org id'lari), total_year.
    const first = rows[0] ?? {};
    const middle = Object.keys(first).filter(
      (k) => k !== 'type_name' && k !== 'type_code' && k !== 'total_year',
    );
    const keys = ['type_name', 'type_code', ...middle, 'total_year'];
    const columns = keys.map((k) => ({ header: k, key: k, width: 16 }));
    return this.excel.build({
      creator: 'HRM Economist',
      sheets: [
        {
          name: 'Worksheet',
          columns,
          rows: rows,
        },
      ],
    });
  }

  /**
   * GET /api/v1/economist/statement-decoding-organizations — tashkilotlar
   * kesimida kod bo'yicha. Faqat (year, month) berilgan.
   * Limit 15 ta tashkilot (Laravel parity).
   */
  async decodingByOrganization(q: {
    year?: string | number;
    month?: string | number;
    organizations?: string;
    lang?: string;
    download?: string;
  }): Promise<DecodingRow[] | string> {
    const year =
      q?.year !== undefined ? Number(q.year) : new Date().getFullYear();
    const month =
      q?.month !== undefined ? Number(q.month) : new Date().getMonth() + 1;
    const lang = this.ctx.lang;
    const t = (k: string): string =>
      this.i18n.t(`messages.economist.statement.decoding.${k}`, { lang });

    // Laravel leaderOrganizations($user) (rol subtree) + organizations csv,
    // orderBy id, limit 15.
    const scopeIds = await this.scope.ids();
    if (!scopeIds.length) return [];
    const orgConds: SQL[] = [
      notDeleted(organizations),
      inArray(organizations.id, scopeIds),
    ];
    if (q.organizations) {
      const ids = q.organizations
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => !Number.isNaN(n));
      if (ids.length) orgConds.push(inArray(organizations.id, ids));
    }
    const orgRows = await this.db
      .select({ id: organizations.id, code: organizations.code })
      .from(organizations)
      .where(and(...orgConds))
      .orderBy(asc(organizations.id))
      .limit(15);
    if (orgRows.length === 0) return [];
    const orgIds = orgRows.map((o) => o.id);

    // statement_aggregates: org × code SUM (year + month + orgs).
    const aggRows = await this.db
      .select({
        organization_id: statement_aggregates.organization_id,
        code: statement_aggregates.code,
        total_sum: sql<number>`SUM(${statement_aggregates.total_sum})`,
      })
      .from(statement_aggregates)
      .where(
        and(
          eq(statement_aggregates.year, year),
          eq(statement_aggregates.month, month),
          inArray(statement_aggregates.organization_id, orgIds),
        ),
      )
      .groupBy(statement_aggregates.organization_id, statement_aggregates.code);
    const orgData = new Map<number, Map<number, number>>();
    for (const r of aggRows) {
      const oid = r.organization_id!;
      if (!orgData.has(oid)) orgData.set(oid, new Map());
      orgData.get(oid)!.set(r.code, Number(r.total_sum ?? 0));
    }

    const plusCodes = new Set([...TOTAL_ONE_COLUMNS].map(Number));
    const minusOneCodes = new Set([...TOTAL_FOUR_COLUMNS].map(Number));
    const minusTwoCodes = new Set([...TOTAL_TWO_COLUMNS].map(Number));
    const holdCodes = new Set([...TOTAL_FIVE_COLUMNS].map(Number));

    const plusList: DecodingRow[] = [];
    const minusOneList: DecodingRow[] = [];
    const minusTwoList: DecodingRow[] = [];
    const holdList: DecodingRow[] = [];

    // Per-org sum + total_year (har guruh).
    type OrgSums = { org: Map<number, number>; total: number };
    const mkSums = (): OrgSums => ({
      org: new Map<number, number>(orgIds.map((id) => [id, 0])),
      total: 0,
    });
    const sums = {
      plus: mkSums(),
      minus_one: mkSums(),
      minus_two: mkSums(),
      hold: mkSums(),
    };

    // Laravel paymentTypes (lug'at tartibi).
    for (const [codeStr, name] of getCodeNamesOrdered(lang)) {
      const code = Number(codeStr);
      let group: keyof typeof sums | null = null;
      if (plusCodes.has(code)) group = 'plus';
      else if (minusOneCodes.has(code)) group = 'minus_one';
      else if (minusTwoCodes.has(code)) group = 'minus_two';
      else if (holdCodes.has(code)) group = 'hold';
      if (!group) continue;

      const row: DecodingRow = { type_name: name, type_code: codeStr };
      let total = 0;
      for (const o of orgRows) {
        const v = orgData.get(o.id)?.get(code) ?? 0;
        row[String(o.id)] = this.fmt(v);
        total += v;
        sums[group].org.set(o.id, (sums[group].org.get(o.id) ?? 0) + v);
      }
      row.total_year = this.fmt(total);
      sums[group].total += total;

      if (group === 'plus') plusList.push(row);
      else if (group === 'minus_one') minusOneList.push(row);
      else if (group === 'minus_two') minusTwoList.push(row);
      else holdList.push(row);
    }

    // initHeaderRowOrganization: [org.id]=org.code, total_year=six (Jami).
    const headerRow: DecodingRow = {
      type_name: t('four'),
      type_code: t('five'),
    };
    for (const o of orgRows) headerRow[String(o.id)] = o.code ?? '';
    headerRow.total_year = t('six');

    // initEmptyRowOrganization: section label (barcha katak ' ').
    const sectionRow = (typeName: string): DecodingRow => {
      const r: DecodingRow = { type_name: typeName, type_code: ' ' };
      for (const o of orgRows) r[String(o.id)] = ' ';
      r.total_year = ' ';
      return r;
    };
    // appendSummary / combined — 1+ guruh per-org yig'indisi.
    const sumRow = (typeName: string, ...groups: OrgSums[]): DecodingRow => {
      const r: DecodingRow = { type_name: typeName, type_code: ' ' };
      for (const o of orgRows) {
        const v = groups.reduce((acc, g) => acc + (g.org.get(o.id) ?? 0), 0);
        r[String(o.id)] = this.fmt(v);
      }
      r.total_year = this.fmt(groups.reduce((acc, g) => acc + g.total, 0));
      return r;
    };

    // Laravel tartibi: plus, [minusOne, minusTwo, combinedMinus, combinedTotal], hold.
    const result: DecodingRow[] = [
      headerRow,
      sectionRow(t('one')),
      ...plusList,
      sumRow(t('six'), sums.plus),
      sectionRow(t('two')),
      ...minusOneList,
      sumRow(t('six'), sums.minus_one),
      sectionRow(t('eight')),
      ...minusTwoList,
      sumRow(t('six'), sums.minus_two),
      sumRow(t('seven'), sums.minus_one, sums.minus_two),
      sumRow(t('nine'), sums.plus, sums.minus_one, sums.minus_two),
      sectionRow(t('three')),
      ...holdList,
      sumRow(t('six'), sums.hold),
    ];

    if (q.download !== undefined) {
      await this.exportRunner.run({
        type: 16, // ExportTaskEnum.STATEMENTS_WITH_ORGANIZATIONS
        folder: 'statements',
        build: () => this.buildDecodingExcel(result),
      });
      return this.i18n.t('messages.successfully_exported', { lang });
    }

    return result;
  }

  /**
   * GET /api/v1/economist/statements-multiple-workers — Laravel
   * exportMultipleStatementWorkers → MultipleStatementsJob. UserExportTask
   * yaratadi va fonda bir oyda bir nechta tashkilotda statement topshirgan
   * xodimlar Excel'ini quradi. Javob faqat success xabari (Helper::response).
   */
  async multiWorkers(q: PageQueryLike): Promise<void> {
    const year =
      q?.year !== undefined ? Number(q.year) : new Date().getFullYear();
    const month =
      q?.month !== undefined ? Number(q.month) : new Date().getMonth() + 1;
    await this.exportRunner.run({
      type: 14, // ExportTaskEnum.STATEMENT_MULTIPLE_WORKERS
      folder: 'economist',
      build: () => this.exportMultiWorkers(year, month),
    });
  }

  // GET /api/v1/economist/statements-by-positions — Excel eksport uchun ma'lumot.

  // GET /api/v1/economist/statements-by-positions — Laravel
  // downloadWorkersByPositions → StatementsByPositionJob. UserExportTask + fonda
  // Excel (javob faqat success xabari).
  async byPositions(q: ByPositionsQueryLike): Promise<void> {
    const year =
      q?.year !== undefined ? Number(q.year) : new Date().getFullYear();
    await this.exportRunner.run({
      type: 27, // ExportTaskEnum.STATEMENTS_BY_POSITIONS
      folder: 'economist',
      build: () =>
        this.exportByPosition(year, {
          organizations: q?.organizations,
          organization_id: q?.organization_id,
          positions: q?.positions,
        }),
    });
  }

  // GET /api/v1/economist/statement-example — namuna Excel URL.
  example() {
    return { url: economistAssetUrl('statement_example.xlsx') };
  }

  // ============================================================
  // EXCEL EXPORTS — 4 ta hisobot ExcelService yordamida
  // ============================================================

  /**
   * StatementsByPositionExport — bir yil ichida har xodim uchun har oylik
   * `total_four` qiymatlarini matritsa shaklida chiqaradi.
   */
  async exportByPosition(
    year: number,
    filters: {
      organizations?: string;
      organization_id?: number;
      positions?: string;
    } = {},
  ): Promise<Buffer> {
    const conds: SQL[] = [notDeleted(statements), eq(statements.year, year)];

    // Rol/org-scope — Laravel StatementsByPositionExport ->filter($user).
    // Scope bo'sh bo'lsa whereOrg `FALSE` qaytaradi → ruxsatsiz ko'rinmaydi.
    const inScope = await this.scope.whereOrg(statements.organization_id, {
      organizations: filters.organizations,
      organization_id: filters.organization_id,
    });
    if (inScope) conds.push(inScope);

    // positions filtri — Laravel ->when(positions, whereIn('position_id', csv)).
    // statements'da position_id yo'q (matn) → position_id'larni nomга map qilamiz.
    const posIds = (filters.positions ?? '')
      .split(',')
      .map((x) => Number(x.trim()))
      .filter((x) => x > 0);
    if (posIds.length) {
      const pr = await this.db
        .select({ name: positions.name })
        .from(positions)
        .where(inArray(positions.id, posIds));
      const names = pr.map((p) => p.name).filter((n): n is string => !!n);
      conds.push(
        names.length ? inArray(statements.position, names) : sql`FALSE`,
      );
    }

    const rows = await this.db
      .select({
        pin: statements.pin,
        full_name: statements.full_name,
        position: statements.position,
        organization_id: statements.organization_id,
        month: statements.month,
        total_four: statements.total_four,
      })
      .from(statements)
      .where(and(...conds))
      .orderBy(statements.organization_id, statements.full_name);

    const byPin = new Map<
      string,
      {
        pin: number | null;
        full_name: string | null;
        position: string | null;
        organization_id: number;
        months: Record<number, number>;
      }
    >();
    for (const r of rows) {
      const key = String(r.pin ?? r.full_name ?? Math.random());
      let item = byPin.get(key);
      if (!item) {
        item = {
          pin: r.pin,
          full_name: r.full_name,
          position: r.position,
          organization_id: r.organization_id,
          months: {},
        };
        byPin.set(key, item);
      }
      item.months[r.month] = (item.months[r.month] ?? 0) + r.total_four;
    }

    // Org nomlari (real, batch) — `Org #N` placeholder o'rniga.
    const orgIds = [
      ...new Set(
        [...byPin.values()]
          .map((w) => w.organization_id)
          .filter((x): x is number => x != null),
      ),
    ];
    const orgRows = orgIds.length
      ? await this.db
          .select({ id: organizations.id, name: organizations.name })
          .from(organizations)
          .where(inArray(organizations.id, orgIds))
      : [];
    const orgMap = new Map(orgRows.map((o) => [o.id, o.name]));

    const excelRows = Array.from(byPin.values()).map((w) => {
      const row: Record<string, unknown> = {
        organization: orgMap.get(w.organization_id) ?? null,
        full_name: w.full_name ?? '-',
        position: w.position ?? '-',
        pin: w.pin?.toString() ?? '-',
      };
      for (let m = 1; m <= 12; m++) row[`m${m}`] = w.months[m] ?? 0;
      return row;
    });

    return this.excel.build({
      creator: 'HRM Economist',
      sheets: [
        {
          name: `Statementlar ${year}`,
          columns: [
            { header: 'Tashkilot', key: 'organization', width: 22 },
            { header: 'Xodim F.I.SH', key: 'full_name', width: 28 },
            { header: 'Lavozim', key: 'position', width: 25 },
            { header: 'PIN', key: 'pin', width: 16 },
            ...MONTHS_UZ.map((m, idx) => ({
              header: m,
              key: `m${idx + 1}`,
              width: 12,
              numFmt: FMT.MONEY,
            })),
          ],
          rows: excelRows,
          headerStyle: HEADER_BLUE,
          autoFilter: true,
          freezeHeader: true,
        },
      ],
    });
  }

  /**
   * MultiStatementWorkersExport — bir oyda bir nechta tashkilotda statement
   * topshirgan xodimlar (vertikal merge).
   */
  async exportMultiWorkers(year: number, month: number): Promise<Buffer> {
    const conds = [
      notDeleted(statements),
      eq(statements.year, year),
      eq(statements.month, month),
    ];

    const duplicates = await this.db
      .select({ pin: statements.pin, cnt: count() })
      .from(statements)
      .where(and(...conds))
      .groupBy(statements.pin)
      .having(sql`COUNT(*) > 1`);

    const duplicatePins = duplicates
      .map((d) => d.pin)
      .filter((p): p is number => p !== null);

    if (duplicatePins.length === 0) {
      return this.excel.build({
        creator: 'HRM Economist',
        sheets: [
          {
            name: `Multi-statement ${year}-${month}`,
            columns: [
              { header: 'Xodim', key: 'full_name', width: 28 },
              { header: 'PIN', key: 'pin', width: 16 },
              {
                header: 'Jami',
                key: 'total_salary',
                width: 15,
                numFmt: FMT.MONEY,
              },
              { header: 'Tashkilot', key: 'organization', width: 25 },
              { header: 'Lavozim', key: 'position', width: 25 },
              { header: 'Maosh', key: 'salary', width: 15, numFmt: FMT.MONEY },
            ],
            rows: [],
            headerStyle: HEADER_BLUE,
            autoFilter: true,
          },
        ],
      });
    }

    const allRows = await this.db
      .select({
        pin: statements.pin,
        full_name: statements.full_name,
        position: statements.position,
        organization_id: statements.organization_id,
        total_four: statements.total_four,
      })
      .from(statements)
      .where(and(...conds, inArray(statements.pin, duplicatePins)))
      .orderBy(statements.pin, statements.organization_id);

    // Org nomlari batch
    const orgIds = [...new Set(allRows.map((r) => r.organization_id))];
    const orgRows = orgIds.length
      ? await this.db
          .select({ id: organizations.id, name: organizations.name })
          .from(organizations)
          .where(inArray(organizations.id, orgIds))
      : [];
    const orgMap = new Map(orgRows.map((o) => [o.id, o.name]));

    type Group = {
      pin: number;
      full_name: string;
      total_salary: number;
      orgs: Array<{
        organization_id: number;
        organization_name: string;
        position: string | null;
        salary: number;
      }>;
    };
    const groups = new Map<number, Group>();
    for (const r of allRows) {
      const pin = r.pin!;
      let g = groups.get(pin);
      if (!g) {
        g = { pin, full_name: r.full_name ?? '-', total_salary: 0, orgs: [] };
        groups.set(pin, g);
      }
      g.orgs.push({
        organization_id: r.organization_id,
        // Laravel MultiStatementWorkersExport: $org['organization'] ?? '' (real nom).
        organization_name: orgMap.get(r.organization_id) ?? '',
        position: r.position,
        salary: r.total_four,
      });
      g.total_salary += r.total_four;
    }

    const excelRows: Record<string, unknown>[] = [];
    const merges: string[] = [];
    let currentRow = 2;

    for (const g of groups.values()) {
      const startRow = currentRow;
      const endRow = currentRow + g.orgs.length - 1;

      g.orgs.forEach((o, idx) => {
        excelRows.push({
          full_name: idx === 0 ? g.full_name : '',
          pin: idx === 0 ? g.pin.toString() : '',
          total_salary: idx === 0 ? g.total_salary : '',
          organization: o.organization_name,
          position: o.position ?? '-',
          salary: o.salary,
        });
      });

      if (g.orgs.length > 1) {
        merges.push(`A${startRow}:A${endRow}`);
        merges.push(`B${startRow}:B${endRow}`);
        merges.push(`C${startRow}:C${endRow}`);
      }

      currentRow = endRow + 1;
    }

    return this.excel.build({
      creator: 'HRM Economist',
      sheets: [
        {
          name: `Multi-statement ${year}-${month}`,
          columns: [
            { header: 'Xodim', key: 'full_name', width: 28 },
            { header: 'PIN', key: 'pin', width: 16 },
            {
              header: 'Jami',
              key: 'total_salary',
              width: 15,
              numFmt: FMT.MONEY,
            },
            { header: 'Tashkilot', key: 'organization', width: 25 },
            { header: 'Lavozim', key: 'position', width: 25 },
            { header: 'Maosh', key: 'salary', width: 15, numFmt: FMT.MONEY },
          ],
          rows: excelRows,
          headerStyle: HEADER_BLUE,
          autoFilter: true,
          freezeHeader: true,
          merges,
        },
      ],
    });
  }

  // ============================================================
  // statements-export-with-codes — Laravel async-task
  //   type=workers       → flat jadval (DynamicExportFromArray)
  //   type=organizations → tashkilotlar daraxti + kod summalari
  // ============================================================

  /**
   * POST /api/v1/economist/statements-export-with-codes — Laravel
   * StatementExportService::exportWithCodes. UserExportTask yaratadi + fonda
   * type bo'yicha Excel quradi (javob faqat success xabari).
   */
  async exportWithCodes(body: {
    year: number | string;
    month: number | string;
    codes: string[];
    type: string;
    organizations?: string;
  }): Promise<void> {
    const isOrg = body.type === 'organizations';
    await this.exportRunner.run({
      // ExportTaskEnum: STATEMENT_WITH_CODES_BY_ORGANIZATION=12, _BY_WORKERS=13
      type: isOrg ? 12 : 13,
      folder: 'statements',
      build: () =>
        isOrg
          ? this.buildCodesByOrganization(body)
          : this.buildCodesByWorkers(body),
    });
  }

  /**
   * Laravel StatementExportWithCodesByWorkersJob + DynamicExportFromArray.
   * filter($user) (rol org-scope) + (OR s_<code> > 0) + year + month →
   * flat qatorlar: {full_name, position, organization(real name), <code>: s_<code>}.
   */
  private async buildCodesByWorkers(body: {
    year: number | string;
    month: number | string;
    codes: string[];
  }): Promise<Buffer> {
    const lang = this.ctx.lang;
    const year = Number(body.year);
    const month = Number(body.month);
    const codes = body.codes;

    const inScope = await this.scope.whereOrg(statements.organization_id, {});
    const codeOr = or(
      ...codes.map((c) => sql`${sql.identifier('s_' + c)} > 0`),
    );
    const conds: SQL[] = [
      notDeleted(statements),
      eq(statements.year, year),
      eq(statements.month, month),
    ];
    if (inScope) conds.push(inScope);
    if (codeOr) conds.push(codeOr);

    // Dinamik select: full_name, position, organization_id, s_<code>...
    const stmtCols = statements as unknown as Record<string, PgColumn>;
    const sel: Record<string, PgColumn> = {
      full_name: statements.full_name,
      position: statements.position,
      organization_id: statements.organization_id,
    };
    for (const c of codes) sel['s_' + c] = stmtCols['s_' + c];
    const rows = (await this.db
      .select(sel)
      .from(statements)
      .where(and(...conds))) as Array<Record<string, unknown>>;

    // Org nomlari (Laravel organization?->name — haqiqiy `name`, batch).
    const orgIds = [
      ...new Set(rows.map((r) => Number(r.organization_id)).filter(Boolean)),
    ];
    const orgs = orgIds.length
      ? await this.db
          .select({ id: organizations.id, name: organizations.name })
          .from(organizations)
          .where(inArray(organizations.id, orgIds))
      : [];
    const orgMap = new Map(orgs.map((o) => [o.id, o.name]));

    const data = rows.map((r) => {
      const row: Record<string, unknown> = {
        full_name: r.full_name,
        position: r.position,
        organization: orgMap.get(Number(r.organization_id)) ?? null,
      };
      for (const c of codes) row[c] = r['s_' + c] ?? 0;
      return row;
    });

    // DynamicExportFromArray sarlavhalari: worker.* tarjima + raw kod, 1-qator bold.
    const columns = [
      {
        header: this.i18n.t('messages.worker.full_name', { lang }),
        key: 'full_name',
        width: 30,
      },
      {
        header: this.i18n.t('messages.worker.position', { lang }),
        key: 'position',
        width: 28,
      },
      {
        header: this.i18n.t('messages.worker.organization', { lang }),
        key: 'organization',
        width: 28,
      },
      ...codes.map((c) => ({ header: c, key: c, width: 14 })),
    ];
    return this.excel.build({
      creator: 'HRM Economist',
      sheets: [
        { name: 'Worksheet', columns, rows: data, headerStyle: { bold: true } },
      ],
    });
  }

  /**
   * Laravel StatementExportWithCodesJob + StatementWithCodesByOrganizationExport.
   * leaderOrganizations($user) (rol subtree) + organizations csv → tashkilotlar
   * daraxti; har kod uchun statement_aggregates(year/month/code) summasi.
   * Headings: ID, C-1..C-maxDepth, <codes>. (Outline/merge bezaklari soddalashtirilgan.)
   */
  private async buildCodesByOrganization(body: {
    year: number | string;
    month: number | string;
    codes: string[];
    organizations?: string;
  }): Promise<Buffer> {
    const year = Number(body.year);
    const month = Number(body.month);
    const codes = body.codes;

    const scopeIds = await this.scope.ids();
    let orgRows = scopeIds.length
      ? await this.db
          .select({
            id: organizations.id,
            name: organizations.name,
            parent_id: organizations.parent_id,
          })
          .from(organizations)
          .where(
            and(notDeleted(organizations), inArray(organizations.id, scopeIds)),
          )
          .orderBy(asc(organizations._lft))
      : [];

    // Laravel: when(request('organizations')) → whereIn('id', csv).
    if (body.organizations) {
      const ids = new Set(
        body.organizations
          .split(',')
          .map((s) => Number(s.trim()))
          .filter(Boolean),
      );
      orgRows = orgRows.filter((o) => ids.has(o.id));
    }

    // Per-code summalar: statement_aggregates(year/month/code) → sum(total_sum).
    const orgIds = orgRows.map((o) => o.id);
    const codeInts = codes.map((c) => Number(c));
    const aggMap = new Map<string, number>();
    if (orgIds.length && codeInts.length) {
      const aggs = await this.db
        .select({
          organization_id: statement_aggregates.organization_id,
          code: statement_aggregates.code,
          total: sql<number>`COALESCE(SUM(${statement_aggregates.total_sum}), 0)`,
        })
        .from(statement_aggregates)
        .where(
          and(
            notDeleted(statement_aggregates),
            inArray(statement_aggregates.organization_id, orgIds),
            eq(statement_aggregates.year, year),
            eq(statement_aggregates.month, month),
            inArray(statement_aggregates.code, codeInts),
          ),
        )
        .groupBy(
          statement_aggregates.organization_id,
          statement_aggregates.code,
        );
      for (const a of aggs) {
        aggMap.set(`${a.organization_id}:${a.code}`, Number(a.total));
      }
    }

    // Daraxt (parent_id) + flatten: name faqat o'z levelida (name_level_N).
    const idSet = new Set(orgIds);
    const childrenOf = new Map<number | null, typeof orgRows>();
    for (const o of orgRows) {
      const p =
        o.parent_id != null && idSet.has(o.parent_id) ? o.parent_id : null;
      if (!childrenOf.has(p)) childrenOf.set(p, []);
      childrenOf.get(p)!.push(o);
    }
    const flat: Array<{ id: number; level: number; name: string | null }> = [];
    let maxDepth = 1;
    const walk = (parentId: number | null, level: number): void => {
      for (const o of childrenOf.get(parentId) ?? []) {
        flat.push({ id: o.id, level, name: o.name });
        maxDepth = Math.max(maxDepth, level);
        walk(o.id, level + 1);
      }
    };
    walk(null, 1);

    const columns: { header: string; key: string; width?: number }[] = [
      { header: 'ID', key: 'id', width: 8 },
    ];
    for (let i = 1; i <= maxDepth; i++) {
      columns.push({ header: `C-${i}`, key: `name_level_${i}`, width: 28 });
    }
    for (const c of codes) columns.push({ header: c, key: c, width: 16 });

    const data = flat.map((r) => {
      const row: Record<string, unknown> = { id: r.id };
      for (let i = 1; i <= maxDepth; i++) {
        row[`name_level_${i}`] = i === r.level ? r.name : null;
      }
      codes.forEach((c) => (row[c] = aggMap.get(`${r.id}:${Number(c)}`) ?? 0));
      return row;
    });

    return this.excel.build({
      creator: 'HRM Economist',
      sheets: [
        { name: 'Worksheet', columns, rows: data, headerStyle: { bold: true } },
      ],
    });
  }

  /**
   * POST /api/v1/economist/statements-export-with-codes-by-year — Laravel
   * StatementExportByYearWithCodesJob. UserExportTask + fonda yillik pivot Excel.
   */
  async exportWithCodesByYear(body: {
    year: number | string;
    type: string;
    codes?: string[];
  }): Promise<void> {
    await this.exportRunner.run({
      type: 33, // ExportTaskEnum.STATEMENT_WITH_CODES_BY_YEAR
      folder: 'statements',
      build: () =>
        this.exportYearCodes(Number(body.year), body.type, body.codes ?? []),
    });
  }

  /**
   * StatementYearCodesExport — yillik pivot: FIO × (kod|total_four) × oy.
   * 2-qatorli sarlavha (top: kod/total_four, bottom: oy nomi).
   */
  async exportYearCodes(
    year: number,
    type: string,
    codes: string[],
  ): Promise<Buffer> {
    const isCode = type === 'code';
    const groups = isCode ? codes : ['total_four'];

    // Laravel filter($user) — rol org-scope.
    const inScope = await this.scope.whereOrg(statements.organization_id, {});
    // type=code → OR s_<code> > 0; aks holda total_four > 0.
    const filterCond = isCode
      ? or(...codes.map((c) => sql`${sql.identifier('s_' + c)} > 0`))
      : sql`${statements.total_four} > 0`;
    const conds: SQL[] = [notDeleted(statements), eq(statements.year, year)];
    if (inScope) conds.push(inScope);
    if (filterCond) conds.push(filterCond);

    // Dinamik select (s_<code>... yoki total_four).
    const stmtCols = statements as unknown as Record<string, PgColumn>;
    const sel: Record<string, PgColumn> = {
      full_name: statements.full_name,
      position: statements.position,
      organization_id: statements.organization_id,
      month: statements.month,
    };
    if (isCode) for (const c of codes) sel['s_' + c] = stmtCols['s_' + c];
    else sel['total_four'] = statements.total_four;
    const rows = (await this.db
      .select(sel)
      .from(statements)
      .where(and(...conds))
      .orderBy(statements.organization_id, statements.full_name)) as Array<
      Record<string, unknown>
    >;

    type WorkerYear = {
      full_name: string | null;
      position: string | null;
      organization_id: number | null;
      values: Record<string, Record<number, number>>;
    };
    // Laravel ->groupBy('full_name').
    const byName = new Map<string, WorkerYear>();
    for (const r of rows) {
      const key = String((r.full_name as string | null) ?? '');
      let w = byName.get(key);
      if (!w) {
        w = {
          full_name: r.full_name as string | null,
          position: r.position as string | null,
          organization_id: r.organization_id as number | null,
          values: {},
        };
        byName.set(key, w);
      }
      const month = Number(r.month);
      for (const g of groups) {
        const val = Number(isCode ? r['s_' + g] : r.total_four) || 0;
        if (!w.values[g]) w.values[g] = {};
        w.values[g][month] = (w.values[g][month] ?? 0) + val;
      }
    }

    // Org nomlari (Laravel organization?->name — haqiqiy `name`, batch).
    const orgIds = [
      ...new Set(
        [...byName.values()]
          .map((w) => w.organization_id)
          .filter((x): x is number => x != null),
      ),
    ];
    const orgs = orgIds.length
      ? await this.db
          .select({ id: organizations.id, name: organizations.name })
          .from(organizations)
          .where(inArray(organizations.id, orgIds))
      : [];
    const orgMap = new Map(orgs.map((o) => [o.id, o.name]));

    // 2-qatorli sarlavha (Laravel StatementYearCodesExport): top FIO/Lavozim/
    // Tashkilot + (kod|total_four) har oy; bottom — oy nomlari.
    const top: (string | number)[] = ['FIO', 'Lavozim', 'Tashkilot'];
    const bottom: (string | number)[] = ['', '', ''];
    const columns = [
      { header: 'FIO', key: 'full_name', width: 28 },
      { header: 'Lavozim', key: 'position', width: 22 },
      { header: 'Tashkilot', key: 'organization', width: 22 },
    ];
    for (const g of groups) {
      for (let m = 1; m <= 12; m++) {
        top.push(g);
        bottom.push(MONTHS_UZ[m - 1]);
        columns.push({ header: '', key: `${g}_m${m}`, width: 12 });
      }
    }

    const headerMergesTop: string[] = ['A1:A2', 'B1:B2', 'C1:C2'];
    let col = 4;
    for (let i = 0; i < groups.length; i++) {
      headerMergesTop.push(
        `${this.colLetter(col)}1:${this.colLetter(col + 11)}1`,
      );
      col += 12;
    }

    const headerRows: ExcelHeaderRow[] = [
      {
        values: top,
        merges: headerMergesTop,
        style: { bold: true },
        height: 26,
      },
      { values: bottom, style: { bold: true }, height: 22 },
    ];

    const excelRows = [...byName.values()].map((w) => {
      const row: Record<string, unknown> = {
        full_name: w.full_name,
        position: w.position,
        organization:
          w.organization_id != null
            ? (orgMap.get(w.organization_id) ?? null)
            : null,
      };
      for (const g of groups) {
        for (let m = 1; m <= 12; m++) row[`${g}_m${m}`] = w.values[g]?.[m] ?? 0;
      }
      return row;
    });

    return this.excel.build({
      creator: 'HRM Economist',
      sheets: [
        {
          name: 'Worksheet',
          columns,
          rows: excelRows,
          headerRows,
          freezeHeader: true,
          autoFilter: false,
        },
      ],
    });
  }

  /**
   * StatementDecodingByMonthExport — kod bo'yicha dekodlash hisobotini Excel'ga.
   * Real `decoding()` natijasidan foydalanadi.
   */
  async exportDecodingByMonth(year: number, lang = 'uz'): Promise<Buffer> {
    // decoding() endi DecodingRow[] | string (download holati) qaytaradi —
    // bu yerda download yo'q, lekin tip uchun guard.
    const res = await this.decoding({ year, lang });
    const decodingRows: DecodingRow[] = Array.isArray(res) ? res : [];

    // Excel uchun: filterlangan rows (faqat real ma'lumot bor qatorlar).
    const dataRows: DecodingRow[] = decodingRows.filter(
      (r) => r.type_name && r.type_code,
    );

    return this.excel.build({
      creator: 'HRM Economist',
      sheets: [
        {
          name: `Decoding ${year}`,
          columns: [
            { header: 'Kod nomi', key: 'type_name', width: 50 },
            { header: 'Kod', key: 'type_code', width: 12 },
            ...MONTHS_UZ.map((m, idx) => ({
              header: m,
              key: String(idx + 1),
              width: 15,
            })),
            { header: 'Jami', key: 'total_year', width: 18 },
          ],
          rows: dataRows,
          headerStyle: HEADER_BLUE,
          freezeHeader: true,
          rowStyle: (r) => {
            // Row tipi: `Record<string, unknown>` — service'da DecodingRow ekan,
            // lekin ExcelService callback shape'i umumiy. Trim bilan tekshirish.
            const name =
              typeof r.type_name === 'string' ? r.type_name.trim() : '';
            const code =
              typeof r.type_code === 'string' ? r.type_code.trim() : '';
            if (!name || !code) return { bold: true };
            return undefined;
          },
        },
      ],
    });
  }

  // ============================================================
  // YORDAMCHILAR (private)
  // ============================================================

  /** Pul formatida: 1234567.89 → "1 234 567.89". */
  private fmt(value: number): string {
    return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  /** Per-group: monthly[1..12] + year total. */
  private initSums(): { monthly: number[]; total: number } {
    // `Array(13).fill(0)` ESLint'da `any[]` deb belgilanadi (generic inference yo'q);
    // explicit `<number>` cast bilan toza tip.
    return { monthly: Array<number>(13).fill(0), total: 0 };
  }

  private addToSums(
    sums: { monthly: number[]; total: number },
    monthlyValues: number[],
    total: number,
  ) {
    for (let i = 0; i < 12; i++) {
      sums.monthly[i + 1] =
        (sums.monthly[i + 1] ?? 0) + (monthlyValues[i] ?? 0);
    }
    sums.total += total;
  }

  private sumOfSums(...sums: Array<{ monthly: number[]; total: number }>): {
    monthly: number[];
    total: number;
  } {
    const combined = this.initSums();
    for (const s of sums) {
      for (let i = 1; i <= 12; i++) {
        combined.monthly[i] += s.monthly[i] ?? 0;
      }
      combined.total += s.total;
    }
    return combined;
  }

  private summaryRow(
    sums: { monthly: number[]; total: number },
    label: string,
  ): DecodingRow {
    // Laravel appendSummaryRow: type_name=six, type_code=' '.
    const row: DecodingRow = { type_name: label, type_code: ' ' };
    for (let m = 1; m <= 12; m++) {
      row[String(m)] = this.fmt(sums.monthly[m] ?? 0);
    }
    row.total_year = this.fmt(sums.total);
    return row;
  }

  private combinedRow(
    label: string,
    sums: { monthly: number[]; total: number },
  ): DecodingRow {
    // Laravel createCombined*Row: type_code=' '.
    const row: DecodingRow = { type_name: label, type_code: ' ' };
    for (let m = 1; m <= 12; m++) {
      row[String(m)] = this.fmt(sums.monthly[m] ?? 0);
    }
    row.total_year = this.fmt(sums.total);
    return row;
  }

  /** 1 → 'A', 27 → 'AA'. */
  private colLetter(n: number): string {
    let result = '';
    while (n > 0) {
      const rem = (n - 1) % 26;
      result = String.fromCharCode(65 + rem) + result;
      n = Math.floor((n - 1) / 26);
    }
    return result;
  }
}
