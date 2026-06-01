// Economist dashboard service. Laravel: Economist/DashboardController::index.
// Oxirgi 8 oy uchun pre-aggregate jadval (statement_aggregates va h.k.) bo'yicha
// daromad/soliq/pension hisobotlari. Har aggregate `->filter($user)` = org-scope.

import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { and, eq, inArray, or, sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { RequestContext } from '@/common/context/request.context';
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

interface OrgFilters {
  organizations?: string;
  organization_id?: number;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly scope: OrgScopeService,
    private readonly ctx: RequestContext,
    private readonly i18n: I18nService,
  ) {}

  // GET /api/v1/economist/dashboard — Laravel: DashboardController::index.
  async index(
    q?: { year?: string | number; month?: string | number } & OrgFilters,
  ) {
    const now = new Date();
    const baseYear = Number(q?.year ?? now.getFullYear());
    const baseMonth = Number(q?.month ?? now.getMonth() + 1);
    const orgFilters: OrgFilters = {
      organizations: q?.organizations,
      organization_id: q?.organization_id,
    };

    // 8 oy oraliq (joriy oydan ortga).
    const periods: Period[] = [];
    let y = baseYear;
    let m = baseMonth;
    for (let i = 0; i < 8; i++) {
      periods.push({
        year: y,
        month: m,
        label: `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}`,
      });
      m--;
      if (m < 1) {
        m = 12;
        y--;
      }
    }

    const [statements, taxFour, taxFive, pensionPayments] = await Promise.all([
      this.fetchStatements(periods, orgFilters),
      this.fetchTaxLike(
        tax_four_aggregates,
        periods,
        ['reported_salary_income', 'reported_tax'],
        orgFilters,
      ),
      this.fetchTaxLike(
        tax_five_aggregates,
        periods,
        // Laravel TaxFiveAggregate $columns tartibi (amount kalit tartibi shunga bog'liq).
        ['total_income', 'reported_income', 'total_tax', 'reported_tax'],
        orgFilters,
      ),
      this.fetchTaxLike(
        pension_payment_aggregates,
        periods,
        ['income_tax_paid', 'total_contributions'],
        orgFilters,
      ),
    ]);

    // periods[0] — eng yangi oy, KPI tile'lar uchun.
    const lastStatement = statements[0]?.amount ?? null;
    const lastTaxFour = taxFour[0]?.amount ?? null;
    const lastTaxFive = taxFive[0]?.amount ?? null;
    const lastPension = pensionPayments[0]?.amount ?? null;
    const lang = this.ctx.lang;
    const t = (key: string): string =>
      this.i18n.t(`messages.economist.${key}`, { lang });

    // Laravel: top-level'da pension_payments YO'Q (faqat last_month uchun ishlatiladi).
    // last_month tartibi: statement, tax_five, tax_four, pension_payment.
    return {
      statements,
      tax_four: taxFour,
      tax_five: taxFive,
      last_month: {
        statement: (
          [
            'total_one',
            'total_two',
            'total_three',
            'total_four',
            'total_five',
          ] as const
        ).map((key) => ({
          key,
          name: t(`statement.${key}`),
          value: lastStatement?.[key] ?? 0,
        })),
        tax_five: (['reported_income', 'reported_tax'] as const).map((key) => ({
          key,
          value: Math.trunc(Number(lastTaxFive?.[key] ?? 0)),
          name: t(`tax_five.${key}`),
        })),
        tax_four: (['reported_salary_income', 'reported_tax'] as const).map(
          (key) => ({
            key,
            value: Math.trunc(Number(lastTaxFour?.[key] ?? 0)),
            name: t(`tax_four.${key}`),
          }),
        ),
        pension_payment: (
          ['income_tax_paid', 'total_contributions'] as const
        ).map((key) => ({
          key,
          value: Math.trunc(Number(lastPension?.[key] ?? 0)),
          name: t(`pension_payment.${key}`),
        })),
      },
    };
  }

  private periodFilter(
    yearCol: AnyPgColumn,
    monthCol: AnyPgColumn,
    periods: Period[],
  ): SQL | undefined {
    return or(
      ...periods.map((p) => and(eq(yearCol, p.year), eq(monthCol, p.month))),
    );
  }

  // StatementAggregate::lastMonthsTotal — code-guruhlar bo'yicha SUM, org-scope.
  //   amount: int (Laravel (int) cast); total_four = (int)one + (int)three.
  //   period uchun row yo'q → amount: null.
  private async fetchStatements(
    periods: Period[],
    orgFilters: OrgFilters,
  ): Promise<Array<{ label: string; amount: StatementAmount | null }>> {
    if (!periods.length) return [];

    const inScope = await this.scope.whereOrg(
      statement_aggregates.organization_id,
      orgFilters,
    );
    const pf = this.periodFilter(
      statement_aggregates.year,
      statement_aggregates.month,
      periods,
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
      .where(and(pf, inScope))
      .groupBy(statement_aggregates.year, statement_aggregates.month);

    const map = new Map<string, (typeof rows)[number]>();
    for (const r of rows) {
      map.set(
        `${String(r.year).padStart(4, '0')}-${String(r.month).padStart(2, '0')}`,
        r,
      );
    }

    return periods.map((p) => {
      const r = map.get(p.label);
      if (!r) return { label: p.label, amount: null };
      const one = Math.trunc(Number(r.total_one ?? 0));
      const two = Math.trunc(Number(r.total_two ?? 0));
      const three = Math.trunc(Number(r.total_three ?? 0));
      const five = Math.trunc(Number(r.total_five ?? 0));
      return {
        label: p.label,
        amount: {
          total_one: one,
          total_two: two,
          total_three: three,
          total_four: one + three, // Laravel: (int)one + (int)three
          total_five: five,
        },
      };
    });
  }

  // TaxFour/TaxFive/PensionPayment Aggregate::lastMonthsTotal — column bo'yicha SUM,
  //   org-scope. amount: float (cast YO'Q); period uchun row yo'q → amount: null.
  private async fetchTaxLike(
    table:
      | typeof tax_four_aggregates
      | typeof tax_five_aggregates
      | typeof pension_payment_aggregates,
    periods: Period[],
    columns: string[],
    orgFilters: OrgFilters,
  ): Promise<Array<{ label: string; amount: Record<string, number> | null }>> {
    if (!periods.length) return [];

    const t = table as typeof tax_four_aggregates;
    const inScope = await this.scope.whereOrg(t.organization_id, orgFilters);
    const pf = this.periodFilter(t.year, t.month, periods);

    const rows = await this.db
      .select({
        year: t.year,
        month: t.month,
        column: t.column,
        total_sum: sql<number>`SUM(${t.total_sum})`,
      })
      .from(t)
      .where(and(pf, inArray(t.column, columns), inScope))
      .groupBy(t.year, t.month, t.column);

    const map = new Map<string, Record<string, number>>();
    for (const r of rows) {
      const key = `${String(r.year).padStart(4, '0')}-${String(r.month).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, {});
      map.get(key)![r.column] = Number(r.total_sum ?? 0);
    }

    return periods.map((p) => {
      const found = map.get(p.label);
      if (!found) return { label: p.label, amount: null };
      const amount: Record<string, number> = {};
      for (const c of columns) amount[c] = found[c] ?? 0;
      return { label: p.label, amount };
    });
  }
}
