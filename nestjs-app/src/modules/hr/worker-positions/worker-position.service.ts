// WorkerPosition service. Laravel: WorkerPositionController::index().
//
// Bosqich 2 — faqat list (filter+search+pagination). Show/edit Bosqich 3'da.
// Default filter: status = ACTIVE (PositionStatusEnum::ACTIVE = 2).

import { Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
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
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  worker_positions,
  workers,
  worker_phones,
  worker_photos,
  worker_passports,
  worker_languages,
  worker_relatives,
  worker_universities,
  worker_old_careers,
  worker_academic_degrees,
  worker_academic_titles,
  worker_exams,
  worker_position_schedules,
  universities as universitiesTable,
  specialities as specialitiesTable,
  languages as languagesTable,
  organizations,
  departments,
  positions as positionsTable,
  countries,
  regions,
  cities,
  nationalities,
  contracts,
  meds,
  users as usersTable,
  roles,
  model_has_roles,
  organization_disciplinaries,
  organization_incentives,
  vacations,
} from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import {
  WorkerPositionMapper,
  type WorkerPositionListRow,
} from '@/modules/hr/worker-positions/worker-position.mapper';
import {
  AttachDetachRoleDto,
  QueryWorkerPositionDto,
  UpdateWorkerPositionDto,
  WorkerPositionListResponseDto,
} from '@/modules/hr/worker-positions/dto/worker-position.dto';

const POSITION_STATUS_ACTIVE = 2;

@Injectable()
export class WorkerPositionService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
    private readonly scope: OrgScopeService,
  ) {}

  async findAll(
    filters: QueryWorkerPositionDto,
  ): Promise<WorkerPositionListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;

    const deptIds = this.parseIds(filters.departments);
    const posIds = this.parseIds(filters.positions);
    const dpIds = this.parseIds(filters.department_positions);
    // Laravel WorkerPosition::filter — role + organizations + organization_id.
    const inScope = await this.scope.whereOrg(
      worker_positions.organization_id,
      {
        organizations: filters.organizations,
        organization_id: filters.organization_id,
      },
    );

    // Worker search — Laravel `searchByFullName` parity:
    //   `search` bo'sh joy bilan ajratiladi va har bir term last/first/middle_name
    //   OR ichida qidiriladi, terms o'rtasida AND. Plus pin/card to'liq search bilan.
    // last_name/first_name/middle_name filterlari (alohida) — Laravel'da
    //   `orWhereLike` bilan keladi (search bilan birga ishlatilsa OR), lekin
    //   amaliyotda search ishlatilganda alohida emas. Bizda hozir OR bilan birga.
    const workerSearchConds: SQL[] = [];
    if (filters.search) {
      const terms = filters.search.trim().split(/\s+/).filter(Boolean);
      const termsAnd: SQL[] = [];
      for (const term of terms) {
        const pattern = `%${term}%`;
        const orExpr = or(
          ilike(workers.last_name, pattern),
          ilike(workers.first_name, pattern),
          ilike(workers.middle_name, pattern),
        );
        if (orExpr) termsAnd.push(orExpr);
      }
      const termsAndExpr = and(...termsAnd);
      if (termsAndExpr) workerSearchConds.push(termsAndExpr);

      // PIN/card to'liq search bilan (Laravel: orWhereLike('pin', $search) + card)
      workerSearchConds.push(
        sql`CAST(${workers.pin} AS TEXT) ILIKE ${`%${filters.search}%`}`,
      );
      const cardNum = Number(filters.search);
      if (Number.isFinite(cardNum)) {
        workerSearchConds.push(
          sql`CAST(${workers.card} AS TEXT) ILIKE ${`%${cardNum}%`}`,
        );
      }
    }
    if (filters.last_name) {
      workerSearchConds.push(
        ilike(workers.last_name, `%${filters.last_name}%`),
      );
    }
    if (filters.first_name) {
      workerSearchConds.push(
        ilike(workers.first_name, `%${filters.first_name}%`),
      );
    }
    if (filters.middle_name) {
      workerSearchConds.push(
        ilike(workers.middle_name, `%${filters.middle_name}%`),
      );
    }

    const where = and(
      isNull(worker_positions.deleted_at),
      eq(worker_positions.status, POSITION_STATUS_ACTIVE),
      inScope,
      filters.department_id
        ? eq(worker_positions.department_id, filters.department_id)
        : undefined,
      deptIds.length > 0
        ? inArray(worker_positions.department_id, deptIds)
        : undefined,
      posIds.length > 0
        ? inArray(worker_positions.position_id, posIds)
        : undefined,
      dpIds.length > 0
        ? inArray(worker_positions.department_position_id, dpIds)
        : undefined,
      filters.contract_id
        ? eq(worker_positions.contract_id, filters.contract_id)
        : undefined,
      // position_type — position.category orqali tekshiruv.
      filters.position_type
        ? eq(positionsTable.category, filters.position_type)
        : undefined,
      workerSearchConds.length > 0 ? or(...workerSearchConds) : undefined,
    );

    const offset = (page - 1) * perPage;

    // Count uchun ham join'lar kerak (filters worker/position'ga tegishli).
    const countQuery =
      workerSearchConds.length > 0 || filters.position_type
        ? this.db
            .select({
              total: sql<number>`COUNT(DISTINCT ${worker_positions.id})`,
            })
            .from(worker_positions)
            .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
            .leftJoin(
              positionsTable,
              eq(positionsTable.id, worker_positions.position_id),
            )
            .where(where)
        : this.db
            .select({ total: count() })
            .from(worker_positions)
            .where(where);

    const [rows, [{ total }]] = await Promise.all([
      this.fetchListRows(where, perPage, offset),
      countQuery,
    ]);

    // Photo signed URL ni har bir worker uchun parallel hisoblaymiz.
    const data = await Promise.all(
      rows.map(async (r) => {
        const photoUrl = r.worker_photo
          ? await this.minio.fileUrl(r.worker_photo)
          : null;
        return WorkerPositionMapper.toListItem(r, this.i18n, lang, photoUrl);
      }),
    );

    return {
      current_page: page,
      total: Number(total),
      data,
    };
  }

  // ---- Helpers ----

  private parseIds(raw: string | undefined): number[] {
    if (!raw) return [];
    return raw
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n));
  }

  private async fetchListRows(
    where: ReturnType<typeof and> | undefined,
    limit: number,
    offset: number,
  ): Promise<WorkerPositionListRow[]> {
    return (
      this.db
        .select({
          id: worker_positions.id,
          uuid: worker_positions.uuid,
          type: worker_positions.type,
          position_date: worker_positions.position_date,
          group: worker_positions.group,
          rank: worker_positions.rank,
          rate: worker_positions.rate,
          salary: worker_positions.salary,
          // worker
          worker_id: workers.id,
          worker_uuid: workers.uuid,
          worker_photo: workers.photo,
          worker_last: workers.last_name,
          worker_first: workers.first_name,
          worker_middle: workers.middle_name,
          worker_birthday: workers.birthday,
          worker_pin: workers.pin,
          // org
          org_id: organizations.id,
          org_name: organizations.name,
          org_name_ru: organizations.name_ru,
          org_name_en: organizations.name_en,
          org_group: organizations.group,
          // dept
          dept_id: departments.id,
          dept_name: departments.name,
          dept_level: departments.level,
          // position
          pos_id: positionsTable.id,
          pos_name: positionsTable.name,
          pos_name_ru: positionsTable.name_ru,
          pos_name_en: positionsTable.name_en,
        })
        .from(worker_positions)
        .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
        .leftJoin(
          organizations,
          and(
            eq(organizations.id, worker_positions.organization_id),
            isNull(organizations.deleted_at),
          ),
        )
        .leftJoin(
          departments,
          eq(departments.id, worker_positions.department_id),
        )
        .leftJoin(
          positionsTable,
          eq(positionsTable.id, worker_positions.position_id),
        )
        .where(where)
        // Laravel: organization_id → department_id → department_position_id → id.
        .orderBy(
          asc(worker_positions.organization_id),
          asc(worker_positions.department_id),
          asc(worker_positions.department_position_id),
          asc(worker_positions.id),
        )
        .limit(limit)
        .offset(offset)
    );
  }

  // GET /api/v1/hr/worker-position-info/{workerPositionId} — positionInfos.
  async positionInfo(id: number) {
    const lang = this.ctx.lang;
    const [row] = await this.db
      .select({
        id: worker_positions.id,
        type: worker_positions.type,
        position_date: worker_positions.position_date,
        probation: worker_positions.probation,
        vacation_main_day: worker_positions.vacation_main_day,
        additional_vacation_day: worker_positions.additional_vacation_day,
        group: worker_positions.group,
        rank: worker_positions.rank,
        rate: worker_positions.rate,
        salary: worker_positions.salary,
        contract_id: worker_positions.contract_id,
        worker_last: workers.last_name,
        worker_first: workers.first_name,
        worker_middle: workers.middle_name,
        worker_uuid: workers.uuid,
        worker_id: workers.id,
        worker_photo: workers.photo,
        worker_birthday: workers.birthday,
        worker_pin: workers.pin,
        org_id: organizations.id,
        org_name: organizations.name,
        org_name_ru: organizations.name_ru,
        org_name_en: organizations.name_en,
        org_group: organizations.group,
        dept_id: departments.id,
        dept_name: departments.name,
        dept_level: departments.level,
        pos_id: positionsTable.id,
        pos_name: positionsTable.name,
        pos_name_ru: positionsTable.name_ru,
        pos_name_en: positionsTable.name_en,
        contract_uuid: contracts.uuid,
        contract_number: contracts.number,
        contract_date: contracts.contract_date,
        contract_to_date: contracts.contract_to_date,
        contract_type: contracts.type,
      })
      .from(worker_positions)
      .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
      .leftJoin(
        organizations,
        and(
          eq(organizations.id, worker_positions.organization_id),
          isNull(organizations.deleted_at),
        ),
      )
      .leftJoin(departments, eq(departments.id, worker_positions.department_id))
      .leftJoin(
        positionsTable,
        eq(positionsTable.id, worker_positions.position_id),
      )
      .leftJoin(contracts, eq(contracts.id, worker_positions.contract_id))
      .where(eq(worker_positions.id, id))
      .limit(1);

    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    // schedules + work_days (Laravel: schedules.work_days nested) — many-to-many via worker_position_schedules.
    // Simplification: skip schedules detail for now, return empty array.
    const schedulesList: unknown[] = [];

    return {
      id: row.id,
      worker: row.worker_id
        ? {
            id: row.worker_id,
            uuid: row.worker_uuid,
            photo: await this.minio.fileUrl(row.worker_photo),
            last_name: row.worker_last,
            first_name: row.worker_first,
            middle_name: row.worker_middle,
            birthday: row.worker_birthday,
            pin: row.worker_pin,
          }
        : null,
      organization: row.org_id
        ? {
            id: row.org_id,
            name: this.pickLang(
              row.org_name,
              row.org_name_ru,
              row.org_name_en,
              lang,
            ),
            group: row.org_group ?? false,
          }
        : null,
      contract: row.contract_id
        ? {
            id: row.contract_id,
            uuid: row.contract_uuid,
            number: row.contract_number,
            type: row.contract_type,
            contract_date: row.contract_date,
            contract_to_date: row.contract_to_date,
          }
        : null,
      department: row.dept_id
        ? { id: row.dept_id, name: row.dept_name, level: row.dept_level }
        : null,
      position: row.pos_id
        ? {
            id: row.pos_id,
            name: this.pickLang(
              row.pos_name,
              row.pos_name_ru,
              row.pos_name_en,
              lang,
            ),
          }
        : null,
      type: {
        id: row.type,
        name: row.type, // PositionCategoryEnum::get — leave as id (Laravel returns same).
      },
      position_date: row.position_date,
      probation: {
        id: row.probation,
        name: row.probation, // ProbationEnum::get — leave as id.
      },
      schedules: schedulesList,
      vacation_main_day: row.vacation_main_day,
      additional_vacation_day: row.additional_vacation_day,
      group: row.group,
      rank: row.rank,
      rate: row.rate,
      salary: row.salary,
    };
  }

  // GET /api/v1/hr/worker-positions/{uuid} — show (Laravel: WorkerPositionFullResource).
  // Top-level: id + worker(nested) + organization + contract + department + position +
  // type + position_date + post_name + probation + vacation_main_day + additional_vacation_day +
  // group + rank + rate + salary("**********") + meds + vacations.
  async show(uuid: string) {
    const lang = this.ctx.lang;
    const [wp] = await this.db
      .select({
        id: worker_positions.id,
        uuid: worker_positions.uuid,
        type: worker_positions.type,
        probation: worker_positions.probation,
        vacation_main_day: worker_positions.vacation_main_day,
        additional_vacation_day: worker_positions.additional_vacation_day,
        group: worker_positions.group,
        rank: worker_positions.rank,
        rate: worker_positions.rate,
        position_date: worker_positions.position_date,
        worker_id: worker_positions.worker_id,
        // organization
        org_id: organizations.id,
        org_name: organizations.name,
        org_name_ru: organizations.name_ru,
        org_name_en: organizations.name_en,
        org_group: organizations.group,
        org_full_name: organizations.full_name,
        // contract
        contract_id: contracts.id,
        contract_number: contracts.number,
        contract_date: contracts.contract_date,
        contract_to_date: contracts.contract_to_date,
        contract_type: contracts.type,
        // department
        dept_id: departments.id,
        dept_name: departments.name,
        dept_level: departments.level,
        // position
        pos_id: positionsTable.id,
        pos_name: positionsTable.name,
        pos_name_ru: positionsTable.name_ru,
        pos_classification_index: positionsTable.classification_index,
        pos_classification_code: positionsTable.classification_code,
      })
      .from(worker_positions)
      .leftJoin(
        organizations,
        and(
          eq(organizations.id, worker_positions.organization_id),
          isNull(organizations.deleted_at),
        ),
      )
      .leftJoin(contracts, eq(contracts.id, worker_positions.contract_id))
      .leftJoin(departments, eq(departments.id, worker_positions.department_id))
      .leftJoin(
        positionsTable,
        eq(positionsTable.id, worker_positions.position_id),
      )
      .where(and(eq(worker_positions.uuid, uuid), notDeleted(worker_positions)))
      .limit(1);

    if (!wp || !wp.worker_id) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    const worker = await this.buildWorker(wp.worker_id, lang);

    // meds + vacations (worker_position level, not worker level — Laravel uses
    // $this->worker->meds/vacations though).
    const wid = wp.worker_id;
    const [medsRows, vacRows] = await Promise.all([
      this.db
        .select({
          id: meds.id,
          status: meds.status,
          from: meds.from,
          to: meds.to,
          comment: meds.comment,
          current: meds.current,
        })
        .from(meds)
        .where(and(eq(meds.worker_id, wid), notDeleted(meds))),
      this.db
        .select({
          id: vacations.id,
          type: vacations.type,
          from: vacations.from,
          to: vacations.to,
          work_day: vacations.work_day,
          rest_day: vacations.rest_day,
          all_day: vacations.all_day,
          main_day: vacations.main_day,
          second_day: vacations.second_day,
        })
        .from(vacations)
        .where(and(eq(vacations.worker_id, wid), notDeleted(vacations))),
    ]);

    const post_name = this.buildPostName(
      wp.org_full_name,
      wp.dept_name,
      wp.dept_level,
      wp.pos_name,
    );

    return {
      id: wp.id,
      worker,
      organization: wp.org_id
        ? {
            id: wp.org_id,
            name: this.pickLang(
              wp.org_name,
              wp.org_name_ru,
              wp.org_name_en,
              lang,
            ),
            group: wp.org_group ?? false,
          }
        : null,
      contract: wp.contract_id
        ? {
            id: wp.contract_id,
            number: wp.contract_number,
            contract_date: wp.contract_date,
            contract_to_date: wp.contract_to_date,
            type: {
              id: wp.contract_type,
              name: this.contractTypeLabel(wp.contract_type),
            },
          }
        : null,
      department: wp.dept_id
        ? { id: wp.dept_id, name: wp.dept_name, level: wp.dept_level }
        : null,
      position: wp.pos_id
        ? {
            id: wp.pos_id,
            name: wp.pos_name,
            name_ru: wp.pos_name_ru,
            classification_index: wp.pos_classification_index,
            classification_code: wp.pos_classification_code,
          }
        : null,
      type: {
        id: wp.type,
        name: this.positionCategoryLabel(wp.type),
      },
      position_date: wp.position_date,
      post_name,
      probation: {
        id: wp.probation ?? 0,
        name: this.probationLabel(wp.probation),
      },
      vacation_main_day: wp.vacation_main_day,
      additional_vacation_day: wp.additional_vacation_day,
      group: wp.group,
      rank: wp.rank,
      rate: wp.rate != null ? wp.rate / 100 : wp.rate,
      salary: '**********',
      meds: medsRows.map((m) => ({
        id: m.id,
        status: { id: m.status, name: this.medStatusLabel(m.status) },
        from: m.from,
        to: m.to,
        comment: m.comment,
        current: m.current,
      })),
      vacations: vacRows.map((v) => ({
        id: v.id,
        type: { id: v.type, name: this.vacationTypeLabel(v.type) },
        from: v.from,
        to: v.to,
        work_day: v.work_day,
        rest_day: v.rest_day,
        all_day: v.all_day,
        main_day: v.main_day,
        second_day: v.second_day,
      })),
    };
  }

  // Build worker subresource (Laravel: WorkerOnlyResource).
  private async buildWorker(workerId: number, lang: string) {
    const [w] = await this.db
      .select()
      .from(workers)
      .where(eq(workers.id, workerId))
      .limit(1);
    if (!w) return null;

    const [
      photos,
      phones,
      languages,
      passports,
      country,
      region,
      city,
      currentRegion,
      currentCity,
      nationality,
      relatives,
      universities,
      oldCareers,
      academicDegrees,
      academicTitles,
      allPositions,
      incentivesRows,
      disciplinaryRows,
      examsRows,
      profileRow,
    ] = await Promise.all([
      this.db
        .select({
          id: worker_photos.id,
          photo: worker_photos.photo,
          current: worker_photos.current,
        })
        .from(worker_photos)
        .where(
          and(eq(worker_photos.worker_id, workerId), notDeleted(worker_photos)),
        )
        .orderBy(asc(worker_photos.id)),
      this.db
        .select({ id: worker_phones.id, phone: worker_phones.phone })
        .from(worker_phones)
        .where(
          and(eq(worker_phones.worker_id, workerId), notDeleted(worker_phones)),
        ),
      this.db
        .select({
          id: worker_languages.id,
          language_id: worker_languages.language_id,
          file: worker_languages.file,
        })
        .from(worker_languages)
        .where(
          and(
            eq(worker_languages.worker_id, workerId),
            notDeleted(worker_languages),
          ),
        ),
      this.db
        .select({
          id: worker_passports.id,
          serial_number: worker_passports.serial_number,
          from_date: worker_passports.from_date,
          to_date: worker_passports.to_date,
          address: worker_passports.address,
          file: worker_passports.file,
        })
        .from(worker_passports)
        .where(
          and(
            eq(worker_passports.worker_id, workerId),
            notDeleted(worker_passports),
          ),
        ),
      w.country_id
        ? this.db
            .select({ id: countries.id, name: countries.name })
            .from(countries)
            .where(eq(countries.id, w.country_id))
            .limit(1)
        : Promise.resolve([]),
      w.region_id
        ? this.db
            .select({ id: regions.id, name: regions.name })
            .from(regions)
            .where(eq(regions.id, w.region_id))
            .limit(1)
        : Promise.resolve([]),
      w.city_id
        ? this.db
            .select({ id: cities.id, name: cities.name })
            .from(cities)
            .where(eq(cities.id, w.city_id))
            .limit(1)
        : Promise.resolve([]),
      w.current_region_id
        ? this.db
            .select({ id: regions.id, name: regions.name })
            .from(regions)
            .where(eq(regions.id, w.current_region_id))
            .limit(1)
        : Promise.resolve([]),
      w.current_city_id
        ? this.db
            .select({ id: cities.id, name: cities.name })
            .from(cities)
            .where(eq(cities.id, w.current_city_id))
            .limit(1)
        : Promise.resolve([]),
      w.nationality_id
        ? this.db
            .select({ id: nationalities.id, name: nationalities.name })
            .from(nationalities)
            .where(eq(nationalities.id, w.nationality_id))
            .limit(1)
        : Promise.resolve([]),
      this.db
        .select({
          id: worker_relatives.id,
          relative: worker_relatives.relative,
          relative_worker_id: worker_relatives.relative_worker_id,
          birthday: worker_relatives.birthday,
          last_name: worker_relatives.last_name,
          first_name: worker_relatives.first_name,
          middle_name: worker_relatives.middle_name,
          birth_place: worker_relatives.birth_place,
          post_name: worker_relatives.post_name,
          address: worker_relatives.address,
        })
        .from(worker_relatives)
        .where(
          and(
            eq(worker_relatives.worker_id, workerId),
            notDeleted(worker_relatives),
          ),
        )
        .orderBy(asc(worker_relatives.sort), asc(worker_relatives.id)),
      this.db
        .select({
          id: worker_universities.id,
          speciality_name: specialitiesTable.name,
          university_name: universitiesTable.name,
          university_education: universitiesTable.education,
          from_date: worker_universities.from_date,
          to_date: worker_universities.to_date,
        })
        .from(worker_universities)
        .leftJoin(
          universitiesTable,
          eq(universitiesTable.id, worker_universities.university_id),
        )
        .leftJoin(
          specialitiesTable,
          eq(specialitiesTable.id, worker_universities.speciality_id),
        )
        .where(
          and(
            eq(worker_universities.worker_id, workerId),
            notDeleted(worker_universities),
          ),
        ),
      this.db
        .select()
        .from(worker_old_careers)
        .where(
          and(
            eq(worker_old_careers.worker_id, workerId),
            notDeleted(worker_old_careers),
          ),
        )
        .orderBy(sql`${worker_old_careers.sort} DESC`),
      this.db
        .select({
          id: worker_academic_degrees.id,
          type: worker_academic_degrees.type,
          file: worker_academic_degrees.file,
        })
        .from(worker_academic_degrees)
        .where(
          and(
            eq(worker_academic_degrees.worker_id, workerId),
            notDeleted(worker_academic_degrees),
          ),
        ),
      this.db
        .select({
          id: worker_academic_titles.id,
          type: worker_academic_titles.type,
          file: worker_academic_titles.file,
        })
        .from(worker_academic_titles)
        .where(
          and(
            eq(worker_academic_titles.worker_id, workerId),
            notDeleted(worker_academic_titles),
          ),
        ),
      this.db
        .select({
          id: worker_positions.id,
          contract_id: worker_positions.contract_id,
          position_date: worker_positions.position_date,
          org_id: organizations.id,
          org_name: organizations.name,
          org_name_ru: organizations.name_ru,
          org_name_en: organizations.name_en,
          org_full_name: organizations.full_name,
          org_group: organizations.group,
          dept_id: departments.id,
          dept_name: departments.name,
          dept_level: departments.level,
          pos_id: positionsTable.id,
          pos_name: positionsTable.name,
          contract_to_date: contracts.contract_to_date,
        })
        .from(worker_positions)
        .leftJoin(
          organizations,
          and(
            eq(organizations.id, worker_positions.organization_id),
            isNull(organizations.deleted_at),
          ),
        )
        .leftJoin(
          departments,
          eq(departments.id, worker_positions.department_id),
        )
        .leftJoin(
          positionsTable,
          eq(positionsTable.id, worker_positions.position_id),
        )
        .leftJoin(contracts, eq(contracts.id, worker_positions.contract_id))
        .where(
          and(
            eq(worker_positions.worker_id, workerId),
            notDeleted(worker_positions),
          ),
        )
        .orderBy(asc(worker_positions.position_date)),
      this.db
        .select({
          id: organization_incentives.id,
          number: organization_incentives.number,
          reason: organization_incentives.reason,
          by_whom: organization_incentives.by_whom,
          gift: organization_incentives.gift,
          gift_type: organization_incentives.gift_type,
          date: organization_incentives.date,
          org_id: organizations.id,
          org_name: organizations.name,
          org_name_ru: organizations.name_ru,
          org_name_en: organizations.name_en,
          org_group: organizations.group,
        })
        .from(organization_incentives)
        .leftJoin(
          organizations,
          and(
            eq(organizations.id, organization_incentives.organization_id),
            isNull(organizations.deleted_at),
          ),
        )
        .where(
          and(
            eq(organization_incentives.worker_id, workerId),
            notDeleted(organization_incentives),
          ),
        ),
      this.db
        .select({
          id: organization_disciplinaries.id,
          number: organization_disciplinaries.number,
          reason: organization_disciplinaries.reason,
          fine: organization_disciplinaries.fine,
          fine_type: organization_disciplinaries.fine_type,
          date: organization_disciplinaries.date,
          org_id: organizations.id,
          org_name: organizations.name,
          org_name_ru: organizations.name_ru,
          org_name_en: organizations.name_en,
          org_group: organizations.group,
        })
        .from(organization_disciplinaries)
        .leftJoin(
          organizations,
          and(
            eq(organizations.id, organization_disciplinaries.organization_id),
            isNull(organizations.deleted_at),
          ),
        )
        .where(
          and(
            eq(organization_disciplinaries.worker_id, workerId),
            notDeleted(organization_disciplinaries),
          ),
        ),
      this.db
        .select({
          id: worker_exams.id,
          created: worker_exams.created,
          ended: worker_exams.ended,
          result: worker_exams.result,
          deleted_at: worker_exams.deleted_at,
          exam_id: worker_exams.exam_id,
          topic_id: worker_exams.topic_id,
        })
        .from(worker_exams)
        .where(eq(worker_exams.worker_id, workerId)),
      this.db
        .select({
          id: usersTable.id,
          uuid: usersTable.uuid,
          phone: usersTable.phone,
        })
        .from(usersTable)
        .where(eq(usersTable.worker_id, workerId))
        .limit(1),
    ]);

    const profile = profileRow[0]
      ? {
          id: profileRow[0].id,
          uuid: profileRow[0].uuid,
          worker: {
            id: w.id,
            photo: await this.minio.fileUrl(w.photo),
            last_name: w.last_name,
            first_name: w.first_name,
            middle_name: w.middle_name,
          },
          phone: profileRow[0].phone,
        }
      : null;

    const result = {
      uuid: w.uuid,
      photos: await Promise.all(
        photos.map(async (p) => ({
          id: p.id,
          photo: await this.minio.fileUrl(p.photo),
          current: p.current,
        })),
      ),
      phones: phones.map((p) => ({ id: p.id, phone: p.phone })),
      languages: await Promise.all(
        languages.map(async (l) => ({
          id: l.language_id,
          language: null,
          file: await this.minio.fileUrl(l.file),
        })),
      ),
      passports: await Promise.all(
        passports.map(async (p) => ({
          id: p.id,
          serial_number: p.serial_number,
          from_date: p.from_date,
          to_date: p.to_date,
          address: p.address,
          file: await this.minio.fileUrl(p.file),
        })),
      ),
      last_name: w.last_name,
      first_name: w.first_name,
      middle_name: w.middle_name,
      birthday: w.birthday,
      pin: w.pin,
      sex: w.sex,
      education: w.education,
      address: w.address,
      marital_status: {
        id: w.marital_status,
        name: this.maritalStatusLabel(w.marital_status),
      },
      nationality: nationality[0] ?? null,
      region: region[0] ?? null,
      city: city[0] ?? null,
      country: country[0] ?? null,
      current_region: currentRegion[0] ?? null,
      current_city: currentCity[0] ?? null,
      profile,
      relatives: relatives.map((r) => ({
        id: r.id,
        relative: {
          id: r.relative,
          name: this.relativeLabel(r.relative),
        },
        relative_worker: null,
        birthday: r.birthday,
        last_name: r.last_name,
        first_name: r.first_name,
        middle_name: r.middle_name,
        birth_place: r.birth_place,
        post_name: r.post_name,
        address: r.address,
      })),
      universities: universities.map((u) => ({
        id: u.id,
        speciality: u.speciality_name,
        university: u.university_name,
        education: this.educationLabel(u.university_education),
        from_date: u.from_date,
        to_date: u.to_date,
      })),
      old_careers: oldCareers.map((o) => ({
        id: o.id,
        sort: o.sort,
        from_date: o.from_date,
        to_date: o.to_date,
        post_name: o.post_name,
      })),
      academic_degrees: await Promise.all(
        academicDegrees.map(async (a) => ({
          id: a.id,
          type: { id: a.type, name: this.academicDegreeLabel(a.type) },
          file: await this.minio.fileUrl(a.file),
        })),
      ),
      academic_titles: await Promise.all(
        academicTitles.map(async (a) => ({
          id: a.id,
          type: { id: a.type, name: this.academicTitleLabel(a.type) },
          file: await this.minio.fileUrl(a.file),
        })),
      ),
      new_careers: this.buildNewCareers(allPositions, lang),
      incentives: incentivesRows.map((i) => ({
        id: i.id,
        organization: i.org_id
          ? {
              id: i.org_id,
              name: this.pickLang(
                i.org_name,
                i.org_name_ru,
                i.org_name_en,
                lang,
              ),
              group: i.org_group ?? false,
            }
          : null,
        date: i.date,
        by_whom: i.by_whom,
        gift: i.gift,
        gift_type: i.gift_type,
        reason: i.reason,
        number: i.number,
      })),
      disciplinary_actions: disciplinaryRows.map((d) => ({
        id: d.id,
        organization: d.org_id
          ? {
              id: d.org_id,
              name: this.pickLang(
                d.org_name,
                d.org_name_ru,
                d.org_name_en,
                lang,
              ),
              group: d.org_group ?? false,
            }
          : null,
        date: d.date,
        fine: d.fine,
        fine_type: d.fine_type,
        reason: d.reason,
        number: d.number,
      })),
      exams: examsRows.map((e) => ({
        id: e.id,
        worker: null,
        created: e.created,
        ended: e.ended,
        result: e.result,
        exam: e.exam_id ? { id: e.exam_id } : null,
        topic: e.topic_id ? { id: e.topic_id } : null,
        deleted_at: e.deleted_at,
      })),
      statements: [],
    };
    return result;
  }

  // Laravel newCareersArr — to=position.to OR next position date (same contract) OR contract_to_date.
  private buildNewCareers(
    positions: Array<{
      id: number;
      contract_id: number | null;
      position_date: string | null;
      org_id: number | null;
      org_name: string | null;
      org_name_ru: string | null;
      org_name_en: string | null;
      org_full_name: string | null;
      org_group: boolean | null;
      dept_id: number | null;
      dept_name: string | null;
      dept_level: number | null;
      pos_id: number | null;
      pos_name: string | null;
      contract_to_date: string | null;
    }>,
    lang: string,
  ) {
    return positions.map((p, idx) => {
      let to: string | null = null;
      const next = positions[idx + 1];
      if (next) {
        if (next.contract_id === p.contract_id) {
          to = next.position_date;
        } else {
          to = p.contract_to_date;
        }
      }
      const full_position = this.buildPostName(
        p.org_full_name,
        p.dept_name,
        p.dept_level,
        p.pos_name,
      );
      return {
        id: p.id,
        organization: p.org_id
          ? {
              id: p.org_id,
              name: this.pickLang(
                p.org_name,
                p.org_name_ru,
                p.org_name_en,
                lang,
              ),
              group: p.org_group ?? false,
            }
          : null,
        department: p.dept_id
          ? { id: p.dept_id, name: p.dept_name, level: p.dept_level }
          : null,
        position: p.pos_id ? { id: p.pos_id, name: p.pos_name } : null,
        full_position,
        from: p.position_date,
        to,
      };
    });
  }

  // Laravel PositionHelper::getFullPosition.
  private buildPostName(
    orgFullName: string | null,
    deptName: string | null,
    deptLevel: number | null,
    posName: string | null,
  ): string {
    if (!posName) return '';
    let position = posName;
    // DepartmentLevelEnum::CENTER = 1 (skip dept prefix at center level).
    if (deptLevel !== 1 && deptName) {
      position = `${deptName} ${position}`;
    }
    return `${orgFullName ?? ''} ${position}`.trim();
  }

  // ---- Enum label helpers (uz default, matches Laravel transes) ----

  private maritalStatusLabel(v: number | null): string {
    const map: Record<number, string> = {
      1: 'Turmush qurmagan',
      2: 'Uylangan / Turmushga chiqqan',
      3: 'Ajrashgan',
    };
    return v != null ? (map[v] ?? '') : '';
  }

  private probationLabel(v: number | null): string {
    const map: Record<number, string> = {
      1: '1 oylik',
      2: '2 oylik',
      3: '3 oylik',
      4: '4 oylik',
      5: '5 oylik',
      6: '6 oylik',
    };
    return v != null ? (map[v] ?? '') : '';
  }

  private positionCategoryLabel(v: number | null): string {
    const map: Record<number, string> = {
      1: 'Boshqaruv xodimlari',
      2: 'Mutaxassis xodimlar',
      3: 'Texnik xodimlar',
      4: 'Ishlab chiqarish xodimlari',
      5: 'Xizmat ko‘rsatuvchi xodimlar',
    };
    return v != null ? (map[v] ?? '') : '';
  }

  private contractTypeLabel(v: number | null): string {
    const map: Record<number, string> = {
      1: 'Mehnat shartnomasi (Nomuayyan)',
      2: 'Fuqarolik-huquqiy shartnomasi',
      3: 'Mehnat shartnomasi (O‘rindosh)',
      4: 'Mehnat shartnomasi (Masofadan turib ishlash)',
      5: 'Mehnat shartnomasi (Mavsumiy ishlarni bajarish)',
      6: 'Mehnat shartnomasi (Muayyan)',
    };
    return v != null ? (map[v] ?? '') : '';
  }

  private relativeLabel(v: number | null): string {
    const map: Record<number, string> = {
      1: 'Otasi',
      2: 'Onasi',
      3: 'Akasi',
      4: 'Opasi',
      5: "Turmush o'rtog'i",
      6: 'Ukasi',
      7: 'Singlisi',
      8: "O'g'li",
      9: 'Qizi',
      10: 'Qaynotasi',
      11: 'Qaynonasi',
      12: 'Qaynakasi',
      13: 'Qaynopasi',
      14: 'Qaynukasi',
      15: 'Qaynsingli',
    };
    return v != null ? (map[v] ?? '') : '';
  }

  // Laravel RolesEnum::label() — maps role name to translated string.
  // Logic: Admin (id=3) → raw name; known enums → translated; unknown → raw.
  private roleLabel(id: number, name: string): string {
    if (id === 3) return name;
    const map: Record<string, string> = {
      Worker: 'Ishchi xodim',
      HR: 'HR',
      Finance: 'Buxgalter',
      Jurist: 'Yurist',
      Economist: 'Iqtisodchi',
      HrLeader: 'HR rahbari',
      EconomistLeader: 'Iqtisodchi rahbari',
      Hospital: 'Poliklinika xodimi',
      TurnstileViewer: "Turniket ko'ruvchi",
      TurnstileLeader: 'Turniket Leader',
    };
    return map[name] ?? name;
  }

  private medStatusLabel(v: number | null): string {
    const map: Record<number, string> = {
      1: "Sog'lom",
      2: "Nosog'lom",
    };
    return v != null ? (map[v] ?? '') : '';
  }

  private vacationTypeLabel(v: number | null): string {
    return v != null ? String(v) : '';
  }

  private academicDegreeLabel(v: number | null): string {
    return v != null ? String(v) : '';
  }

  private academicTitleLabel(v: number | null): string {
    return v != null ? String(v) : '';
  }

  private educationLabel(v: number | null): string {
    return v != null ? String(v) : '';
  }

  // GET /api/v1/hr/worker-positions/{uuid}/edit — WorkerShowResource.
  // uuid = worker_position.uuid; resolve worker by joining.
  async edit(uuid: string) {
    const lang = this.ctx.lang;
    const [worker] = await this.db
      .select({
        id: workers.id,
        uuid: workers.uuid,
        last_name: workers.last_name,
        first_name: workers.first_name,
        middle_name: workers.middle_name,
        birthday: workers.birthday,
        pin: workers.pin,
        photo: workers.photo,
        education: workers.education,
        address: workers.address,
        sex: workers.sex,
        marital_status: workers.marital_status,
        work_experience: workers.work_experience,
        experience_date: workers.experience_date,
        country_id: workers.country_id,
        region_id: workers.region_id,
        city_id: workers.city_id,
        current_region_id: workers.current_region_id,
        current_city_id: workers.current_city_id,
        nationality_id: workers.nationality_id,
      })
      .from(workers)
      .where(and(eq(workers.uuid, uuid), notDeleted(workers)))
      .limit(1);

    if (!worker) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    // Batch-load related data.
    const wid = worker.id;
    const [
      photos,
      phones,
      languages,
      passports,
      country,
      region,
      city,
      currentRegion,
      currentCity,
      nationality,
      positionsList,
    ] = await Promise.all([
      this.db
        .select({
          id: worker_photos.id,
          photo: worker_photos.photo,
          current: worker_photos.current,
        })
        .from(worker_photos)
        .where(and(eq(worker_photos.worker_id, wid), notDeleted(worker_photos)))
        .orderBy(asc(worker_photos.id)),
      this.db
        .select({ id: worker_phones.id, phone: worker_phones.phone })
        .from(worker_phones)
        .where(
          and(eq(worker_phones.worker_id, wid), notDeleted(worker_phones)),
        ),
      this.db
        .select({
          language_id: worker_languages.language_id,
          name: languagesTable.name,
        })
        .from(worker_languages)
        .leftJoin(
          languagesTable,
          eq(languagesTable.id, worker_languages.language_id),
        )
        .where(
          and(
            eq(worker_languages.worker_id, wid),
            notDeleted(worker_languages),
          ),
        ),
      this.db
        .select({
          id: worker_passports.id,
          serial_number: worker_passports.serial_number,
          from_date: worker_passports.from_date,
          to_date: worker_passports.to_date,
          address: worker_passports.address,
          file: worker_passports.file,
        })
        .from(worker_passports)
        .where(
          and(
            eq(worker_passports.worker_id, wid),
            notDeleted(worker_passports),
          ),
        ),
      worker.country_id
        ? this.db
            .select({ id: countries.id, name: countries.name })
            .from(countries)
            .where(eq(countries.id, worker.country_id))
            .limit(1)
        : Promise.resolve([]),
      worker.region_id
        ? this.db
            .select({ id: regions.id, name: regions.name })
            .from(regions)
            .where(eq(regions.id, worker.region_id))
            .limit(1)
        : Promise.resolve([]),
      worker.city_id
        ? this.db
            .select({ id: cities.id, name: cities.name })
            .from(cities)
            .where(eq(cities.id, worker.city_id))
            .limit(1)
        : Promise.resolve([]),
      worker.current_region_id
        ? this.db
            .select({ id: regions.id, name: regions.name })
            .from(regions)
            .where(eq(regions.id, worker.current_region_id))
            .limit(1)
        : Promise.resolve([]),
      worker.current_city_id
        ? this.db
            .select({ id: cities.id, name: cities.name })
            .from(cities)
            .where(eq(cities.id, worker.current_city_id))
            .limit(1)
        : Promise.resolve([]),
      worker.nationality_id
        ? this.db
            .select({ id: nationalities.id, name: nationalities.name })
            .from(nationalities)
            .where(eq(nationalities.id, worker.nationality_id))
            .limit(1)
        : Promise.resolve([]),
      this.db
        .select({
          id: worker_positions.id,
          type: worker_positions.type,
          probation: worker_positions.probation,
          vacation_main_day: worker_positions.vacation_main_day,
          additional_vacation_day: worker_positions.additional_vacation_day,
          organization_id: worker_positions.organization_id,
          department_id: worker_positions.department_id,
          position_id: worker_positions.position_id,
          contract_id: worker_positions.contract_id,
          group: worker_positions.group,
          rank: worker_positions.rank,
          rate: worker_positions.rate,
          salary: worker_positions.salary,
          position_date: worker_positions.position_date,
          org_name: organizations.name,
          org_name_ru: organizations.name_ru,
          org_name_en: organizations.name_en,
          org_group: organizations.group,
          org_full_name: organizations.full_name,
          dept_name: departments.name,
          dept_level: departments.level,
          pos_name: positionsTable.name,
          contract_table_number: contracts.table_number,
          contract_number: contracts.number,
          contract_date: contracts.contract_date,
          contract_to_date: contracts.contract_to_date,
          contract_type: contracts.type,
        })
        .from(worker_positions)
        .leftJoin(
          organizations,
          and(
            eq(organizations.id, worker_positions.organization_id),
            isNull(organizations.deleted_at),
          ),
        )
        .leftJoin(
          departments,
          eq(departments.id, worker_positions.department_id),
        )
        .leftJoin(
          positionsTable,
          eq(positionsTable.id, worker_positions.position_id),
        )
        .leftJoin(contracts, eq(contracts.id, worker_positions.contract_id))
        .where(
          and(
            eq(worker_positions.worker_id, wid),
            notDeleted(worker_positions),
          ),
        ),
    ]);

    // profile (user) with organizations & roles.
    const [profile] = await this.db
      .select({
        id: usersTable.id,
        uuid: usersTable.uuid,
        phone: usersTable.phone,
      })
      .from(usersTable)
      .where(eq(usersTable.worker_id, wid))
      .limit(1);

    // Batch-load schedules for all worker_positions (current=true).
    const wpIds = positionsList.map((p) => p.id);
    const schedules = wpIds.length
      ? await this.db
          .select({
            worker_position_id: worker_position_schedules.worker_position_id,
            schedule_id: worker_position_schedules.schedule_id,
          })
          .from(worker_position_schedules)
          .where(
            and(
              inArray(worker_position_schedules.worker_position_id, wpIds),
              eq(worker_position_schedules.current, true),
              notDeleted(worker_position_schedules),
            ),
          )
      : [];
    const scheduleMap = new Map<number, number>();
    for (const s of schedules)
      scheduleMap.set(s.worker_position_id, s.schedule_id);

    // Load user roles with organizations (Spatie model_has_roles).
    let profileRoles: Array<{
      id: number;
      name: string;
      organizations: Array<{
        id: number;
        name: string | null;
        full_name: string | null;
        current: boolean;
      }>;
    }> = [];
    if (profile) {
      const userOrgId = await this.db
        .select({ organization_id: usersTable.organization_id })
        .from(usersTable)
        .where(eq(usersTable.id, profile.id))
        .limit(1);
      const currentOrgId = userOrgId[0]?.organization_id ?? null;

      const rolesRows = await this.db
        .select({
          role_id: roles.id,
          role_name: roles.name,
          organization_id: model_has_roles.organization_id,
          org_name: organizations.name,
          org_name_ru: organizations.name_ru,
          org_name_en: organizations.name_en,
          org_full_name: organizations.full_name,
        })
        .from(model_has_roles)
        .innerJoin(roles, eq(roles.id, model_has_roles.role_id))
        .leftJoin(
          organizations,
          and(
            eq(organizations.id, model_has_roles.organization_id),
            isNull(organizations.deleted_at),
          ),
        )
        .where(
          and(
            eq(model_has_roles.model_id, profile.id),
            eq(model_has_roles.model_type, 'App\\Models\\User'),
          ),
        );

      const roleMap = new Map<
        number,
        {
          id: number;
          name: string;
          organizations: Array<{
            id: number;
            name: string | null;
            full_name: string | null;
            current: boolean;
          }>;
        }
      >();
      for (const r of rolesRows) {
        if (!roleMap.has(r.role_id)) {
          roleMap.set(r.role_id, {
            id: r.role_id,
            name: this.roleLabel(r.role_id, r.role_name),
            organizations: [],
          });
        }
        if (r.organization_id) {
          roleMap.get(r.role_id)!.organizations.push({
            id: r.organization_id,
            name: this.pickLang(r.org_name, r.org_name_ru, r.org_name_en, lang),
            full_name: r.org_full_name,
            current: r.organization_id === currentOrgId,
          });
        }
      }
      profileRoles = Array.from(roleMap.values());
    }

    return {
      uuid: worker.uuid,
      id: worker.id,
      photos: await Promise.all(
        photos.map(async (p) => ({
          id: p.id,
          photo: await this.minio.fileUrl(p.photo),
          current: p.current,
        })),
      ),
      phones: phones.map((p) => ({ id: p.id, phone: p.phone })),
      languages: languages.map((l) => ({
        id: l.language_id,
        name: l.name,
      })),
      passports: await Promise.all(
        passports.map(async (p) => ({
          id: p.id,
          serial_number: p.serial_number,
          from_date: p.from_date,
          to_date: p.to_date,
          address: p.address,
          file: await this.minio.fileUrl(p.file),
        })),
      ),
      last_name: worker.last_name,
      first_name: worker.first_name,
      middle_name: worker.middle_name,
      birthday: worker.birthday,
      pin: worker.pin,
      education: worker.education,
      address: worker.address,
      sex: worker.sex ? 1 : 0,
      nationality: nationality[0] ?? null,
      marital_status: {
        id: worker.marital_status,
        name: this.maritalStatusLabel(worker.marital_status),
      },
      work_experience: worker.work_experience,
      experience_date: worker.experience_date,
      region: region[0] ?? null,
      city: city[0] ?? null,
      country: country[0] ?? null,
      current_region: currentRegion[0] ?? null,
      current_city: currentCity[0] ?? null,
      profile: profile
        ? {
            id: profile.id,
            uuid: profile.uuid,
            phone: profile.phone,
            roles: profileRoles,
          }
        : null,
      positions: positionsList.map((p) => ({
        id: p.id,
        organization: p.organization_id
          ? {
              id: p.organization_id,
              name: this.pickLang(
                p.org_name,
                p.org_name_ru,
                p.org_name_en,
                lang,
              ),
              group: p.org_group ?? false,
            }
          : null,
        contract: p.contract_id
          ? {
              id: p.contract_id,
              table_number: p.contract_table_number,
              contract_date: p.contract_date,
              contract_to_date: p.contract_to_date,
              number: p.contract_number,
              type: {
                id: p.contract_type,
                name: this.contractTypeLabel(p.contract_type),
              },
            }
          : null,
        department: p.department_id
          ? { id: p.department_id, name: p.dept_name, level: p.dept_level }
          : null,
        position: p.position_id
          ? { id: p.position_id, name: p.pos_name }
          : null,
        type: {
          id: p.type,
          name: this.contractTypeLabel(p.type),
        },
        position_date: p.position_date,
        post_name: this.buildPostName(
          p.org_full_name,
          p.dept_name,
          p.dept_level,
          p.pos_name,
        ),
        probation: {
          id: p.probation ?? 0,
          name: this.probationLabel(p.probation),
        },
        vacation_main_day: p.vacation_main_day,
        additional_vacation_day: p.additional_vacation_day,
        group: p.group,
        rank: p.rank,
        rate: p.rate != null ? p.rate / 100 : p.rate,
        salary: p.salary,
        schedule_id: scheduleMap.get(p.id) ?? null,
      })),
      another_profile: null,
    };
  }

  // GET /api/v1/hr/worker-new-careers/{uuid}.
  // uuid — worker uuid (Laravel: Worker::whereUuid).
  async newCareers(uuid: string) {
    const lang = this.ctx.lang;
    const [worker] = await this.db
      .select({ id: workers.id })
      .from(workers)
      .where(and(eq(workers.uuid, uuid), notDeleted(workers)))
      .limit(1);
    if (!worker) return [];

    // Laravel: $worker->all_positions sortBy position_date.
    const positions = await this.db
      .select({
        id: worker_positions.id,
        contract_id: worker_positions.contract_id,
        position_date: worker_positions.position_date,
        org_id: organizations.id,
        org_name: organizations.name,
        org_name_ru: organizations.name_ru,
        org_name_en: organizations.name_en,
        org_full_name: organizations.full_name,
        org_group: organizations.group,
        dept_id: departments.id,
        dept_name: departments.name,
        dept_level: departments.level,
        pos_id: positionsTable.id,
        pos_name: positionsTable.name,
        contract_to_date: contracts.contract_to_date,
      })
      .from(worker_positions)
      .leftJoin(
        organizations,
        and(
          eq(organizations.id, worker_positions.organization_id),
          isNull(organizations.deleted_at),
        ),
      )
      .leftJoin(departments, eq(departments.id, worker_positions.department_id))
      .leftJoin(
        positionsTable,
        eq(positionsTable.id, worker_positions.position_id),
      )
      .leftJoin(contracts, eq(contracts.id, worker_positions.contract_id))
      .where(
        and(
          eq(worker_positions.worker_id, worker.id),
          notDeleted(worker_positions),
        ),
      )
      .orderBy(asc(worker_positions.position_date));

    return this.buildNewCareers(positions, lang);
  }

  // DELETE /api/v1/hr/worker-new-careers/{id}.
  async deleteNewCareer(id: number): Promise<void> {
    const [row] = await this.db
      .select({ id: worker_positions.id })
      .from(worker_positions)
      .where(and(eq(worker_positions.id, id), notDeleted(worker_positions)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    await this.db
      .update(worker_positions)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(worker_positions.id, id));
  }

  // PUT /api/v1/hr/worker-positions/{id}/update.
  async updatePosition(
    id: number,
    dto: UpdateWorkerPositionDto,
  ): Promise<void> {
    const [row] = await this.db
      .select({ id: worker_positions.id })
      .from(worker_positions)
      .where(and(eq(worker_positions.id, id), notDeleted(worker_positions)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    await this.db
      .update(worker_positions)
      .set({
        ...(dto.organization_id != null
          ? { organization_id: dto.organization_id }
          : {}),
        ...(dto.department_position_id != null
          ? { department_position_id: dto.department_position_id }
          : {}),
        group: Number(dto.group),
        rank: String(dto.rank),
        rate: Number(dto.rate),
        type: Number(dto.type),
        salary: Number(dto.salary),
        position_date: dto.position_date,
        updated_at: sql`NOW()`,
      })
      .where(eq(worker_positions.id, id));
  }

  // POST /api/v1/hr/worker-positions/{uuid}/edit/attach-role.
  async attachRole(uuid: string, dto: AttachDetachRoleDto): Promise<void> {
    // Laravel resolveProfile: target org auth-user'ning org subtree'sida (getAllChildrenIds).
    await this.assertOrgInSubtree(dto.organization_id);

    // Laravel resolveProfile: Worker::whereUuid($uuid)->firstOrFail() — {uuid} WORKER
    // uuid (worker_position emas), keyin User::where('worker_id', worker->id)->firstOrFail().
    const [worker] = await this.db
      .select({ id: workers.id })
      .from(workers)
      .where(eq(workers.uuid, uuid))
      .limit(1);
    if (!worker) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    const [user] = await this.db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.worker_id, worker.id))
      .limit(1);
    if (!user) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    // Role'ni name bilan ham yechamiz (Admin guard nomga muhtoj).
    let role: { id: number; name: string } | undefined;
    if (dto.role_id) {
      [role] = await this.db
        .select({ id: roles.id, name: roles.name })
        .from(roles)
        .where(eq(roles.id, dto.role_id))
        .limit(1);
    } else if (dto.role) {
      [role] = await this.db
        .select({ id: roles.id, name: roles.name })
        .from(roles)
        .where(eq(roles.name, dto.role))
        .limit(1);
    }
    if (!role) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    // Laravel: Admin rolini biriktirib bo'lmaydi.
    if (role.name === 'Admin') {
      throw new BusinessException(
        403,
        this.i18n.t('messages.errors.organization_not_allowed_permission'),
      );
    }

    // Laravel: shu org uchun mavjud rolni o'chirib, yangisini biriktiradi (org'ga 1 role).
    await this.db
      .delete(model_has_roles)
      .where(
        and(
          eq(model_has_roles.model_id, user.id),
          eq(model_has_roles.organization_id, dto.organization_id),
        ),
      );
    await this.db.insert(model_has_roles).values({
      role_id: role.id,
      model_id: user.id,
      model_type: 'App\\Models\\User',
      organization_id: dto.organization_id,
    });

    // Laravel: profile->update(organization_id = orgId).
    await this.db
      .update(usersTable)
      .set({ organization_id: dto.organization_id })
      .where(eq(usersTable.id, user.id));
  }

  // PUT /api/v1/hr/worker-positions/{uuid}/edit/detach-role.
  async detachRole(uuid: string, dto: AttachDetachRoleDto): Promise<void> {
    // Laravel resolveProfile: target org auth-user'ning org subtree'sida.
    await this.assertOrgInSubtree(dto.organization_id);

    // Laravel resolveProfile: Worker::whereUuid($uuid)->firstOrFail() → User::where(worker_id).
    const [worker] = await this.db
      .select({ id: workers.id })
      .from(workers)
      .where(eq(workers.uuid, uuid))
      .limit(1);
    if (!worker) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    const [user] = await this.db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.worker_id, worker.id))
      .limit(1);
    if (!user) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    // Detach by organization_id only (Laravel signature: roleService->detach(uuid, organization_id)).
    await this.db
      .delete(model_has_roles)
      .where(
        and(
          eq(model_has_roles.model_id, user.id),
          eq(model_has_roles.organization_id, dto.organization_id),
        ),
      );
  }

  // Laravel resolveProfile: Organization::getAllChildrenIds(auth.org) — target org
  // auth-user'ning tashkilot subtree'sida (descendants + self, NestedSet _lft/_rgt)
  // bo'lishi shart, aks holda permission denied.
  private async assertOrgInSubtree(targetOrgId: number): Promise<void> {
    const authOrgId = this.ctx.user_or_fail.organization_id;
    const denied = () =>
      new BusinessException(
        403,
        this.i18n.t('messages.errors.organization_not_allowed_permission'),
      );
    if (authOrgId == null) throw denied();
    if (Number(authOrgId) === Number(targetOrgId)) return;
    const [auth] = await this.db
      .select({ lft: organizations._lft, rgt: organizations._rgt })
      .from(organizations)
      .where(eq(organizations.id, Number(authOrgId)))
      .limit(1);
    if (!auth) throw denied();
    const [hit] = await this.db
      .select({ id: organizations.id })
      .from(organizations)
      .where(
        and(
          eq(organizations.id, Number(targetOrgId)),
          gte(organizations._lft, auth.lft),
          lte(organizations._rgt, auth.rgt),
        ),
      )
      .limit(1);
    if (!hit) throw denied();
  }

  private pickLang(
    uz: string | null,
    ru: string | null,
    en: string | null,
    lang: string,
  ): string | null {
    if (lang === 'ru') return ru ?? uz;
    if (lang === 'en') return en ?? uz;
    return uz;
  }
}
