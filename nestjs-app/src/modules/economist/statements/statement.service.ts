// Statement service. Laravel: Economist/StatementController.
// Asosiy oylik hisobot yozuvlari (statements) ustida CRUD + extras + Excel eksport.

import { Injectable } from '@nestjs/common';
import { and, count, eq, inArray, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { statements, statement_aggregates, organizations } from '@/db/schema';
import {
  paginateByYearMonth,
  type PageQueryLike,
} from '@/modules/economist/_shared/helpers';
import {
  TOTAL_ONE_COLUMNS,
  TOTAL_TWO_COLUMNS,
  TOTAL_FOUR_COLUMNS,
  TOTAL_FIVE_COLUMNS,
} from '@/modules/economist/_shared/code-groups';
import { getCodeNames } from '@/modules/economist/_shared/code-names';
import { ExcelService } from '@/shared/excel/excel.service';
import { HEADER_BLUE, HEADER_GRAY, FMT } from '@/shared/excel/style-presets';
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

@Injectable()
export class StatementService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly excel: ExcelService,
  ) {}

  // ============================================================
  // CRUD
  // ============================================================

  // GET /api/v1/economist/statements — yil/oy filtri bilan paginatsiya.
  async list(q: PageQueryLike) {
    return paginateByYearMonth(this.db, statements, q);
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
    return { count: Number(total) };
  }

  /**
   * GET /api/v1/economist/statement-decoding — yillik kodlar bo'yicha pivot.
   * Har kod uchun 12 oylik summa + yillik jami.
   * Kodlar 4 guruhga bo'lingan: plus / minus_one / minus_two / hold.
   * Har guruh oxirida "Jami" qator, eng oxirida kombinatsiya qatorlari.
   */
  async decoding(q: { year?: string | number; lang?: string }) {
    const year =
      q?.year !== undefined ? Number(q.year) : new Date().getFullYear();
    const lang = q?.lang ?? 'uz';

    // 1. statement_aggregates'dan har month × code uchun SUM
    const rows = await this.db
      .select({
        month: statement_aggregates.month,
        code: statement_aggregates.code,
        total_sum: sql<number>`SUM(${statement_aggregates.total_sum})`,
      })
      .from(statement_aggregates)
      .where(eq(statement_aggregates.year, year))
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

    // 4. Kod nomlari
    const names = getCodeNames(lang);

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

    // 6. Barcha kodlar bo'yicha aylanish
    for (const [codeStr, name] of Object.entries(names)) {
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

    // 7. Header qatorlar + sub-total
    const headerRow = this.buildHeaderRow(year);
    const monthRow = this.buildMonthRow();

    const finalPlus = [
      headerRow,
      monthRow,
      this.groupTitle('Hisoblangan'),
      ...plusList,
      this.summaryRow(sums.plus),
    ];
    const finalMinusOne = [
      this.groupTitle('Ushlanmalar (1-guruh)'),
      ...minusOneList,
      this.summaryRow(sums.minus_one),
    ];
    const finalMinusTwo = [
      this.groupTitle('Ushlanmalar (2-guruh)'),
      ...minusTwoList,
      this.summaryRow(sums.minus_two),
      // Kombinatsiya qatorlari
      this.combinedRow(
        'Ushlanmalar jami',
        this.sumOfSums(sums.minus_one, sums.minus_two),
      ),
      this.combinedRow(
        'Yakuniy jami',
        this.sumOfSums(sums.plus, sums.minus_one, sums.minus_two),
      ),
    ];
    const finalHold = [
      this.groupTitle('Saqlanmalar'),
      ...holdList,
      this.summaryRow(sums.hold),
    ];

    return [...finalPlus, ...finalMinusOne, ...finalMinusTwo, ...finalHold];
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
  }) {
    const year =
      q?.year !== undefined ? Number(q.year) : new Date().getFullYear();
    const month =
      q?.month !== undefined ? Number(q.month) : new Date().getMonth() + 1;
    const lang = q?.lang ?? 'uz';

    // 1. Tashkilotlar ro'yxati (15 ta limit)
    let orgWhere = notDeleted(organizations);
    if (q.organizations) {
      const ids = q.organizations
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => !Number.isNaN(n));
      if (ids.length) {
        orgWhere = and(orgWhere, inArray(organizations.id, ids))!;
      }
    }
    const orgRows = await this.db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(orgWhere)
      .limit(15);
    const orgIds = orgRows.map((o) => o.id);

    if (orgIds.length === 0) return [];

    // 2. statement_aggregates'dan: organization_id × code SUM (filter year+month+orgs)
    const rows = await this.db
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

    // 3. orgData[org_id][code] = sum
    const orgData = new Map<number, Map<number, number>>();
    for (const r of rows) {
      const orgId = r.organization_id!;
      if (!orgData.has(orgId)) orgData.set(orgId, new Map());
      orgData.get(orgId)!.set(r.code, Number(r.total_sum ?? 0));
    }

    // 4. Decoding logikasi shu yerda — kodlar bo'yicha aylanish + guruhlash
    const plusCodes = new Set([...TOTAL_ONE_COLUMNS].map(Number));
    const minusOneCodes = new Set([...TOTAL_FOUR_COLUMNS].map(Number));
    const minusTwoCodes = new Set([...TOTAL_TWO_COLUMNS].map(Number));
    const holdCodes = new Set([...TOTAL_FIVE_COLUMNS].map(Number));
    const names = getCodeNames(lang);

    const plusList: DecodingRow[] = [];
    const minusOneList: DecodingRow[] = [];
    const minusTwoList: DecodingRow[] = [];
    const holdList: DecodingRow[] = [];

    // Per-org sums (organization_id → total)
    const sums = {
      plus: new Map<number, number>(),
      minus_one: new Map<number, number>(),
      minus_two: new Map<number, number>(),
      hold: new Map<number, number>(),
    };
    const initOrgSum = () => {
      for (const id of orgIds) {
        sums.plus.set(id, 0);
        sums.minus_one.set(id, 0);
        sums.minus_two.set(id, 0);
        sums.hold.set(id, 0);
      }
    };
    initOrgSum();

    for (const [codeStr, name] of Object.entries(names)) {
      const code = Number(codeStr);
      const row: DecodingRow = {
        type_name: name,
        type_code: codeStr,
      };

      let group: keyof typeof sums | null = null;
      if (plusCodes.has(code)) group = 'plus';
      else if (minusOneCodes.has(code)) group = 'minus_one';
      else if (minusTwoCodes.has(code)) group = 'minus_two';
      else if (holdCodes.has(code)) group = 'hold';
      if (!group) continue;

      let total = 0;
      for (const o of orgRows) {
        const v = orgData.get(o.id)?.get(code) ?? 0;
        row[`org_${o.id}`] = this.fmt(v);
        total += v;
        sums[group].set(o.id, (sums[group].get(o.id) ?? 0) + v);
      }
      row.total = this.fmt(total);

      if (group === 'plus') plusList.push(row);
      else if (group === 'minus_one') minusOneList.push(row);
      else if (group === 'minus_two') minusTwoList.push(row);
      else holdList.push(row);
    }

    // 5. Header + summary qatorlar
    const header: DecodingRow = {
      type_name: 'Kod nomi',
      type_code: 'Kod',
      ...Object.fromEntries(orgRows.map((o) => [`org_${o.id}`, o.name ?? ''])),
      total: 'Jami',
    };

    const summary = (label: string, m: Map<number, number>): DecodingRow => {
      const row: DecodingRow = { type_name: label, type_code: '' };
      let total = 0;
      for (const o of orgRows) {
        const v = m.get(o.id) ?? 0;
        row[`org_${o.id}`] = this.fmt(v);
        total += v;
      }
      row.total = this.fmt(total);
      return row;
    };

    return [
      header,
      this.groupTitle('Hisoblangan'),
      ...plusList,
      summary('Jami', sums.plus),
      this.groupTitle('Ushlanmalar (1-guruh)'),
      ...minusOneList,
      summary('Jami', sums.minus_one),
      this.groupTitle('Ushlanmalar (2-guruh)'),
      ...minusTwoList,
      summary('Jami', sums.minus_two),
      this.groupTitle('Saqlanmalar'),
      ...holdList,
      summary('Jami', sums.hold),
    ];
  }

  /**
   * GET /api/v1/economist/statements-multiple-workers — bir oyda bir xil PIN
   * ko'p tashkilotda statement topshirgan xodimlar.
   */
  async multiWorkers(q: PageQueryLike) {
    const year =
      q?.year !== undefined ? Number(q.year) : new Date().getFullYear();
    const month =
      q?.month !== undefined ? Number(q.month) : new Date().getMonth() + 1;
    const page = Number(q?.page ?? 1);
    const perPage = Number(q?.per_page ?? 10);
    const offset = (page - 1) * perPage;

    // 1. PIN'lar — kamida 2 ta organizationda statement bor.
    // null/0 PIN'lar mock/garbage data sifatida e'tibordan tashqari (data
    // sanitatsiya muammosi: bir necha xodimda pin = NULL yoki 0, ular
    // birga grouping qilinsa, false-positive `multi-org` yuzaga keladi).
    const duplicates = await this.db
      .select({ pin: statements.pin, cnt: count() })
      .from(statements)
      .where(
        and(
          notDeleted(statements),
          eq(statements.year, year),
          eq(statements.month, month),
          sql`${statements.pin} > 0`,
        ),
      )
      .groupBy(statements.pin)
      .having(sql`COUNT(DISTINCT ${statements.organization_id}) > 1`);

    const duplicatePins = duplicates
      .map((d) => d.pin)
      .filter((p): p is number => p !== null && p > 0);

    if (duplicatePins.length === 0) {
      return { current_page: page, per_page: perPage, total: 0, data: [] };
    }

    // 2. Pagination — pin bo'yicha
    const paginatedPins = duplicatePins.slice(offset, offset + perPage);

    // 3. Shu pin'lar uchun barcha statementlar
    const allRows = paginatedPins.length
      ? await this.db
          .select({
            pin: statements.pin,
            full_name: statements.full_name,
            position: statements.position,
            organization_id: statements.organization_id,
            total_four: statements.total_four,
          })
          .from(statements)
          .where(
            and(
              notDeleted(statements),
              eq(statements.year, year),
              eq(statements.month, month),
              inArray(statements.pin, paginatedPins),
            ),
          )
      : [];

    // 4. Organization nomlari (batch load — N+1 yo'q)
    const orgIds = [...new Set(allRows.map((r) => r.organization_id))];
    const orgRows = orgIds.length
      ? await this.db
          .select({
            id: organizations.id,
            name: organizations.name,
            code: organizations.code,
          })
          .from(organizations)
          .where(inArray(organizations.id, orgIds))
      : [];
    const orgMap = new Map(orgRows.map((o) => [o.id, o]));

    // 5. PIN bo'yicha guruhlash
    type Group = {
      pin: number;
      full_name: string | null;
      year: number;
      month: number;
      total_salary: number;
      organizations: Array<{
        organization_id: number;
        organization: string | null;
        organization_code: string | null;
        position: string | null;
        salary: number;
      }>;
    };
    const groups = new Map<number, Group>();
    for (const r of allRows) {
      const pin = r.pin!;
      let g = groups.get(pin);
      if (!g) {
        g = {
          pin,
          full_name: r.full_name,
          year,
          month,
          total_salary: 0,
          organizations: [],
        };
        groups.set(pin, g);
      }
      const o = orgMap.get(r.organization_id);
      g.organizations.push({
        organization_id: r.organization_id,
        organization: o?.name ?? null,
        organization_code: o?.code ?? null,
        position: r.position,
        salary: r.total_four,
      });
      g.total_salary += r.total_four;
    }

    return {
      current_page: page,
      per_page: perPage,
      total: duplicatePins.length,
      data: Array.from(groups.values()),
    };
  }

  // GET /api/v1/economist/statements-by-positions — Excel eksport uchun ma'lumot.
  // eslint-disable-next-line @typescript-eslint/require-await
  async byPositions(q: PageQueryLike) {
    const year =
      q?.year !== undefined ? Number(q.year) : new Date().getFullYear();
    // Eksport uchun haqiqiy data — Excel endpoint orqali yuklanadi.
    return {
      year,
      message:
        'Use GET /statements-export-by-position?year=Y for Excel download',
    };
  }

  // GET /api/v1/economist/statement-example — namuna Excel URL.
  example() {
    return { url: '/resumes/economist/statement_example.xlsx' };
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
    organizationId?: number,
  ): Promise<Buffer> {
    const conds = [notDeleted(statements), eq(statements.year, year)];
    if (organizationId)
      conds.push(eq(statements.organization_id, organizationId));

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

    const excelRows = Array.from(byPin.values()).map((w) => {
      const row: Record<string, unknown> = {
        organization: `Org #${w.organization_id}`,
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
        organization_name:
          orgMap.get(r.organization_id) ?? `Org #${r.organization_id}`,
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

  /**
   * StatementYearCodesExport — yillik pivot jadval: F.I.SH × code × month.
   * 2-qator sarlavha (top: kod, bottom: oy).
   */
  async exportYearCodes(
    year: number,
    codes: string[] = ['total_four'],
  ): Promise<Buffer> {
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
      .where(and(notDeleted(statements), eq(statements.year, year)))
      .orderBy(statements.organization_id, statements.full_name);

    type WorkerYear = {
      pin: number | null;
      full_name: string | null;
      position: string | null;
      organization_id: number;
      values: Record<string, Record<number, number>>;
    };
    const byPin = new Map<string, WorkerYear>();
    for (const r of rows) {
      const key = String(r.pin ?? r.full_name ?? Math.random());
      let w = byPin.get(key);
      if (!w) {
        w = {
          pin: r.pin,
          full_name: r.full_name,
          position: r.position,
          organization_id: r.organization_id,
          values: {},
        };
        byPin.set(key, w);
      }
      for (const code of codes) {
        if (!w.values[code]) w.values[code] = {};
        w.values[code][r.month] = (w.values[code][r.month] ?? 0) + r.total_four;
      }
    }

    const top: (string | number)[] = ['F.I.SH', 'Lavozim', 'Tashkilot'];
    const bottom: (string | number)[] = ['', '', ''];
    for (const code of codes) {
      for (let m = 1; m <= 12; m++) {
        top.push(code);
        bottom.push(MONTHS_UZ[m - 1]);
      }
    }

    const headerMergesTop: string[] = ['A1:A2', 'B1:B2', 'C1:C2'];
    let col = 4;
    for (let i = 0; i < codes.length; i++) {
      const startLetter = this.colLetter(col);
      const endLetter = this.colLetter(col + 11);
      headerMergesTop.push(`${startLetter}1:${endLetter}1`);
      col += 12;
    }

    const headerRows: ExcelHeaderRow[] = [
      {
        values: top,
        merges: headerMergesTop,
        style: HEADER_BLUE,
        height: 26,
      },
      {
        values: bottom,
        style: HEADER_GRAY,
        height: 22,
      },
    ];

    const columns = [
      { header: 'F.I.SH', key: 'full_name', width: 28 },
      { header: 'Lavozim', key: 'position', width: 22 },
      { header: 'Tashkilot', key: 'organization', width: 22 },
    ];
    for (const code of codes) {
      for (let m = 1; m <= 12; m++) {
        columns.push({ header: '', key: `${code}_m${m}`, width: 12 });
      }
    }

    const excelRows = Array.from(byPin.values()).map((w) => {
      const row: Record<string, unknown> = {
        full_name: w.full_name ?? '-',
        position: w.position ?? '-',
        organization: `Org #${w.organization_id}`,
      };
      for (const code of codes) {
        for (let m = 1; m <= 12; m++) {
          row[`${code}_m${m}`] = w.values[code]?.[m] ?? 0;
        }
      }
      return row;
    });

    return this.excel.build({
      creator: 'HRM Economist',
      sheets: [
        {
          name: `Year ${year}`,
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
    // decoding() bilan bir xil ma'lumot — endi haqiqiy
    const decodingRows = await this.decoding({ year, lang });

    // Excel uchun: filterlangan rows (faqat real ma'lumot bor qatorlar).
    // `DecodingRow` shape: `{ type_name, type_code, 1..12, total_year }`.
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

  private summaryRow(sums: { monthly: number[]; total: number }): DecodingRow {
    const row: DecodingRow = { type_name: 'Jami', type_code: '' };
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
    const row: DecodingRow = { type_name: label, type_code: '' };
    for (let m = 1; m <= 12; m++) {
      row[String(m)] = this.fmt(sums.monthly[m] ?? 0);
    }
    row.total_year = this.fmt(sums.total);
    return row;
  }

  private buildHeaderRow(year: number): DecodingRow {
    const row: DecodingRow = {
      type_name: `${year} yil`,
      type_code: 'Kod',
    };
    for (let m = 1; m <= 12; m++) row[String(m)] = MONTHS_UZ[m - 1] ?? '';
    row.total_year = 'Jami';
    return row;
  }

  private buildMonthRow(): DecodingRow {
    return { type_name: '', type_code: '' };
  }

  private groupTitle(label: string): DecodingRow {
    return { type_name: label, type_code: '' };
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
