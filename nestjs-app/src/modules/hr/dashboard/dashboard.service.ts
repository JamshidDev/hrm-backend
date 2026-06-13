// HR Dashboard service. Laravel: HR/Dashboard/DashboardController.
// 3 endpoint: index(), indexTwo(), indexThree().
//
// QAYDLAR:
// - Laravel `filter($user, ...)` permission scope qo'llaniladi:
//   resolveOrgScopeIds → admin=barcha orglar, leader=subtree, default=o'z org.
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
import {
  OrgScopeService,
  type OrgScopeFilters,
} from '@/common/database/org-scope.service';
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
    private readonly scope: OrgScopeService,
    private readonly minio: MinioService,
  ) {}

  // GET /api/v1/hr/dashboard
  async index(filters?: OrgScopeFilters): Promise<DashboardIndexResponse> {
    const lang = this.ctx.lang;
    const today = new Date();
    // Laravel filter($user, request()->all()) — role + organizations/organization_id.
    const [dpCond, wpCond] = await Promise.all([
      this.scope.whereOrg(department_positions.organization_id, filters),
      this.scope.whereOrg(worker_positions.organization_id, filters),
    ]);

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
        .where(and(notDeleted(department_positions), dpCond)),
      this.db
        .select({
          wp_rate: sql<number>`COALESCE(SUM(${worker_positions.rate}), 0)`,
        })
        .from(worker_positions)
        .where(
          and(
            notDeleted(worker_positions),
            // Laravel WorkerPosition::scopeFilter — WHERE status = ACTIVE (2).
            eq(worker_positions.status, 2),
            wpCond,
          ),
        ),
      this.birthdays(today, filters),
      this.workersFilter(filters),
      this.contractsByMonth(filters),
      this.typeContracts(lang, filters),
      this.typeVacations(lang, filters),
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
  async indexTwo(
    filters?: OrgScopeFilters,
  ): Promise<DashboardIndexTwoResponse> {
    const today = this.formatDate(new Date());
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    const nextMonth = this.formatDate(next);
    const currentYear = new Date().getFullYear();

    // Laravel: WorkerPosition::filter($user, status=ACTIVE)->select('worker_id') —
    // scope-aware EXISTS.
    const activeWorker = await this.scope.activeWorkerExists(
      sql`m.worker_id`,
      filters,
    );
    const [medsStats] = await this.db.execute(sql`
      SELECT
        COALESCE(SUM(CASE WHEN latest_to <= ${today}::date THEN 1 ELSE 0 END), 0)::int AS meds_finished,
        COALESCE(SUM(CASE WHEN latest_to > ${today}::date AND latest_to < ${nextMonth}::date THEN 1 ELSE 0 END), 0)::int AS meds_approaching
      FROM (
        -- Laravel raw DB::table('meds') — SoftDeletes qo'llamaydi.
        SELECT m.worker_id, MAX(m."to") AS latest_to
        FROM ${meds} m
        WHERE ${activeWorker}
        GROUP BY m.worker_id
      ) latest_meds
    `);

    // Laravel OrganizationDisciplinary::filter($user) — role + filtrlar.
    const discScope = await this.scope.whereOrg(
      organization_disciplinaries.organization_id,
      filters,
    );
    const [discStats] = await this.db
      .select({
        total: count(),
        // Laravel: SUM(CASE...) NULL bo'lsa fine_type'ga null qaytadi.
        fineType1: sql<
          number | null
        >`SUM(CASE WHEN ${organization_disciplinaries.fine_type} = 1 THEN 1 ELSE 0 END)::int`,
      })
      .from(organization_disciplinaries)
      .where(
        and(
          notDeleted(organization_disciplinaries),
          discScope,
          sql`EXTRACT(YEAR FROM ${organization_disciplinaries.date})::int = ${currentYear}`,
        ),
      );

    // Laravel OrganizationIncentive::filter($user) — role + filtrlar.
    const incScope = await this.scope.whereOrg(
      organization_incentives.organization_id,
      filters,
    );
    const [incStats] = await this.db
      .select({
        total: count(),
        giftType4: sql<
          number | null
        >`SUM(CASE WHEN ${organization_incentives.gift_type} = 4 THEN 1 ELSE 0 END)::int`,
      })
      .from(organization_incentives)
      .where(
        and(
          notDeleted(organization_incentives),
          incScope,
          sql`EXTRACT(YEAR FROM ${organization_incentives.date})::int = ${currentYear}`,
        ),
      );

    const medsRow = medsStats as {
      meds_finished: number;
      meds_approaching: number;
    };
    const discTotal = Number(discStats?.total ?? 0);
    // Laravel: `$disciplinaryActions?->fine_type_1_count` — SUM bo'sh bo'lsa null.
    const discFineRaw = discStats?.fineType1 ?? null;
    const discFine = discFineRaw != null ? Number(discFineRaw) : null;
    const incTotal = Number(incStats?.total ?? 0);
    const incGiftRaw = incStats?.giftType4 ?? null;
    const incGift = incGiftRaw != null ? Number(incGiftRaw) : null;

    return {
      meds_finished: Number(medsRow?.meds_finished ?? 0),
      meds_approaching: Number(medsRow?.meds_approaching ?? 0),
      // Laravel: ($total ?? 0) - ($fine ?? 0). Top-level null bo'lmasligi uchun.
      disciplinary_actions: discTotal - (discFine ?? 0),
      disciplinary_actions_fine_type: discFine,
      incentives: incTotal - (incGift ?? 0),
      incentive_actions_gift_type: incGift,
    };
  }

  // GET /api/v1/hr/dashboard-three
  async indexThree(
    filters?: OrgScopeFilters,
  ): Promise<DashboardIndexThreeResponse> {
    const [wdStats, wrdStats, wslStats] = await Promise.all([
      this.workerDisabilityStats(filters),
      this.workerRelativeDisabilityStats(filters),
      this.workerSickLeaveStats(filters),
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
    filters?: OrgScopeFilters,
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

    // Laravel whereHas('positions', filter) — role + organizations/organization_id.
    const activeWorker = await this.scope.activeWorkerExists(
      workers.id,
      filters,
    );
    const rows = await this.db
      .select(baseCols)
      .from(workers)
      .where(
        and(
          notDeleted(workers),
          activeWorker,
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

    // Laravel'da xodim yo'q bo'lsa `result: []` qaytaradi (bug). NestJS doim
    // 5 ta kun qaytaradi — har biri uchun count=0 va workers=[] (UI mos).

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
  // Laravel: Worker::whereHas('positions', scopeFilter status=ACTIVE).
  private async workersFilter(
    filters?: OrgScopeFilters,
  ): Promise<Record<string, number>> {
    const activeWorker = await this.scope.activeWorkerExists(
      workers.id,
      filters,
    );
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
        -- Laravel raw DB::table — soft-delete'ni filter qilmaydi.
        SELECT DISTINCT ON (worker_id) id, worker_id, to_date
        FROM worker_passports
        WHERE current = true
        ORDER BY worker_id, id DESC
      ) p ON p.worker_id = workers.id
      WHERE workers.deleted_at IS NULL
        AND ${activeWorker}
    `);
    return (rows[0] ?? {}) as Record<string, number>;
  }

  // Last 8 months of new/ended contracts.
  private async contractsByMonth(
    filters?: OrgScopeFilters,
  ): Promise<
    Array<{ month: string; new_contracts: number; ended_contracts: number }>
  > {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 8, 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const fromStr = this.formatDate(from);
    const toStr = this.formatDate(to);
    const inScope = await this.scope.whereOrg(
      contracts.organization_id,
      filters,
    );
    // Laravel whereHas('contract_position') — Eloquent SoftDeletes ham qo'llanadi.
    const contractPosExists = sql`EXISTS (SELECT 1 FROM ${worker_positions} cp WHERE cp.contract_id = ${contracts.id} AND cp.contract_position = true AND cp.deleted_at IS NULL)`;

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
          inScope,
          eq(contracts.confirmation, CONFIRMATION_STATUS_SUCCESS),
          isNotNull(contracts.worker_id),
          gte(contracts.contract_date, fromStr),
          lte(contracts.contract_date, toStr),
          contractPosExists,
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
          inScope,
          eq(contracts.confirmation, CONFIRMATION_STATUS_SUCCESS),
          eq(contracts.status, POSITION_STATUS.FINISHED),
          isNotNull(contracts.worker_id),
          gte(contracts.contract_to_date, fromStr),
          lte(contracts.contract_to_date, toStr),
          contractPosExists,
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

  private async typeContracts(lang: string, filters?: OrgScopeFilters) {
    // Laravel Contract::filter($user) — role + filtrlar.
    const inScope = await this.scope.whereOrg(
      contracts.organization_id,
      filters,
    );
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
          inScope,
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

  private async typeVacations(lang: string, filters?: OrgScopeFilters) {
    const today = this.formatDate(new Date());
    // Laravel: whereHas('worker.positions', filter) — vacation.organization_id
    // emas, balki worker'ning faol lavozimi scope ichida bo'lishi shart.
    const activeWorker = await this.scope.activeWorkerExists(
      vacations.worker_id,
      filters,
    );
    const rows = await this.db
      .select({
        type: vacations.type,
        cnt: count(),
      })
      .from(vacations)
      .where(and(notDeleted(vacations), gte(vacations.to, today), activeWorker))
      // Laravel groupBy('type') — orderBy YO'Q (natural order). Name guruhida
      // OXIRGI type id bo'ladi (last-wins, quyida).
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
        // Laravel: `'id' => $key` har iteratsiyada overwrite → oxirgi type qoladi.
        existing.id = r.type;
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

  private async workerDisabilityStats(filters?: OrgScopeFilters): Promise<{
    total_count: number;
    levels: Array<{ level: number; count: number }>;
  }> {
    const activeWorker = await this.scope.activeWorkerExists(
      worker_disabilities.worker_id,
      filters,
    );
    const rows = await this.db
      .select({
        level: worker_disabilities.level,
        cnt: count(),
      })
      .from(worker_disabilities)
      .where(and(notDeleted(worker_disabilities), activeWorker))
      .groupBy(worker_disabilities.level);
    const levels = rows.map((r) => ({ level: r.level, count: Number(r.cnt) }));
    const total_count = levels.reduce((sum, l) => sum + l.count, 0);
    return { total_count, levels };
  }

  private async workerRelativeDisabilityStats(
    filters?: OrgScopeFilters,
  ): Promise<{
    total_count: number;
    levels: Array<{ level: number; count: number }>;
  }> {
    const activeWorker = await this.scope.activeWorkerExists(
      worker_relatives.worker_id,
      filters,
    );
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
      .where(and(notDeleted(worker_relative_disabilities), activeWorker))
      .groupBy(worker_relative_disabilities.level);
    const levels = rows.map((r) => ({ level: r.level, count: Number(r.cnt) }));
    const total_count = levels.reduce((sum, l) => sum + l.count, 0);
    return { total_count, levels };
  }

  private async workerSickLeaveStats(filters?: OrgScopeFilters): Promise<{
    total_count: number;
    active_count: number;
    finished_count: number;
    types: Array<{ type: number; count: number }>;
  }> {
    const today = this.formatDate(new Date());
    // Laravel: whereHas('workerPosition', filter) — scope-aware EXISTS.
    const wpFilter = await this.scope.activePositionByIdExists(
      worker_sick_leaves.worker_position_id,
      filters,
    );

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
