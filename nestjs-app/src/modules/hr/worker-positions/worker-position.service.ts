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
  ilike,
  inArray,
  isNull,
  or,
  sql,
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
  organizations,
  departments,
  positions as positionsTable,
  countries,
  regions,
  cities,
  nationalities,
  schedules,
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
  ) {}

  async findAll(
    filters: QueryWorkerPositionDto,
  ): Promise<WorkerPositionListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;

    const orgIds = this.parseIds(filters.organizations);
    const deptIds = this.parseIds(filters.departments);
    const posIds = this.parseIds(filters.positions);
    const dpIds = this.parseIds(filters.department_positions);

    // Worker search — full name OR ANY field via separate filters.
    const workerSearchConds: ReturnType<typeof ilike>[] = [];
    if (filters.search) {
      const pattern = `%${filters.search}%`;
      workerSearchConds.push(ilike(workers.last_name, pattern));
      workerSearchConds.push(ilike(workers.first_name, pattern));
      workerSearchConds.push(ilike(workers.middle_name, pattern));
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
      filters.organization_id
        ? eq(worker_positions.organization_id, filters.organization_id)
        : undefined,
      orgIds.length > 0
        ? inArray(worker_positions.organization_id, orgIds)
        : undefined,
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
      workerSearchConds.length > 0
        ? or(...workerSearchConds)
        : undefined,
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

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows.map((r) =>
        WorkerPositionMapper.toListItem(r, this.i18n, lang),
      ),
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
    return this.db
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
        eq(organizations.id, worker_positions.organization_id),
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
      .offset(offset);
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
        eq(organizations.id, worker_positions.organization_id),
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
            name: this.pickLang(row.org_name, row.org_name_ru, row.org_name_en, lang),
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
            name: this.pickLang(row.pos_name, row.pos_name_ru, row.pos_name_en, lang),
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
  // Simplified: returns same as edit() — frontend-needed fields.
  async show(uuid: string) {
    return this.edit(uuid);
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
      .innerJoin(worker_positions, eq(worker_positions.worker_id, workers.id))
      .where(and(eq(worker_positions.uuid, uuid), notDeleted(workers)))
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
        .where(and(eq(worker_phones.worker_id, wid), notDeleted(worker_phones))),
      this.db
        .select({
          id: worker_languages.id,
          language_id: worker_languages.language_id,
        })
        .from(worker_languages)
        .where(
          and(eq(worker_languages.worker_id, wid), notDeleted(worker_languages)),
        ),
      this.db
        .select()
        .from(worker_passports)
        .where(
          and(eq(worker_passports.worker_id, wid), notDeleted(worker_passports)),
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
          uuid: worker_positions.uuid,
          type: worker_positions.type,
          status: worker_positions.status,
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
          dept_name: departments.name,
          dept_level: departments.level,
          pos_name: positionsTable.name,
          contract_uuid: contracts.uuid,
          contract_number: contracts.number,
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
        phone: usersTable.phone,
        organization_id: usersTable.organization_id,
      })
      .from(usersTable)
      .where(eq(usersTable.worker_id, wid))
      .limit(1);

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
      languages,
      passports,
      last_name: worker.last_name,
      first_name: worker.first_name,
      middle_name: worker.middle_name,
      birthday: worker.birthday,
      pin: worker.pin,
      education: worker.education,
      address: worker.address,
      sex: worker.sex ? 1 : 0,
      nationality: nationality[0] ?? null,
      marital_status: { id: worker.marital_status, name: worker.marital_status },
      work_experience: worker.work_experience,
      experience_date: worker.experience_date,
      region: region[0] ?? null,
      city: city[0] ?? null,
      country: country[0] ?? null,
      current_region: currentRegion[0] ?? null,
      current_city: currentCity[0] ?? null,
      profile: profile ?? null,
      positions: positionsList.map((p) => ({
        id: p.id,
        uuid: p.uuid,
        type: p.type,
        status: p.status,
        group: p.group,
        rank: p.rank,
        rate: p.rate,
        salary: p.salary,
        position_date: p.position_date,
        organization: p.organization_id
          ? { id: p.organization_id, name: p.org_name }
          : null,
        department: p.department_id
          ? { id: p.department_id, name: p.dept_name, level: p.dept_level }
          : null,
        position: p.position_id ? { id: p.position_id, name: p.pos_name } : null,
        contract: p.contract_id
          ? { id: p.contract_id, uuid: p.contract_uuid, number: p.contract_number }
          : null,
      })),
      another_profile: null,
    };
    void lang;
  }

  // GET /api/v1/hr/worker-new-careers/{uuid}.
  // uuid — worker uuid (Laravel: Worker::whereUuid).
  async newCareers(uuid: string) {
    const [worker] = await this.db
      .select({ id: workers.id })
      .from(workers)
      .where(and(eq(workers.uuid, uuid), notDeleted(workers)))
      .limit(1);
    if (!worker) return [];

    const rows = await this.db
      .select({
        id: worker_positions.id,
        uuid: worker_positions.uuid,
        type: worker_positions.type,
        status: worker_positions.status,
        organization_id: worker_positions.organization_id,
        department_id: worker_positions.department_id,
        position_id: worker_positions.position_id,
        contract_id: worker_positions.contract_id,
        position_date: worker_positions.position_date,
        org_name: organizations.name,
        dept_name: departments.name,
        pos_name: positionsTable.name,
        contract_uuid: contracts.uuid,
        contract_number: contracts.number,
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
      .leftJoin(contracts, eq(contracts.id, worker_positions.contract_id))
      .where(eq(worker_positions.worker_id, worker.id));

    return rows.map((p) => ({
      id: p.id,
      uuid: p.uuid,
      type: p.type,
      status: p.status,
      position_date: p.position_date,
      organization: p.organization_id
        ? { id: p.organization_id, name: p.org_name }
        : null,
      department: p.department_id
        ? { id: p.department_id, name: p.dept_name }
        : null,
      position: p.position_id ? { id: p.position_id, name: p.pos_name } : null,
      contract: p.contract_id
        ? { id: p.contract_id, uuid: p.contract_uuid, number: p.contract_number }
        : null,
    }));
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
    const [wp] = await this.db
      .select({
        id: worker_positions.id,
        worker_id: worker_positions.worker_id,
      })
      .from(worker_positions)
      .where(eq(worker_positions.uuid, uuid))
      .limit(1);
    if (!wp || !wp.worker_id) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.worker_position_not_found'),
      );
    }

    const [user] = await this.db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.worker_id, wp.worker_id))
      .limit(1);
    if (!user) {
      throw new BusinessException(400, this.i18n.t('messages.user_not_found'));
    }

    let roleId = dto.role_id;
    if (!roleId && dto.role) {
      const [r] = await this.db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.name, dto.role))
        .limit(1);
      if (!r) {
        throw new BusinessException(404, this.i18n.t('messages.not_found'));
      }
      roleId = r.id;
    }
    if (!roleId) {
      throw new BusinessException(422, this.i18n.t('messages.not_found'));
    }

    // Check if already attached.
    const [existing] = await this.db
      .select({ role_id: model_has_roles.role_id })
      .from(model_has_roles)
      .where(
        and(
          eq(model_has_roles.role_id, roleId),
          eq(model_has_roles.model_id, user.id),
          eq(model_has_roles.organization_id, dto.organization_id),
        ),
      )
      .limit(1);

    if (!existing) {
      await this.db.insert(model_has_roles).values({
        role_id: roleId,
        model_id: user.id,
        model_type: 'App\\Models\\User',
        organization_id: dto.organization_id,
      });
    }
  }

  // PUT /api/v1/hr/worker-positions/{uuid}/edit/detach-role.
  async detachRole(uuid: string, dto: AttachDetachRoleDto): Promise<void> {
    const [wp] = await this.db
      .select({
        id: worker_positions.id,
        worker_id: worker_positions.worker_id,
      })
      .from(worker_positions)
      .where(eq(worker_positions.uuid, uuid))
      .limit(1);
    if (!wp || !wp.worker_id) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.worker_position_not_found'),
      );
    }

    const [user] = await this.db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.worker_id, wp.worker_id))
      .limit(1);
    if (!user) return;

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
