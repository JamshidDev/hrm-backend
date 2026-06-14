// HR Dashboard Views — worker-asosli endpointlar (worker_position paginatsiyasi).
// birthdays, educations, age, passport, pension, contract-types, meds.

import { Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  or,
  sql,
} from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  departments,
  meds,
  organizations,
  positions as positionsTable,
  worker_passports,
  worker_positions,
  workers,
} from '@/db/schema';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { MinioService } from '@/shared/minio/minio.service';
import { DashboardViewsMapper } from '@/modules/hr/dashboard-views/dashboard-views.mapper';
import {
  ACTIVE_POSITION_STATUS,
  DEFAULT_PER_PAGE,
} from '@/modules/hr/dashboard-views/dashboard-views.constants';
import { wpCols } from '@/modules/hr/dashboard-views/dashboard-views.query';
import {
  buildShortPosition,
  calcAge,
  nextMonthDate,
  todayDate,
} from '@/modules/hr/dashboard-views/dashboard-views.helper';
import {
  BirthdaysQueryDto,
  WorkerByAgeQueryDto,
  WorkerByContractTypeQueryDto,
  WorkerByMedQueryDto,
  WorkerByPassportQueryDto,
  WorkerByPensionQueryDto,
  WorkersByEducationQueryDto,
} from '@/modules/hr/dashboard-views/dto/dashboard-views.dto';

type WpJoinedRow = Awaited<
  ReturnType<DashboardWorkerService['selectWorkerPositionsBase']>
>[number];

@Injectable()
export class DashboardWorkerService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly minio: MinioService,
    private readonly mapper: DashboardViewsMapper,
    private readonly scope: OrgScopeService,
    private readonly i18n: I18nService,
  ) {}

  // GET /api/v1/hr/dashboard/birthdays
  // Filterlar berilmasa Laravel'da hech qaysi worker mos kelmaydi (bo'sh natija).
  async birthdays(filters: BirthdaysQueryDto) {
    const where = and(
      notDeleted(worker_positions),
      eq(worker_positions.status, ACTIVE_POSITION_STATUS),
      filters.birth_day != null
        ? eq(workers.birth_day, filters.birth_day)
        : sql`FALSE`,
      filters.birth_month != null
        ? eq(workers.birth_month, filters.birth_month)
        : sql`FALSE`,
    );
    return this.paginateWorkerPositions(filters, where);
  }

  // GET /api/v1/hr/dashboard/educations
  async workersByEducation(filters: WorkersByEducationQueryDto) {
    const where = and(
      notDeleted(worker_positions),
      filters.type != null ? eq(workers.education, filters.type) : undefined,
    );
    return this.paginateWorkerPositions(
      filters,
      where,
      async (rows) => {
        // Embed worker.universities[] join.
        const workerIds = [
          ...new Set(
            rows
              .map((r) => r.worker_id)
              .filter((id): id is number => id != null),
          ),
        ];
        if (workerIds.length === 0) return {};
        const unis = await this.db.execute(sql`
          SELECT wu.id, wu.worker_id, wu.university_id, wu.speciality_id, wu.from_date, wu.to_date,
                 s.id AS speciality_id_v, s.name AS speciality_name, s.name_ru AS speciality_name_ru, s.name_en AS speciality_name_en,
                 u.id AS university_id_v, u.name AS university_name, u.name_ru AS university_name_ru, u.name_en AS university_name_en, u.education
          FROM worker_universities wu
          LEFT JOIN specialities s ON s.id = wu.speciality_id
          LEFT JOIN universities u ON u.id = wu.university_id
          WHERE wu.worker_id IN (${sql.join(
            workerIds.map((id) => sql`${id}`),
            sql`, `,
          )})
            AND wu.deleted_at IS NULL
        `);
        // Laravel WorkerUniversityResource: flat strings + education label.
        const eduLabels: Record<number, string> = {
          1: 'one',
          2: 'two',
          3: 'three',
        };
        const grouped: Record<number, unknown[]> = {};
        for (const row of unis as Array<Record<string, unknown>>) {
          const wid = Number(row.worker_id);
          if (!grouped[wid]) grouped[wid] = [];
          const eduRaw = row.education as number | null;
          const eduKey = eduRaw != null ? eduLabels[eduRaw] : null;
          grouped[wid].push({
            id: row.id != null ? Number(row.id) : null,
            speciality: row.speciality_id_v
              ? this.mapper.pickLang(
                  row.speciality_name as string | null,
                  row.speciality_name_ru as string | null,
                  row.speciality_name_en as string | null,
                )
              : null,
            university: row.university_id_v
              ? this.mapper.pickLang(
                  row.university_name as string | null,
                  row.university_name_ru as string | null,
                  row.university_name_en as string | null,
                )
              : null,
            education: eduKey
              ? this.i18n.t(`messages.education.level.${eduKey}`)
              : '',
            from_date: row.from_date,
            to_date: row.to_date,
          });
        }
        const universitiesGrouped: Record<number, unknown[]> = {};
        for (const wid of workerIds)
          universitiesGrouped[wid] = grouped[wid] ?? [];
        return { universities: universitiesGrouped };
      },
      { omitType: true },
    );
  }

  // GET /api/v1/hr/dashboard/age
  async workerByAge(filters: WorkerByAgeQueryDto) {
    let { age_start, age_end } = filters;
    if (age_start != null && age_end != null && age_start > age_end) {
      [age_start, age_end] = [age_end, age_start];
    }
    const where = and(
      notDeleted(worker_positions),
      age_start != null
        ? sql`${workers.birthday} <= (CURRENT_DATE - (${age_start} || ' years')::interval)`
        : undefined,
      age_end != null
        ? sql`${workers.birthday} >= (CURRENT_DATE - (${age_end} || ' years')::interval)`
        : undefined,
      filters.sex != null ? eq(workers.sex, filters.sex === 1) : undefined,
    );
    return this.paginateWorkerPositions(filters, where);
  }

  // GET /api/v1/hr/dashboard/passport
  async workerByPassport(filters: WorkerByPassportQueryDto) {
    const today = todayDate();
    const nextMonth = nextMonthDate();

    let where;
    if (filters.filter === 'not_included') {
      where = and(
        notDeleted(worker_positions),
        sql`NOT EXISTS (SELECT 1 FROM ${worker_passports} wp WHERE wp.worker_id = ${workers.id} AND wp.current = true AND wp.deleted_at IS NULL)`,
      );
    } else {
      const upperBound = filters.filter === 'expired' ? today : nextMonth;
      where = and(
        notDeleted(worker_positions),
        sql`EXISTS (SELECT 1 FROM ${worker_passports} wp WHERE wp.worker_id = ${workers.id} AND wp.current = true AND wp.to_date <= ${upperBound}::date AND wp.deleted_at IS NULL)`,
      );
    }

    return this.paginateWorkerPositions(
      filters,
      where,
      async (rows) => {
        const workerIds = [
          ...new Set(
            rows
              .map((r) => r.worker_id)
              .filter((id): id is number => id != null),
          ),
        ];
        if (workerIds.length === 0) return {};
        const passports = await this.db
          .select({
            worker_id: worker_passports.worker_id,
            serial_number: worker_passports.serial_number,
            from_date: worker_passports.from_date,
            to_date: worker_passports.to_date,
          })
          .from(worker_passports)
          .where(
            and(
              inArray(worker_passports.worker_id, workerIds),
              eq(worker_passports.current, true),
              notDeleted(worker_passports),
            ),
          )
          .orderBy(asc(worker_passports.worker_id), desc(worker_passports.id));
        const passportMap: Record<number, unknown> = {};
        for (const p of passports) {
          if (p.worker_id == null) continue;
          if (passportMap[p.worker_id] == null) {
            passportMap[p.worker_id] = {
              serial_number: p.serial_number,
              from_date: p.from_date,
              to_date: p.to_date,
            };
          }
        }
        return { passport: passportMap };
      },
      { omitType: true },
    );
  }

  // GET /api/v1/hr/dashboard/pension
  async workerByPension(filters: WorkerByPensionQueryDto) {
    let where;
    if (filters.sex != null) {
      const isMale = filters.sex === 1;
      const interval = isMale ? '60 years' : '55 years';
      where = and(
        notDeleted(worker_positions),
        eq(workers.sex, isMale),
        sql`${workers.birthday} <= (CURRENT_DATE - (${interval})::interval)`,
      );
    } else {
      where = and(
        notDeleted(worker_positions),
        or(
          sql`(${workers.sex} = true AND ${workers.birthday} <= CURRENT_DATE - INTERVAL '60 years')`,
          sql`(${workers.sex} = false AND ${workers.birthday} <= CURRENT_DATE - INTERVAL '55 years')`,
        ),
      );
    }
    return this.paginateWorkerPositions(filters, where);
  }

  // GET /api/v1/hr/dashboard/contract-types
  async workerByContractTypes(filters: WorkerByContractTypeQueryDto) {
    const where = and(
      notDeleted(worker_positions),
      filters.type != null
        ? eq(worker_positions.type, filters.type)
        : undefined,
    );
    return this.paginateWorkerPositions(filters, where);
  }

  // GET /api/v1/hr/dashboard/meds
  // Worker'ning eng oxirgi med `to` sanasi bo'yicha finished/approaching.
  async workerByMed(filters: WorkerByMedQueryDto) {
    const today = todayDate();
    const nextMonth = nextMonthDate();
    const perPage = filters.per_page ?? DEFAULT_PER_PAGE;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;

    const medFilter =
      filters.type === 'finished'
        ? sql`latest_meds.to <= ${today}::date`
        : sql`latest_meds.to > ${today}::date AND latest_meds.to < ${nextMonth}::date`;

    // Laravel whereHas('positions', filter) — scope-aware EXISTS.
    const activeWorker = await this.scope.activeWorkerExists(sql`w.id`);
    const wRows = await this.db.execute(sql`
      SELECT w.id, latest_meds.to AS med_to
      FROM workers w
      LEFT JOIN (
        -- Laravel raw DB::table('meds') — SoftDeletes qo'llamaydi.
        -- Laravel: m1.to = (SELECT MAX(m2.to) ... WHERE m2.worker_id=m1.worker_id)
        --   — bir xil max-sanada bir nechta med bo'lsa HAMMASI qaytadi (GROUP BY
        --   emas), shuning uchun korrelatsiyalangan subquery.
        SELECT m1.worker_id, m1."to"
        FROM ${meds} m1
        WHERE m1."to" = (
          SELECT MAX(m2."to") FROM ${meds} m2 WHERE m2.worker_id = m1.worker_id
        )
      ) latest_meds ON latest_meds.worker_id = w.id
      WHERE w.deleted_at IS NULL
        AND ${medFilter}
        AND ${activeWorker}
      ORDER BY w.id
    `);
    const allRows = wRows as unknown as Array<{
      id: number;
      med_to: string | null;
    }>;
    const total = allRows.length;
    if (total === 0) return { current_page: page, total: 0, data: [] };

    const paged = allRows.slice(offset, offset + perPage);
    const pagedIds = paged.map((r) => Number(r.id));

    const workerRows = await this.db
      .select({
        id: workers.id,
        last_name: workers.last_name,
        first_name: workers.first_name,
        middle_name: workers.middle_name,
        photo: workers.photo,
      })
      .from(workers)
      .where(inArray(workers.id, pagedIds));
    const workerMap = new Map(workerRows.map((w) => [w.id, w]));

    const wpRows = await this.db
      .select({
        worker_id: worker_positions.worker_id,
        dept_name: departments.name,
        dept_level: departments.level,
        pos_name: positionsTable.name,
      })
      .from(worker_positions)
      .leftJoin(departments, eq(departments.id, worker_positions.department_id))
      .leftJoin(
        positionsTable,
        eq(positionsTable.id, worker_positions.position_id),
      )
      .where(
        and(
          inArray(worker_positions.worker_id, pagedIds),
          eq(worker_positions.status, ACTIVE_POSITION_STATUS),
          notDeleted(worker_positions),
        ),
      )
      .orderBy(asc(worker_positions.id));
    const posByWorker = new Map<number, (typeof wpRows)[number]>();
    for (const wp of wpRows) {
      if (wp.worker_id == null) continue;
      if (!posByWorker.has(wp.worker_id)) posByWorker.set(wp.worker_id, wp);
    }

    const data = await Promise.all(
      paged.map(async (r) => {
        const w = workerMap.get(Number(r.id));
        const pos = posByWorker.get(Number(r.id));
        return {
          id: Number(r.id),
          photo: await this.minio.fileUrl(w?.photo ?? null),
          last_name: w?.last_name ?? null,
          first_name: w?.first_name ?? null,
          middle_name: w?.middle_name ?? null,
          to: r.med_to,
          position_name: pos
            ? buildShortPosition(pos.dept_name, pos.dept_level, pos.pos_name)
            : '',
        };
      }),
    );

    return { current_page: page, total, data };
  }

  // ---- shared helpers ----

  // worker_positions paginatsiyasi + worker/dept/org/position join'lari.
  private async paginateWorkerPositions(
    filters: { per_page?: number; page?: number },
    where: ReturnType<typeof and>,
    embedExtras?: (rows: WpJoinedRow[]) => Promise<Record<string, unknown>>,
    options?: { omitType?: boolean },
  ) {
    const perPage = filters.per_page ?? DEFAULT_PER_PAGE;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;

    // Laravel scopeFilter: status = ACTIVE + role asosida org-scope.
    // notDeleted(workers) — Eloquent whereHas('worker') SoftDeletes orqali
    // workers.deleted_at IS NULL ni avto qo'shadi.
    const finalWhere = and(
      notDeleted(worker_positions),
      eq(worker_positions.status, ACTIVE_POSITION_STATUS),
      notDeleted(workers),
      await this.scope.whereOrg(worker_positions.organization_id),
      where,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.selectWorkerPositionsBase(finalWhere, perPage, offset),
      this.db
        .select({ total: count() })
        .from(worker_positions)
        // INNER JOIN — Laravel whereHas('worker') faqat matching+non-deleted workerni qaytaradi.
        .innerJoin(workers, eq(workers.id, worker_positions.worker_id))
        .where(finalWhere),
    ]);

    const extras = embedExtras ? await embedExtras(rows) : {};

    return {
      current_page: page,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => ({
          id: r.wp_id,
          worker: r.worker_id
            ? {
                id: r.worker_id,
                uuid: r.worker_uuid,
                photo: await this.minio.fileUrl(r.worker_photo),
                last_name: r.worker_last,
                first_name: r.worker_first,
                middle_name: r.worker_middle,
                birthday: r.worker_birthday,
                // Laravel `with('worker:id,uuid,...,photo')` — `education`
                // ustuni tanlanmaydi → resource'da doim null.
                education: null,
                age: calcAge(r.worker_birthday),
              }
            : null,
          organization: r.org_id
            ? {
                id: r.org_id,
                name: this.mapper.pickLang(
                  r.org_name,
                  r.org_name_ru,
                  r.org_name_en,
                ),
                group: r.org_group ?? false,
              }
            : null,
          department: r.dept_id
            ? { id: r.dept_id, name: r.dept_name, level: r.dept_level }
            : null,
          position: r.pos_id
            ? {
                id: r.pos_id,
                name: this.mapper.pickLang(
                  r.pos_name,
                  r.pos_name_ru,
                  r.pos_name_en,
                ),
              }
            : null,
          ...(options?.omitType
            ? {}
            : { type: this.mapper.contractTypeLabel(r.wp_type) }),
          ...(extras.universities &&
          (extras.universities as Record<number, unknown[]>)[r.worker_id] !=
            null
            ? {
                universities: (
                  extras.universities as Record<number, unknown[]>
                )[r.worker_id],
              }
            : extras.universities
              ? { universities: [] }
              : {}),
          ...(extras.passport
            ? {
                passport:
                  (extras.passport as Record<number, unknown>)[r.worker_id] ??
                  null,
              }
            : {}),
        })),
      ),
    };
  }

  selectWorkerPositionsBase(
    where: ReturnType<typeof and>,
    limit?: number,
    offset?: number,
  ) {
    // Laravel `paginate()` ORDER BY qo'ymaydi (Postgres ad-hoc tartib).
    // NestJS bu yerda explicit tartib qo'ymaydi — Laravel'ga to'liq mos kelishi
    // uchun. Determinizm uchun frontend o'zi tartiblashi mumkin.
    const q = this.db
      .select(wpCols)
      .from(worker_positions)
      // INNER JOIN — Laravel whereHas('worker') parity.
      .innerJoin(workers, eq(workers.id, worker_positions.worker_id))
      .leftJoin(departments, eq(departments.id, worker_positions.department_id))
      .leftJoin(
        positionsTable,
        eq(positionsTable.id, worker_positions.position_id),
      )
      .leftJoin(
        organizations,
        and(
          eq(organizations.id, worker_positions.organization_id),
          isNull(organizations.deleted_at),
        ),
      )
      .where(where);
    if (limit != null) {
      return q.limit(limit).offset(offset ?? 0);
    }
    return q;
  }
}
