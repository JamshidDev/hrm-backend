// HR Dashboard Views service. Laravel: HR/Dashboard/DashboardViewController (14 endpoint).
//
// QAYDLAR:
// - Permission scope (Laravel `filter($user, request()->all())`) skip qilingan.
// - Hammasi paginated WorkerPosition asoslangan.

import { Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  contracts,
  departments,
  meds,
  organization_disciplinaries,
  organization_incentives,
  organizations,
  positions as positionsTable,
  worker_disabilities,
  worker_passports,
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
  ACTIVE_POSITION_STATUS,
  CONFIRMATION_SUCCESS,
  FINISHED_POSITION_STATUS,
} from '@/modules/hr/dashboard-views/dashboard-views.types';
import {
  BirthdaysQueryDto,
  ContractsQueryDto,
  DashboardYearQueryDto,
  DisabilityPreviewQueryDto,
  SickLeavePreviewQueryDto,
  WorkerByAgeQueryDto,
  WorkerByContractTypeQueryDto,
  WorkerByMedQueryDto,
  WorkerByPassportQueryDto,
  WorkerByPensionQueryDto,
  WorkersByEducationQueryDto,
} from '@/modules/hr/dashboard-views/dto/dashboard-views.dto';

// Common SELECT cols for WorkerPosition + worker/dept/org/position joins.
const wpCols = {
  wp_id: worker_positions.id,
  wp_type: worker_positions.type,
  worker_id: workers.id,
  worker_uuid: workers.uuid,
  worker_last: workers.last_name,
  worker_first: workers.first_name,
  worker_middle: workers.middle_name,
  worker_birthday: workers.birthday,
  worker_photo: workers.photo,
  worker_education: workers.education,
  dept_id: departments.id,
  dept_name: departments.name,
  dept_level: departments.level,
  pos_id: positionsTable.id,
  pos_name: positionsTable.name,
  pos_name_ru: positionsTable.name_ru,
  pos_name_en: positionsTable.name_en,
  org_id: organizations.id,
  org_name: organizations.name,
  org_name_ru: organizations.name_ru,
  org_name_en: organizations.name_en,
  org_group: organizations.group,
};

type WpJoinedRow = Awaited<
  ReturnType<DashboardViewsService['selectWorkerPositionsBase']>
>[number];

@Injectable()
export class DashboardViewsService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
  ) {}

  // GET /api/v1/hr/dashboard/birthdays
  async birthdays(filters: BirthdaysQueryDto) {
    const where = and(
      notDeleted(worker_positions),
      filters.birth_day != null
        ? eq(workers.birth_day, filters.birth_day)
        : undefined,
      filters.birth_month != null
        ? eq(workers.birth_month, filters.birth_month)
        : undefined,
    );
    return this.paginateWorkerPositions(filters, where);
  }

  // GET /api/v1/hr/dashboard/educations
  async workersByEducation(filters: WorkersByEducationQueryDto) {
    const where = and(
      notDeleted(worker_positions),
      filters.type != null ? eq(workers.education, filters.type) : undefined,
    );
    return this.paginateWorkerPositions(filters, where, async (rows) => {
      // Embed worker.universities[] join.
      const workerIds = [
        ...new Set(
          rows.map((r) => r.worker_id).filter((id): id is number => id != null),
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
        WHERE wu.worker_id IN (${sql.join(workerIds.map((id) => sql`${id}`), sql`, `)})
          AND wu.deleted_at IS NULL
      `);
      const grouped: Record<number, unknown[]> = {};
      for (const row of unis as Array<Record<string, unknown>>) {
        const wid = Number(row.worker_id);
        if (!grouped[wid]) grouped[wid] = [];
        grouped[wid].push({
          id: row.id,
          university_id: row.university_id,
          speciality_id: row.speciality_id,
          from_date: row.from_date,
          to_date: row.to_date,
          speciality: row.speciality_id_v
            ? {
                id: row.speciality_id_v,
                name: this.pickLang(
                  row.speciality_name as string | null,
                  row.speciality_name_ru as string | null,
                  row.speciality_name_en as string | null,
                ),
              }
            : null,
          university: row.university_id_v
            ? {
                id: row.university_id_v,
                name: this.pickLang(
                  row.university_name as string | null,
                  row.university_name_ru as string | null,
                  row.university_name_en as string | null,
                ),
                education: row.education,
              }
            : null,
        });
      }
      return { universities: grouped };
    });
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
      filters.sex != null
        ? eq(workers.sex, filters.sex === 1)
        : undefined,
    );
    return this.paginateWorkerPositions(filters, where);
  }

  // GET /api/v1/hr/dashboard/passport
  async workerByPassport(filters: WorkerByPassportQueryDto) {
    const today = this.today();
    const nextMonth = this.nextMonthDate();

    let where;
    if (filters.filter === 'not_included') {
      where = and(
        notDeleted(worker_positions),
        sql`NOT EXISTS (SELECT 1 FROM ${worker_passports} wp WHERE wp.worker_id = ${workers.id} AND wp.deleted_at IS NULL)`,
      );
    } else {
      const upperBound = filters.filter === 'expired' ? today : nextMonth;
      where = and(
        notDeleted(worker_positions),
        sql`EXISTS (SELECT 1 FROM ${worker_passports} wp WHERE wp.worker_id = ${workers.id} AND wp.to_date <= ${upperBound}::date AND wp.deleted_at IS NULL)`,
      );
    }

    return this.paginateWorkerPositions(filters, where, async (rows) => {
      const workerIds = [
        ...new Set(
          rows.map((r) => r.worker_id).filter((id): id is number => id != null),
        ),
      ];
      if (workerIds.length === 0) return {};
      const passports = await this.db
        .select({
          id: worker_passports.id,
          worker_id: worker_passports.worker_id,
          serial_number: worker_passports.serial_number,
          from_date: worker_passports.from_date,
          to_date: worker_passports.to_date,
        })
        .from(worker_passports)
        .where(
          and(
            inArray(worker_passports.worker_id, workerIds),
            notDeleted(worker_passports),
          ),
        )
        .orderBy(asc(worker_passports.worker_id), desc(worker_passports.id));
      // Map first per worker.
      const passportMap: Record<number, unknown> = {};
      for (const p of passports) {
        if (p.worker_id == null) continue;
        if (passportMap[p.worker_id] == null) passportMap[p.worker_id] = p;
      }
      return { passport: passportMap };
    });
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

  // GET /api/v1/hr/dashboard/meds
  async workerByMed(filters: WorkerByMedQueryDto) {
    const today = this.today();
    const nextMonth = this.nextMonthDate();
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;

    const medFilter =
      filters.type === 'finished'
        ? sql`latest_meds.to <= ${today}::date`
        : sql`latest_meds.to > ${today}::date AND latest_meds.to < ${nextMonth}::date`;

    // SUBQUERY: latest med per worker_id.
    const wIds = await this.db.execute(sql`
      SELECT w.id
      FROM workers w
      INNER JOIN (
        SELECT m1.worker_id, MAX(m1."to") AS "to"
        FROM ${meds} m1
        WHERE m1.deleted_at IS NULL
        GROUP BY m1.worker_id
      ) latest_meds ON latest_meds.worker_id = w.id
      WHERE w.deleted_at IS NULL AND ${medFilter}
    `);
    const workerIds = (wIds as unknown as Array<{ id: number }>).map((r) =>
      Number(r.id),
    );
    if (workerIds.length === 0) {
      return { current_page: page, per_page: perPage, total: 0, data: [] };
    }

    // Paginate workers.
    const total = workerIds.length;
    const paged = workerIds.slice(offset, offset + perPage);

    const workerRows = await this.db
      .select({
        id: workers.id,
        last_name: workers.last_name,
        first_name: workers.first_name,
        middle_name: workers.middle_name,
        birthday: workers.birthday,
        photo: workers.photo,
      })
      .from(workers)
      .where(inArray(workers.id, paged));

    // Latest meds per worker.
    const medRows = await this.db
      .select({
        worker_id: meds.worker_id,
        to: meds.to,
      })
      .from(meds)
      .where(and(inArray(meds.worker_id, paged), notDeleted(meds)));
    const medMap = new Map<number, string | null>();
    for (const m of medRows) {
      if (m.worker_id == null) continue;
      const cur = medMap.get(m.worker_id);
      if (!cur || (m.to && m.to > cur)) medMap.set(m.worker_id, m.to);
    }

    // worker_positions per worker.
    const wpRows = await this.db
      .select({
        id: worker_positions.id,
        worker_id: worker_positions.worker_id,
        position_id: worker_positions.position_id,
        department_id: worker_positions.department_id,
        organization_id: worker_positions.organization_id,
        pos_name: positionsTable.name,
        dept_name: departments.name,
        dept_level: departments.level,
        org_name: organizations.name,
        org_full_name: organizations.full_name,
      })
      .from(worker_positions)
      .leftJoin(
        positionsTable,
        eq(positionsTable.id, worker_positions.position_id),
      )
      .leftJoin(departments, eq(departments.id, worker_positions.department_id))
      .leftJoin(
        organizations,
        eq(organizations.id, worker_positions.organization_id),
      )
      .where(
        and(
          inArray(worker_positions.worker_id, paged),
          notDeleted(worker_positions),
        ),
      );

    const positionsByWorker = new Map<number, typeof wpRows>();
    for (const wp of wpRows) {
      if (wp.worker_id == null) continue;
      const arr = positionsByWorker.get(wp.worker_id) ?? [];
      arr.push(wp);
      positionsByWorker.set(wp.worker_id, arr);
    }

    const data = await Promise.all(
      workerRows.map(async (w) => ({
        id: w.id,
        last_name: w.last_name,
        first_name: w.first_name,
        middle_name: w.middle_name,
        birthday: w.birthday,
        photo: await this.minio.fileUrl(w.photo),
        to: medMap.get(w.id) ?? null,
        positions: (positionsByWorker.get(w.id) ?? []).map((p) => ({
          id: p.id,
          position: p.position_id
            ? { id: p.position_id, name: p.pos_name }
            : null,
          department: p.department_id
            ? { id: p.department_id, name: p.dept_name, level: p.dept_level }
            : null,
          organization: p.organization_id
            ? {
                id: p.organization_id,
                name: p.org_name,
                full_name: p.org_full_name,
              }
            : null,
        })),
      })),
    );

    return { current_page: page, per_page: perPage, total, data };
  }

  // GET /api/v1/hr/dashboard/worker-disabilities/preview
  async workerDisabilitiesPreview(filters: DisabilityPreviewQueryDto) {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;

    const where = and(
      notDeleted(worker_disabilities),
      filters.level != null
        ? eq(worker_disabilities.level, filters.level)
        : undefined,
      // Worker has at least one (deleted_at IS NULL) worker_position.
      sql`EXISTS (SELECT 1 FROM ${worker_positions} wp WHERE wp.worker_id = ${worker_disabilities.worker_id} AND wp.deleted_at IS NULL)`,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(worker_disabilities)
        .where(where)
        .orderBy(desc(worker_disabilities.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(worker_disabilities)
        .where(where),
    ]);

    const workerIds = [...new Set(rows.map((r) => r.worker_id))];
    const workerPositionsBundle = await this.bundleWorkersWithPosition(
      workerIds,
    );

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => ({
          id: r.id,
          level: r.level,
          number: r.number,
          from: r.from,
          to: r.to,
          comment: r.comment,
          worker: await this.toWorkerWithPosition(
            workerPositionsBundle,
            r.worker_id,
          ),
        })),
      ),
    };
  }

  // GET /api/v1/hr/dashboard/worker-relative-disabilities/preview
  async workerRelativeDisabilitiesPreview(filters: DisabilityPreviewQueryDto) {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;

    const where = and(
      notDeleted(worker_relative_disabilities),
      filters.level != null
        ? eq(worker_relative_disabilities.level, filters.level)
        : undefined,
      // Inner via worker_relatives → workers → worker_positions exists.
      sql`EXISTS (
        SELECT 1 FROM ${worker_relatives} wr
        WHERE wr.id = ${worker_relative_disabilities.worker_relative_id}
          AND EXISTS (SELECT 1 FROM ${worker_positions} wp WHERE wp.worker_id = wr.worker_id AND wp.deleted_at IS NULL)
      )`,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: worker_relative_disabilities.id,
          level: worker_relative_disabilities.level,
          number: worker_relative_disabilities.number,
          from: worker_relative_disabilities.from,
          to: worker_relative_disabilities.to,
          comment: worker_relative_disabilities.comment,
          relative_id: worker_relatives.id,
          relative_worker_id: worker_relatives.worker_id,
          relative_relative: worker_relatives.relative,
          relative_last: worker_relatives.last_name,
          relative_first: worker_relatives.first_name,
          relative_middle: worker_relatives.middle_name,
          relative_birthday: worker_relatives.birthday,
        })
        .from(worker_relative_disabilities)
        .leftJoin(
          worker_relatives,
          eq(worker_relatives.id, worker_relative_disabilities.worker_relative_id),
        )
        .where(where)
        .orderBy(desc(worker_relative_disabilities.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(worker_relative_disabilities)
        .leftJoin(
          worker_relatives,
          eq(worker_relatives.id, worker_relative_disabilities.worker_relative_id),
        )
        .where(where),
    ]);

    const workerIds = [
      ...new Set(
        rows
          .map((r) => r.relative_worker_id)
          .filter((id): id is number => id != null),
      ),
    ];
    const bundle = await this.bundleWorkersWithPosition(workerIds);

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => ({
          id: r.id,
          level: r.level,
          number: r.number,
          from: r.from,
          to: r.to,
          comment: r.comment,
          worker_relative: r.relative_id
            ? {
                id: r.relative_id,
                relative: r.relative_relative,
                last_name: r.relative_last,
                first_name: r.relative_first,
                middle_name: r.relative_middle,
                birthday: r.relative_birthday,
                worker: r.relative_worker_id
                  ? await this.toWorkerWithPosition(bundle, r.relative_worker_id)
                  : null,
              }
            : null,
        })),
      ),
    };
  }

  // GET /api/v1/hr/dashboard/worker-sick-leaves/preview
  async workerSickLeavesPreview(filters: SickLeavePreviewQueryDto) {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;
    const today = this.today();

    const where = and(
      notDeleted(worker_sick_leaves),
      filters.type != null
        ? eq(worker_sick_leaves.type, filters.type)
        : undefined,
      filters.status === 'active'
        ? and(
            lte(worker_sick_leaves.from_date, today),
            or(
              isNull(worker_sick_leaves.to_date),
              gte(worker_sick_leaves.to_date, today),
            ),
          )
        : filters.status === 'finished'
          ? sql`${worker_sick_leaves.to_date} < ${today}::date`
          : undefined,
      sql`EXISTS (SELECT 1 FROM ${worker_positions} wp WHERE wp.id = ${worker_sick_leaves.worker_position_id} AND wp.deleted_at IS NULL)`,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: worker_sick_leaves.id,
          type: worker_sick_leaves.type,
          from_date: worker_sick_leaves.from_date,
          to_date: worker_sick_leaves.to_date,
          sick: worker_sick_leaves.sick,
          worker_id: worker_sick_leaves.worker_id,
          worker_position_id: worker_sick_leaves.worker_position_id,
        })
        .from(worker_sick_leaves)
        .where(where)
        .orderBy(desc(worker_sick_leaves.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(worker_sick_leaves)
        .where(where),
    ]);

    const wpIds = [
      ...new Set(
        rows
          .map((r) => r.worker_position_id)
          .filter((id): id is number => id != null),
      ),
    ];
    const wpRows = wpIds.length
      ? await this.selectWorkerPositionsBaseByWpIds(wpIds)
      : [];
    const wpMap = new Map<number, (typeof wpRows)[number]>();
    for (const wp of wpRows) wpMap.set(wp.wp_id, wp);

    const workerIds = [
      ...new Set(
        rows
          .map((r) => r.worker_id)
          .filter((id): id is number => id != null),
      ),
    ];
    const workerMap = await this.bundleWorkers(workerIds);

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => {
          const wp = r.worker_position_id ? wpMap.get(r.worker_position_id) : null;
          const w = r.worker_id ? workerMap.get(r.worker_id) : null;
          return {
            id: r.id,
            type: r.type,
            from_date: r.from_date,
            to_date: r.to_date,
            sick: r.sick,
            worker_position_id: r.worker_position_id,
            worker: w
              ? {
                  id: w.id,
                  uuid: w.uuid,
                  last_name: w.last_name,
                  first_name: w.first_name,
                  middle_name: w.middle_name,
                  birthday: w.birthday,
                  photo: await this.minio.fileUrl(w.photo),
                }
              : null,
            worker_position: wp
              ? {
                  id: wp.wp_id,
                  type: wp.wp_type,
                  organization: wp.org_id
                    ? {
                        id: wp.org_id,
                        name: this.pickLang(wp.org_name, wp.org_name_ru, wp.org_name_en),
                        group: wp.org_group ?? false,
                      }
                    : null,
                  department: wp.dept_id
                    ? { id: wp.dept_id, name: wp.dept_name, level: wp.dept_level }
                    : null,
                  position: wp.pos_id
                    ? {
                        id: wp.pos_id,
                        name: this.pickLang(wp.pos_name, wp.pos_name_ru, wp.pos_name_en),
                      }
                    : null,
                }
              : null,
          };
        }),
      ),
    };
  }

  // GET /api/v1/hr/dashboard/disciplinary-actions
  async disciplinaryActions(filters: DashboardYearQueryDto) {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;
    const year = filters.year ?? new Date().getFullYear();

    const where = and(
      notDeleted(organization_disciplinaries),
      filters.type != null
        ? eq(organization_disciplinaries.fine_type, filters.type)
        : undefined,
      sql`EXTRACT(YEAR FROM ${organization_disciplinaries.date})::int = ${year}`,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(organization_disciplinaries)
        .where(where)
        .orderBy(asc(organization_disciplinaries.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(organization_disciplinaries)
        .where(where),
    ]);

    return { current_page: page, per_page: perPage, total: Number(total), data: rows };
  }

  // GET /api/v1/hr/dashboard/incentive-actions
  async incentiveActions(filters: DashboardYearQueryDto) {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;
    const year = filters.year ?? new Date().getFullYear();

    const where = and(
      notDeleted(organization_incentives),
      filters.type != null
        ? eq(organization_incentives.gift_type, filters.type)
        : undefined,
      sql`EXTRACT(YEAR FROM ${organization_incentives.date})::int = ${year}`,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(organization_incentives)
        .where(where)
        .orderBy(desc(organization_incentives.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(organization_incentives)
        .where(where),
    ]);

    return { current_page: page, per_page: perPage, total: Number(total), data: rows };
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

  // GET /api/v1/hr/dashboard/contracts (router based on type=created|ended)
  async contracts(filters: ContractsQueryDto) {
    if (filters.type === 'created') {
      return this.newContracts(filters);
    }
    if (filters.type === 'ended') {
      return this.endedContracts(filters);
    }
    return { message: true, error: false };
  }

  private async newContracts(filters: ContractsQueryDto) {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;
    const year = filters.year ?? new Date().getFullYear();
    const month = filters.month ?? new Date().getMonth() + 1;
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    const where = and(
      notDeleted(contracts),
      eq(contracts.confirmation, CONFIRMATION_SUCCESS),
      isNotNull(contracts.worker_id),
      gte(contracts.contract_date, from),
      lte(contracts.contract_date, to),
      sql`EXISTS (SELECT 1 FROM ${worker_positions} wp WHERE wp.contract_id = ${contracts.id} AND wp.contract_position = true)`,
    );

    return this.paginateContracts(where, perPage, page, offset);
  }

  private async endedContracts(filters: ContractsQueryDto) {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;
    const year = filters.year ?? new Date().getFullYear();
    const month = filters.month ?? new Date().getMonth() + 1;
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    const where = and(
      notDeleted(contracts),
      eq(contracts.confirmation, CONFIRMATION_SUCCESS),
      eq(contracts.status, FINISHED_POSITION_STATUS),
      isNotNull(contracts.worker_id),
      gte(contracts.contract_to_date, from),
      lte(contracts.contract_to_date, to),
    );

    return this.paginateContracts(where, perPage, page, offset);
  }

  // ---- helpers ----

  // Paginate worker_positions with worker/dept/org/position joins + worker shape.
  private async paginateWorkerPositions(
    filters: { per_page?: number; page?: number },
    where: ReturnType<typeof and>,
    embedExtras?: (rows: WpJoinedRow[]) => Promise<Record<string, unknown>>,
  ) {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;
    const lang = this.ctx.lang;

    const [rows, [{ total }]] = await Promise.all([
      this.selectWorkerPositionsBase(where, perPage, offset),
      this.db
        .select({ total: count() })
        .from(worker_positions)
        .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
        .where(where),
    ]);

    const extras = embedExtras ? await embedExtras(rows) : {};

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => ({
          id: r.wp_id,
          worker: r.worker_id
            ? {
                id: r.worker_id,
                uuid: r.worker_uuid,
                last_name: r.worker_last,
                first_name: r.worker_first,
                middle_name: r.worker_middle,
                birthday: r.worker_birthday,
                photo: await this.minio.fileUrl(r.worker_photo),
                education: r.worker_education,
                age: r.worker_birthday
                  ? Math.abs(
                      Math.floor(
                        (Date.now() - new Date(r.worker_birthday).getTime()) /
                          (1000 * 60 * 60 * 24 * 365.25),
                      ),
                    )
                  : 0,
                ...((extras.universities as Record<number, unknown[]> | undefined)?.[
                  r.worker_id
                ]
                  ? {
                      universities: (
                        extras.universities as Record<number, unknown[]>
                      )[r.worker_id],
                    }
                  : {}),
                ...((extras.passport as Record<number, unknown> | undefined)?.[r.worker_id]
                  ? {
                      passport: (extras.passport as Record<number, unknown>)[
                        r.worker_id
                      ],
                    }
                  : {}),
              }
            : null,
          organization: r.org_id
            ? {
                id: r.org_id,
                name: this.pickLang(r.org_name, r.org_name_ru, r.org_name_en),
                group: r.org_group ?? false,
              }
            : null,
          department: r.dept_id
            ? { id: r.dept_id, name: r.dept_name, level: r.dept_level }
            : null,
          position: r.pos_id
            ? {
                id: r.pos_id,
                name: this.pickLang(r.pos_name, r.pos_name_ru, r.pos_name_en),
              }
            : null,
          type: r.wp_type,
        })),
      ),
    };
  }

  selectWorkerPositionsBase(
    where: ReturnType<typeof and>,
    limit?: number,
    offset?: number,
  ) {
    const q = this.db
      .select(wpCols)
      .from(worker_positions)
      .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
      .leftJoin(departments, eq(departments.id, worker_positions.department_id))
      .leftJoin(
        positionsTable,
        eq(positionsTable.id, worker_positions.position_id),
      )
      .leftJoin(
        organizations,
        eq(organizations.id, worker_positions.organization_id),
      )
      .where(where)
      .orderBy(asc(worker_positions.id));
    if (limit != null) {
      return q.limit(limit).offset(offset ?? 0);
    }
    return q;
  }

  private async selectWorkerPositionsBaseByWpIds(wpIds: number[]) {
    return this.db
      .select(wpCols)
      .from(worker_positions)
      .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
      .leftJoin(departments, eq(departments.id, worker_positions.department_id))
      .leftJoin(
        positionsTable,
        eq(positionsTable.id, worker_positions.position_id),
      )
      .leftJoin(
        organizations,
        eq(organizations.id, worker_positions.organization_id),
      )
      .where(inArray(worker_positions.id, wpIds));
  }

  private async paginateContracts(
    where: ReturnType<typeof and>,
    perPage: number,
    page: number,
    offset: number,
  ) {
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: contracts.id,
          uuid: contracts.uuid,
          number: contracts.number,
          contract_date: contracts.contract_date,
          contract_to_date: contracts.contract_to_date,
          worker_id: contracts.worker_id,
          type: contracts.type,
        })
        .from(contracts)
        .where(where)
        .orderBy(asc(contracts.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(contracts).where(where),
    ]);

    const workerIds = [
      ...new Set(
        rows
          .map((r) => r.worker_id)
          .filter((id): id is number => id != null),
      ),
    ];
    const wMap = await this.bundleWorkers(workerIds);

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => {
          const w = r.worker_id ? wMap.get(r.worker_id) : null;
          return {
            id: r.id,
            uuid: r.uuid,
            number: r.number,
            contract_date: r.contract_date,
            contract_to_date: r.contract_to_date,
            type: r.type,
            worker: w
              ? {
                  id: w.id,
                  uuid: w.uuid,
                  last_name: w.last_name,
                  first_name: w.first_name,
                  middle_name: w.middle_name,
                  birthday: w.birthday,
                  photo: await this.minio.fileUrl(w.photo),
                }
              : null,
          };
        }),
      ),
    };
  }

  private async bundleWorkers(workerIds: number[]) {
    if (workerIds.length === 0) {
      return new Map<
        number,
        {
          id: number;
          uuid: string;
          last_name: string | null;
          first_name: string | null;
          middle_name: string | null;
          birthday: string;
          photo: string | null;
        }
      >();
    }
    const rows = await this.db
      .select({
        id: workers.id,
        uuid: workers.uuid,
        last_name: workers.last_name,
        first_name: workers.first_name,
        middle_name: workers.middle_name,
        birthday: workers.birthday,
        photo: workers.photo,
      })
      .from(workers)
      .where(inArray(workers.id, workerIds));
    return new Map(rows.map((r) => [r.id, r]));
  }

  // For preview endpoints — load worker + its first worker_position with joins.
  private async bundleWorkersWithPosition(workerIds: number[]) {
    if (workerIds.length === 0) return { workers: new Map(), positions: new Map() };
    const [workersRows, wpRows] = await Promise.all([
      this.db
        .select({
          id: workers.id,
          uuid: workers.uuid,
          last_name: workers.last_name,
          first_name: workers.first_name,
          middle_name: workers.middle_name,
          birthday: workers.birthday,
          photo: workers.photo,
        })
        .from(workers)
        .where(inArray(workers.id, workerIds)),
      this.db
        .select({
          id: worker_positions.id,
          worker_id: worker_positions.worker_id,
          type: worker_positions.type,
          organization_id: worker_positions.organization_id,
          department_id: worker_positions.department_id,
          position_id: worker_positions.position_id,
          org_name: organizations.name,
          org_name_ru: organizations.name_ru,
          org_name_en: organizations.name_en,
          org_group: organizations.group,
          dept_name: departments.name,
          dept_level: departments.level,
          pos_name: positionsTable.name,
          pos_name_ru: positionsTable.name_ru,
          pos_name_en: positionsTable.name_en,
        })
        .from(worker_positions)
        .leftJoin(
          organizations,
          eq(organizations.id, worker_positions.organization_id),
        )
        .leftJoin(departments, eq(departments.id, worker_positions.department_id))
        .leftJoin(
          positionsTable,
          eq(positionsTable.id, worker_positions.position_id),
        )
        .where(
          and(
            inArray(worker_positions.worker_id, workerIds),
            notDeleted(worker_positions),
          ),
        )
        .orderBy(asc(worker_positions.id)),
    ]);

    const positionsByWorker = new Map<number, (typeof wpRows)[number]>();
    for (const wp of wpRows) {
      if (wp.worker_id == null) continue;
      if (!positionsByWorker.has(wp.worker_id)) positionsByWorker.set(wp.worker_id, wp);
    }

    return {
      workers: new Map(workersRows.map((w) => [w.id, w])),
      positions: positionsByWorker,
    };
  }

  private async toWorkerWithPosition(
    bundle: Awaited<ReturnType<DashboardViewsService['bundleWorkersWithPosition']>>,
    workerId: number | null,
  ) {
    if (workerId == null) return null;
    const w = bundle.workers.get(workerId);
    if (!w) return null;
    const pos = bundle.positions.get(workerId);
    return {
      id: w.id,
      uuid: w.uuid,
      last_name: w.last_name,
      first_name: w.first_name,
      middle_name: w.middle_name,
      birthday: w.birthday,
      photo: await this.minio.fileUrl(w.photo),
      position: pos
        ? {
            id: pos.id,
            type: pos.type,
            organization: pos.organization_id
              ? {
                  id: pos.organization_id,
                  name: this.pickLang(pos.org_name, pos.org_name_ru, pos.org_name_en),
                  group: pos.org_group ?? false,
                }
              : null,
            department: pos.department_id
              ? { id: pos.department_id, name: pos.dept_name, level: pos.dept_level }
              : null,
            position: pos.position_id
              ? {
                  id: pos.position_id,
                  name: this.pickLang(pos.pos_name, pos.pos_name_ru, pos.pos_name_en),
                }
              : null,
          }
        : null,
    };
  }

  private pickLang(
    uz: string | null,
    ru: string | null,
    en: string | null,
  ): string | null {
    const l = this.ctx.lang;
    if (l === 'ru') return ru ?? uz;
    if (l === 'en') return en ?? uz;
    return uz;
  }

  private today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private nextMonthDate(): string {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
