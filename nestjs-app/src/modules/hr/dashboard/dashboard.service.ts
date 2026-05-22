// HR Dashboard service. Laravel: HR/Dashboard/DashboardController.
// 3 endpoint: index(), indexTwo(), indexThree().
//
// QAYDLAR:
// - Laravel `filter($user, ...)` permission scope hozircha implement qilinmagan
//   (NestJS'da tashkilot bo'yicha hech qanday cheklash yo'q).
// - Sana arifmetikasi PostgreSQL `INTERVAL` orqali aniq Laravel'ga teng.

import { Injectable } from '@nestjs/common';
import {
  and,
  count,
  countDistinct,
  eq,
  gte,
  isNotNull,
  lte,
  sql,
} from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  contracts,
  department_positions,
  meds,
  organization_disciplinaries,
  organization_incentives,
  vacations,
  worker_disabilities,
  worker_positions,
  worker_relative_disabilities,
  worker_relatives,
  worker_sick_leaves,
  workers,
} from '@/db/schema';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import {
  CONFIRMATION_STATUS_SUCCESS,
  CONTRACT_TYPE_MINIMIZED_LABELS,
  POSITION_STATUS,
  VACATION_TYPE_LABELS,
  commandToVacationType,
} from '@/modules/hr/dashboard/dashboard.types';
import {
  DashboardIndexResponse,
  DashboardIndexThreeResponse,
  DashboardIndexTwoResponse,
} from '@/modules/hr/dashboard/dto/dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
  ) {}

  // GET /api/v1/hr/dashboard
  async index(): Promise<DashboardIndexResponse> {
    const lang = this.ctx.lang;
    const today = new Date();

    const [
      [{ dp_rate }],
      [{ wp_rate }],
      birthdays,
      workersStats,
      contractsByMonth,
      contractTypes,
      vacationTypes,
    ] = await Promise.all([
      this.db
        .select({
          dp_rate: sql<number>`COALESCE(SUM(${department_positions.rate}), 0)`,
        })
        .from(department_positions)
        .where(notDeleted(department_positions)),
      this.db
        .select({
          wp_rate: sql<number>`COALESCE(SUM(${worker_positions.rate}), 0)`,
        })
        .from(worker_positions)
        .where(
          and(
            notDeleted(worker_positions),
            // Laravel scopeFilter: status = ACTIVE (2) + organization_id IN valid orgs.
            eq(worker_positions.status, 2),
            sql`EXISTS (SELECT 1 FROM organizations o WHERE o.id = ${worker_positions.organization_id} AND o.deleted_at IS NULL)`,
          ),
        ),
      this.birthdays(today),
      this.workersFilter(),
      this.contractsByMonth(),
      this.typeContracts(lang),
      this.typeVacations(lang),
    ]);

    return {
      workers_count: Number(workersStats.workers_count ?? 0),
      woman_count: Number(workersStats.woman_count ?? 0),
      mans_count: Number(workersStats.mans_count ?? 0),
      // NOTE: Laravel kodida bu ikkita field ataylab joylari almashtirilgan:
      //   'middle_edu_count' => $data?->special_edu_count
      //   'special_edu_count' => $data?->middle_edu_count
      // Parity uchun aynan shu xatti-harakatni saqlaymiz.
      passports_count: Number(workersStats.passports_count ?? 0),
      passports_more_count: Number(workersStats.passports_more_count ?? 0),
      retired_men_count: Number(workersStats.retired_men_count ?? 0),
      retired_women_count: Number(workersStats.retired_women_count ?? 0),
      age_30_and_younger: Number(workersStats.age_30_and_younger ?? 0),
      age_31_to_45: Number(workersStats.age_31_to_45 ?? 0),
      age_46_and_older: Number(workersStats.age_46_and_older ?? 0),
      higher_edu_count: Number(workersStats.higher_edu_count ?? 0),
      middle_edu_count: Number(workersStats.special_edu_count ?? 0),
      special_edu_count: Number(workersStats.middle_edu_count ?? 0),
      contracts: contractsByMonth,
      contract_types: contractTypes,
      vacation_types: vacationTypes,
      positions_rate: Number(dp_rate ?? 0) / 100,
      worker_positions_rate: Number(wp_rate ?? 0) / 100,
      birthdays,
    };
  }

  // GET /api/v1/hr/dashboard-two
  async indexTwo(): Promise<DashboardIndexTwoResponse> {
    const today = this.formatDate(new Date());
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    const nextMonth = this.formatDate(next);
    const currentYear = new Date().getFullYear();

    // Laravel: WorkerPosition::filter($user, status=ACTIVE)->select('worker_id') ichidagi xodimlar
    // bo'yicha sub-query. Parity uchun bizda ham EXISTS active worker_positions filter qo'shamiz.
    const [medsStats] = await this.db.execute(sql`
      SELECT
        COALESCE(SUM(CASE WHEN latest_to <= ${today}::date THEN 1 ELSE 0 END), 0)::int AS meds_finished,
        COALESCE(SUM(CASE WHEN latest_to > ${today}::date AND latest_to < ${nextMonth}::date THEN 1 ELSE 0 END), 0)::int AS meds_approaching
      FROM (
        SELECT m.worker_id, MAX(m."to") AS latest_to
        FROM ${meds} m
        WHERE m.deleted_at IS NULL
          AND EXISTS (
            SELECT 1 FROM worker_positions wp
            JOIN organizations o ON o.id = wp.organization_id AND o.deleted_at IS NULL
            WHERE wp.worker_id = m.worker_id
              AND wp.status = 2
              AND wp.deleted_at IS NULL
          )
        GROUP BY m.worker_id
      ) latest_meds
    `);

    const [discStats] = await this.db
      .select({
        total: count(),
        fineType1: sql<number>`COALESCE(SUM(CASE WHEN ${organization_disciplinaries.fine_type} = 1 THEN 1 ELSE 0 END), 0)::int`,
      })
      .from(organization_disciplinaries)
      .where(
        and(
          notDeleted(organization_disciplinaries),
          sql`EXTRACT(YEAR FROM ${organization_disciplinaries.date})::int = ${currentYear}`,
        ),
      );

    const [incStats] = await this.db
      .select({
        total: count(),
        giftType4: sql<number>`COALESCE(SUM(CASE WHEN ${organization_incentives.gift_type} = 4 THEN 1 ELSE 0 END), 0)::int`,
      })
      .from(organization_incentives)
      .where(
        and(
          notDeleted(organization_incentives),
          sql`EXTRACT(YEAR FROM ${organization_incentives.date})::int = ${currentYear}`,
        ),
      );

    const medsRow = medsStats as {
      meds_finished: number;
      meds_approaching: number;
    };
    const discTotal = Number(discStats?.total ?? 0);
    const discFine = Number(discStats?.fineType1 ?? 0);
    const incTotal = Number(incStats?.total ?? 0);
    const incGift = Number(incStats?.giftType4 ?? 0);

    return {
      meds_finished: Number(medsRow?.meds_finished ?? 0),
      meds_approaching: Number(medsRow?.meds_approaching ?? 0),
      disciplinary_actions: discTotal - discFine,
      disciplinary_actions_fine_type: discFine,
      incentives: incTotal - incGift,
      incentive_actions_gift_type: incGift,
    };
  }

  // GET /api/v1/hr/dashboard-three
  async indexThree(): Promise<DashboardIndexThreeResponse> {
    const [wdStats, wrdStats, wslStats] = await Promise.all([
      this.workerDisabilityStats(),
      this.workerRelativeDisabilityStats(),
      this.workerSickLeaveStats(),
    ]);
    return {
      worker_disabilities: wdStats,
      worker_relative_disabilities: wrdStats,
      worker_sick_leaves: wslStats,
    };
  }

  // ---- private helpers ----

  private async birthdays(
    today: Date,
  ): Promise<DashboardIndexResponse['birthdays']> {
    const lastDay = new Date(today);
    lastDay.setDate(lastDay.getDate() + 4);

    const fromMonth = today.getMonth() + 1;
    const fromDay = today.getDate();
    const toMonth = lastDay.getMonth() + 1;
    const toDay = lastDay.getDate();

    const baseCols = {
      id: workers.id,
      last_name: workers.last_name,
      first_name: workers.first_name,
      middle_name: workers.middle_name,
      birthday: workers.birthday,
      photo: workers.photo,
      birth_day: workers.birth_day,
      birth_month: workers.birth_month,
    };

    const rows = await this.db
      .select(baseCols)
      .from(workers)
      .where(
        and(
          notDeleted(workers),
          // Laravel: whereHas('positions', scopeFilter status=ACTIVE + valid org).
          sql`EXISTS (SELECT 1 FROM worker_positions wp JOIN organizations o ON o.id = wp.organization_id AND o.deleted_at IS NULL WHERE wp.worker_id = ${workers.id} AND wp.status = 2 AND wp.deleted_at IS NULL)`,
          fromMonth === toMonth
            ? and(
                eq(workers.birth_month, fromMonth),
                gte(workers.birth_day, fromDay),
                lte(workers.birth_day, toDay),
              )
            : sql`(${workers.birth_month} = ${fromMonth} AND ${workers.birth_day} >= ${fromDay}) OR (${workers.birth_month} = ${toMonth} AND ${workers.birth_day} <= ${toDay})`,
        ),
      )
      .orderBy(workers.birth_month, workers.birth_day);

    // Group by mm-dd, then build all-days slot list.
    const grouped = new Map<string, typeof rows>();
    for (const r of rows) {
      const key = `${String(r.birth_month).padStart(2, '0')}-${String(r.birth_day).padStart(2, '0')}`;
      const arr = grouped.get(key) ?? [];
      arr.push(r);
      grouped.set(key, arr);
    }

    // All dates in range.
    const allDates: string[] = [];
    for (let d = new Date(today); d <= lastDay; d.setDate(d.getDate() + 1)) {
      allDates.push(
        `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      );
    }

    if (rows.length === 0) {
      return {
        result: [],
        all_workers: 0,
        between: { to: this.formatDate(today), from: this.formatDate(lastDay) },
      };
    }

    let allWorkers = 0;
    const result = await Promise.all(
      allDates.map(async (day) => {
        const list = grouped.get(day) ?? [];
        const take3 = list.slice(0, 3);
        const mapped = await Promise.all(
          take3.map(async (w) => ({
            id: w.id,
            last_name: w.last_name,
            first_name: w.first_name,
            middle_name: w.middle_name,
            photo: await this.minio.fileUrl(w.photo),
            birthday: w.birthday,
          })),
        );
        allWorkers += list.length;
        return {
          day,
          workers: mapped,
          count: list.length,
          has_more: Math.max(0, list.length - 3),
        };
      }),
    );

    return {
      result,
      all_workers: allWorkers,
      between: { to: this.formatDate(today), from: this.formatDate(lastDay) },
    };
  }

  // Single aggregate row with all worker counts (matches Laravel selectRaw chain).
  // Laravel: Worker::whereHas('positions', scopeFilter status=ACTIVE) — count
  // only workers with at least one active worker_position.
  private async workersFilter(): Promise<Record<string, number>> {
    const rows = await this.db.execute(sql`
      SELECT
        COUNT(DISTINCT workers.id) AS workers_count,
        COUNT(DISTINCT CASE WHEN sex = true THEN workers.id ELSE NULL END) AS mans_count,
        COUNT(DISTINCT CASE WHEN sex = false THEN workers.id ELSE NULL END) AS woman_count,
        COUNT(DISTINCT CASE WHEN workers.birthday >= CURRENT_DATE - INTERVAL '30 years' THEN workers.id END) AS age_30_and_younger,
        COUNT(DISTINCT CASE WHEN workers.birthday < CURRENT_DATE - INTERVAL '30 years' AND workers.birthday >= CURRENT_DATE - INTERVAL '45 years' THEN workers.id END) AS age_31_to_45,
        COUNT(DISTINCT CASE WHEN workers.birthday < CURRENT_DATE - INTERVAL '45 years' THEN workers.id END) AS age_46_and_older,
        COUNT(DISTINCT CASE WHEN p.id IS NOT NULL AND p.to_date <= CURRENT_DATE + INTERVAL '30 days' AND p.to_date > CURRENT_DATE THEN workers.id ELSE NULL END) AS passports_count,
        COUNT(DISTINCT CASE WHEN p.id IS NOT NULL AND p.to_date <= CURRENT_DATE THEN workers.id ELSE NULL END) AS passports_more_count,
        SUM(CASE WHEN workers.sex = true AND workers.birthday <= CURRENT_DATE - INTERVAL '60 years' THEN 1 ELSE 0 END) AS retired_men_count,
        SUM(CASE WHEN workers.sex = false AND workers.birthday <= CURRENT_DATE - INTERVAL '55 years' THEN 1 ELSE 0 END) AS retired_women_count,
        COUNT(DISTINCT CASE WHEN education = 1 THEN workers.id ELSE NULL END) AS higher_edu_count,
        COUNT(DISTINCT CASE WHEN education = 2 THEN workers.id ELSE NULL END) AS special_edu_count,
        COUNT(DISTINCT CASE WHEN education = 3 THEN workers.id ELSE NULL END) AS middle_edu_count
      FROM workers
      LEFT JOIN (
        SELECT DISTINCT ON (worker_id) id, worker_id, to_date
        FROM worker_passports
        WHERE current = true AND deleted_at IS NULL
        ORDER BY worker_id, id DESC
      ) p ON p.worker_id = workers.id
      WHERE workers.deleted_at IS NULL
        AND EXISTS (
          SELECT 1 FROM worker_positions wp
          JOIN organizations o ON o.id = wp.organization_id AND o.deleted_at IS NULL
          WHERE wp.worker_id = workers.id
            AND wp.status = 2
            AND wp.deleted_at IS NULL
        )
    `);
    return (rows[0] ?? {}) as Record<string, number>;
  }

  // Last 8 months of new/ended contracts.
  private async contractsByMonth(): Promise<
    Array<{ month: string; new_contracts: number; ended_contracts: number }>
  > {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 8, 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const fromStr = this.formatDate(from);
    const toStr = this.formatDate(to);

    const newRows = await this.db
      .select({
        month: sql<string>`TO_CHAR(${contracts.contract_date}, 'YYYY-MM')`.as(
          'month',
        ),
        cnt: countDistinct(contracts.worker_id),
      })
      .from(contracts)
      .where(
        and(
          notDeleted(contracts),
          eq(contracts.confirmation, CONFIRMATION_STATUS_SUCCESS),
          isNotNull(contracts.worker_id),
          gte(contracts.contract_date, fromStr),
          lte(contracts.contract_date, toStr),
          sql`EXISTS (SELECT 1 FROM ${worker_positions} cp WHERE cp.contract_id = ${contracts.id} AND cp.contract_position = true)`,
        ),
      )
      .groupBy(sql`TO_CHAR(${contracts.contract_date}, 'YYYY-MM')`);

    const endedRows = await this.db
      .select({
        month:
          sql<string>`TO_CHAR(${contracts.contract_to_date}, 'YYYY-MM')`.as(
            'month',
          ),
        cnt: countDistinct(contracts.worker_id),
      })
      .from(contracts)
      .where(
        and(
          notDeleted(contracts),
          eq(contracts.confirmation, CONFIRMATION_STATUS_SUCCESS),
          eq(contracts.status, POSITION_STATUS.FINISHED),
          isNotNull(contracts.worker_id),
          gte(contracts.contract_to_date, fromStr),
          lte(contracts.contract_to_date, toStr),
          sql`EXISTS (SELECT 1 FROM ${worker_positions} cp WHERE cp.contract_id = ${contracts.id} AND cp.contract_position = true)`,
        ),
      )
      .groupBy(sql`TO_CHAR(${contracts.contract_to_date}, 'YYYY-MM')`);

    const newMap = new Map(newRows.map((r) => [r.month, Number(r.cnt)]));
    const endedMap = new Map(endedRows.map((r) => [r.month, Number(r.cnt)]));

    // Build all months in range.
    const result: Array<{
      month: string;
      new_contracts: number;
      ended_contracts: number;
    }> = [];
    const cur = new Date(from);
    while (cur <= to) {
      const m = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
      result.push({
        month: m,
        new_contracts: newMap.get(m) ?? 0,
        ended_contracts: endedMap.get(m) ?? 0,
      });
      cur.setMonth(cur.getMonth() + 1);
    }
    return result;
  }

  private async typeContracts(lang: string) {
    const rows = await this.db
      .select({
        type: contracts.type,
        cnt: count(),
      })
      .from(contracts)
      .where(
        and(
          notDeleted(contracts),
          eq(contracts.status, POSITION_STATUS.ACTIVE),
        ),
      )
      .groupBy(contracts.type);
    const map = new Map(rows.map((r) => [r.type, Number(r.cnt)]));
    return Object.keys(CONTRACT_TYPE_MINIMIZED_LABELS).map((idStr) => {
      const id = Number(idStr);
      const label = this.tr(CONTRACT_TYPE_MINIMIZED_LABELS[id], lang);
      return {
        id,
        type: label,
        active_contracts: map.get(id) ?? 0,
      };
    });
  }

  private async typeVacations(lang: string) {
    const today = this.formatDate(new Date());
    const rows = await this.db
      .select({
        type: vacations.type,
        cnt: count(),
      })
      .from(vacations)
      .where(and(notDeleted(vacations), gte(vacations.to, today)))
      .groupBy(vacations.type);

    // Group by VacationTypeEnum::get($commandType) → key.
    const byVacationType = new Map<
      number,
      { id: number; name: string; active_vacations: number }
    >();
    for (const r of rows) {
      const vacationTypeId = commandToVacationType(r.type);
      const name = this.tr(VACATION_TYPE_LABELS[vacationTypeId], lang);
      const existing = byVacationType.get(vacationTypeId);
      const cnt = Number(r.cnt);
      if (existing) {
        existing.active_vacations += cnt;
      } else {
        byVacationType.set(vacationTypeId, {
          // Laravel saqlaydigan $key — bu vacation.type (CommandType), not VacationTypeEnum.
          // Lekin Laravel'da `'id' => $key` (=commandType), nameni `VacationTypeEnum::get($key)` qiladi
          // va keyin name'ga group qiladi — bir nameda turli id'lar bo'lishi mumkin.
          // Eng oxirgi `$key` saqlanadi.
          id: r.type,
          name,
          active_vacations: cnt,
        });
      }
    }
    return Array.from(byVacationType.values());
  }

  private async workerDisabilityStats(): Promise<{
    total_count: number;
    levels: Array<{ level: number; count: number }>;
  }> {
    const rows = await this.db
      .select({
        level: worker_disabilities.level,
        cnt: count(),
      })
      .from(worker_disabilities)
      .where(
        and(
          notDeleted(worker_disabilities),
          // Laravel: whereIn worker_id WorkerPosition filter (status=ACTIVE).
          sql`EXISTS (SELECT 1 FROM worker_positions wp JOIN organizations o ON o.id = wp.organization_id AND o.deleted_at IS NULL WHERE wp.worker_id = ${worker_disabilities.worker_id} AND wp.status = 2 AND wp.deleted_at IS NULL)`,
        ),
      )
      .groupBy(worker_disabilities.level);
    const levels = rows.map((r) => ({ level: r.level, count: Number(r.cnt) }));
    const total_count = levels.reduce((sum, l) => sum + l.count, 0);
    return { total_count, levels };
  }

  private async workerRelativeDisabilityStats(): Promise<{
    total_count: number;
    levels: Array<{ level: number; count: number }>;
  }> {
    const rows = await this.db
      .select({
        level: worker_relative_disabilities.level,
        cnt: count(),
      })
      .from(worker_relative_disabilities)
      .innerJoin(
        worker_relatives,
        eq(
          worker_relatives.id,
          worker_relative_disabilities.worker_relative_id,
        ),
      )
      .where(
        and(
          notDeleted(worker_relative_disabilities),
          // Laravel: whereHas workerRelative.worker.positions filter (status=ACTIVE).
          sql`EXISTS (SELECT 1 FROM worker_positions wp JOIN organizations o ON o.id = wp.organization_id AND o.deleted_at IS NULL WHERE wp.worker_id = ${worker_relatives.worker_id} AND wp.status = 2 AND wp.deleted_at IS NULL)`,
        ),
      )
      .groupBy(worker_relative_disabilities.level);
    const levels = rows.map((r) => ({ level: r.level, count: Number(r.cnt) }));
    const total_count = levels.reduce((sum, l) => sum + l.count, 0);
    return { total_count, levels };
  }

  private async workerSickLeaveStats(): Promise<{
    total_count: number;
    active_count: number;
    finished_count: number;
    types: Array<{ type: number; count: number }>;
  }> {
    const today = this.formatDate(new Date());
    // Laravel: whereHas workerPosition filter (status=ACTIVE).
    const wpFilter = sql`EXISTS (SELECT 1 FROM worker_positions wp JOIN organizations o ON o.id = wp.organization_id AND o.deleted_at IS NULL WHERE wp.id = ${worker_sick_leaves.worker_position_id} AND wp.status = 2 AND wp.deleted_at IS NULL)`;

    const [stats] = await this.db
      .select({
        total: count(),
        active: sql<number>`COALESCE(SUM(CASE WHEN ${worker_sick_leaves.from_date} <= ${today}::date AND (${worker_sick_leaves.to_date} IS NULL OR ${worker_sick_leaves.to_date} >= ${today}::date) THEN 1 ELSE 0 END), 0)::int`,
        finished: sql<number>`COALESCE(SUM(CASE WHEN ${worker_sick_leaves.to_date} < ${today}::date THEN 1 ELSE 0 END), 0)::int`,
      })
      .from(worker_sick_leaves)
      .where(and(notDeleted(worker_sick_leaves), wpFilter));
    const types = await this.db
      .select({
        type: worker_sick_leaves.type,
        cnt: count(),
      })
      .from(worker_sick_leaves)
      .where(and(notDeleted(worker_sick_leaves), wpFilter))
      .groupBy(worker_sick_leaves.type);
    return {
      total_count: Number(stats?.total ?? 0),
      active_count: Number(stats?.active ?? 0),
      finished_count: Number(stats?.finished ?? 0),
      types: types.map((t) => ({ type: t.type, count: Number(t.cnt) })),
    };
  }

  private tr(key: string | undefined, lang: string): string {
    if (!key) return '';
    const v = this.i18n.t(key, { lang });
    return typeof v === 'string' ? v : '';
  }

  private formatDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
