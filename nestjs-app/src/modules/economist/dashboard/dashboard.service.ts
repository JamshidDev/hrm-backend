// Economist dashboard service. Laravel: Economist/DashboardController.
// Oxirgi 8 oy uchun pre-aggregate jadval (statement_aggregates va h.k.) bo'yicha
// daromad/soliq/pension hisobotlari.

import { Injectable } from '@nestjs/common';
import { and, eq, inArray, or, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  statement_aggregates,
  tax_four_aggregates,
  tax_five_aggregates,
  pension_payment_aggregates,
} from '@/db/schema';
import {
  TOTAL_ONE_COLUMNS,
  TOTAL_TWO_COLUMNS,
  TOTAL_THREE_COLUMNS,
  TOTAL_FIVE_COLUMNS,
} from '@/modules/economist/_shared/code-groups';

interface Period {
  year: number;
  month: number;
  label: string;
}

export interface StatementAmount {
  total_one: number;
  total_two: number;
  total_three: number;
  total_four: number;
  total_five: number;
}

@Injectable()
export class DashboardService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  // GET /api/v1/economist/dashboard — keyingi 8 oy uchun statistika.
  async index(q?: { year?: string | number; month?: string | number }) {
    const baseYear = Number(q?.year ?? new Date().getFullYear());
    const baseMonth = Number(q?.month ?? new Date().getMonth() + 1);

    // 1. 8 oy oraliqni qurish (oxiridan boshigacha)
    const periods: Period[] = [];
    let y = baseYear;
    let m = baseMonth;
    for (let i = 0; i < 8; i++) {
      periods.push({
        year: y,
        month: m,
        label: `${y}-${String(m).padStart(2, '0')}`,
      });
      m--;
      if (m < 1) {
        m = 12;
        y--;
      }
    }

    // 2. Barcha aggregatsiyalarni parallel olib kelamiz
    const [statements, taxFour, taxFive, pensionPayments] = await Promise.all([
      this.fetchStatements(periods),
      this.fetchTaxFour(periods),
      this.fetchTaxFive(periods),
      this.fetchPensionPayments(periods),
    ]);

    // 3. Eng yangi oy (so'nggi yozuv) — KPI tile'lar uchun
    const lastStatement = statements[0]?.amount ?? this.emptyStatementAmount();
    const lastTaxFour = taxFour[0]?.amount ?? {};
    const lastTaxFive = taxFive[0]?.amount ?? {};
    const lastPension = pensionPayments[0]?.amount ?? {};

    return {
      statements,
      tax_four: taxFour,
      tax_five: taxFive,
      pension_payments: pensionPayments,
      last_month: {
        statement: [
          { name: 'total_one', value: lastStatement.total_one },
          { name: 'total_two', value: lastStatement.total_two },
          { name: 'total_three', value: lastStatement.total_three },
          { name: 'total_four', value: lastStatement.total_four },
          { name: 'total_five', value: lastStatement.total_five },
        ],
        tax_four: [
          {
            name: 'reported_salary_income',
            value: lastTaxFour.reported_salary_income ?? 0,
          },
          { name: 'reported_tax', value: lastTaxFour.reported_tax ?? 0 },
        ],
        tax_five: [
          { name: 'reported_income', value: lastTaxFive.reported_income ?? 0 },
          { name: 'reported_tax', value: lastTaxFive.reported_tax ?? 0 },
        ],
        pension_payment: [
          { name: 'income_tax_paid', value: lastPension.income_tax_paid ?? 0 },
          {
            name: 'total_contributions',
            value: lastPension.total_contributions ?? 0,
          },
        ],
      },
    };
  }

  // ============================================================
  // PRIVAT AGGREGATSIYA METODLAR
  // ============================================================

  /**
   * Statement aggregates: har period uchun total_one..five summa.
   * SQL: SELECT year, month,
   *        SUM(CASE WHEN code IN (...one) THEN total_sum ELSE 0 END) AS total_one,
   *        ... (two, three, five)
   *      FROM statement_aggregates
   *      WHERE (year, month) IN periods
   *      GROUP BY year, month
   */
  private async fetchStatements(
    periods: Period[],
  ): Promise<Array<{ label: string; amount: StatementAmount }>> {
    if (!periods.length) return [];

    // (year, month) tuple OR condition
    const periodFilter = or(
      ...periods.map((p) =>
        and(
          eq(statement_aggregates.year, p.year),
          eq(statement_aggregates.month, p.month),
        ),
      ),
    );

    const oneCodes = [...TOTAL_ONE_COLUMNS].map((c) => Number(c));
    const twoCodes = [...TOTAL_TWO_COLUMNS].map((c) => Number(c));
    const threeCodes = [...TOTAL_THREE_COLUMNS].map((c) => Number(c));
    const fiveCodes = [...TOTAL_FIVE_COLUMNS].map((c) => Number(c));

    const rows = await this.db
      .select({
        year: statement_aggregates.year,
        month: statement_aggregates.month,
        total_one: sql<number>`SUM(CASE WHEN ${statement_aggregates.code} IN ${oneCodes} THEN ${statement_aggregates.total_sum} ELSE 0 END)`,
        total_two: sql<number>`SUM(CASE WHEN ${statement_aggregates.code} IN ${twoCodes} THEN ${statement_aggregates.total_sum} ELSE 0 END)`,
        total_three: sql<number>`SUM(CASE WHEN ${statement_aggregates.code} IN ${threeCodes} THEN ${statement_aggregates.total_sum} ELSE 0 END)`,
        total_five: sql<number>`SUM(CASE WHEN ${statement_aggregates.code} IN ${fiveCodes} THEN ${statement_aggregates.total_sum} ELSE 0 END)`,
      })
      .from(statement_aggregates)
      .where(periodFilter)
      .groupBy(statement_aggregates.year, statement_aggregates.month);

    // Year-month → row mapping
    const map = new Map<string, (typeof rows)[0]>();
    for (const r of rows) {
      map.set(`${r.year}-${String(r.month).padStart(2, '0')}`, r);
    }

    return periods.map((p) => {
      const r = map.get(p.label);
      const one = Number(r?.total_one ?? 0);
      const two = Number(r?.total_two ?? 0);
      const three = Number(r?.total_three ?? 0);
      const five = Number(r?.total_five ?? 0);
      return {
        label: p.label,
        amount: {
          total_one: one,
          total_two: two,
          total_three: three,
          total_four: one + three, // Laravel parity
          total_five: five,
        },
      };
    });
  }

  /**
   * Tax-four aggregates: column nomi bo'yicha aggregatsiya.
   * Faqat `reported_salary_income` va `reported_tax` ustunlari.
   */
  private async fetchTaxFour(periods: Period[]) {
    return this.fetchTaxLike(tax_four_aggregates, periods, [
      'reported_salary_income',
      'reported_tax',
    ]);
  }

  /** Tax-five aggregates: reported_income + reported_tax. */
  private async fetchTaxFive(periods: Period[]) {
    return this.fetchTaxLike(tax_five_aggregates, periods, [
      'reported_income',
      'reported_tax',
    ]);
  }

  /** Pension aggregates: income_tax_paid + total_contributions. */
  private async fetchPensionPayments(periods: Period[]) {
    return this.fetchTaxLike(pension_payment_aggregates, periods, [
      'income_tax_paid',
      'total_contributions',
    ]);
  }

  /**
   * Tax/pension aggregate'lar uchun umumiy SQL pattern:
   * SELECT year, month, column, SUM(total_sum) FROM <table>
   * WHERE column IN (...) AND (year, month) IN periods
   * GROUP BY year, month, column
   *
   * Natija period bo'yicha guruhlangan: `{label, amount: {column: float}}`.
   */
  /**
   * 3 ta aggregate jadvalning umumiy shakli — bir xil ustun nomlari va tiplari.
   * Drizzle har jadvalga noyob `PgTableWithColumns` tipi beradi, ammo ustunlar
   * bir xil. Shuning uchun caller union berib, ichida 1 ta aniq tipga cast'lab
   * ishlatamiz (runtime bir xil — runtime'da nomlar bir xil).
   */
  private async fetchTaxLike(
    table:
      | typeof tax_four_aggregates
      | typeof tax_five_aggregates
      | typeof pension_payment_aggregates,
    periods: Period[],
    columns: string[],
  ): Promise<Array<{ label: string; amount: Record<string, number> }>> {
    if (!periods.length) return [];

    // Drizzle generic union'ni boy o'tkazmasdan, bitta aniq jadval tipiga
    // cast qilamiz — har 3 jadvalning ustun shakli identik bo'lgani sababli
    // bu xavfsiz (xato qilsak, runtime'da darhol DB exception bo'lardi).
    const t = table as typeof tax_four_aggregates;

    const periodFilter = or(
      ...periods.map((p) => and(eq(t.year, p.year), eq(t.month, p.month))),
    );

    const rows = await this.db
      .select({
        year: t.year,
        month: t.month,
        column: t.column,
        total_sum: sql<number>`SUM(${t.total_sum})`,
      })
      .from(t)
      .where(and(periodFilter, inArray(t.column, columns)))
      .groupBy(t.year, t.month, t.column);

    // Year-month bo'yicha guruhlash, keyin column nomi bo'yicha ichki map.
    const map = new Map<string, Record<string, number>>();
    for (const r of rows) {
      const key = `${r.year}-${String(r.month).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, {});
      map.get(key)![r.column] = Number(r.total_sum ?? 0);
    }

    return periods.map((p) => ({
      label: p.label,
      amount: map.get(p.label) ?? this.emptyTaxAmount(columns),
    }));
  }

  private emptyStatementAmount(): StatementAmount {
    return {
      total_one: 0,
      total_two: 0,
      total_three: 0,
      total_four: 0,
      total_five: 0,
    };
  }

  private emptyTaxAmount(columns: string[]): Record<string, number> {
    const obj: Record<string, number> = {};
    for (const c of columns) obj[c] = 0;
    return obj;
  }
}
