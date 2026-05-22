// VacationSchedule service. Laravel: VacationScheduleController::index().

import { Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
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
  departments,
  organizations,
  positions as positionsTable,
  vacation_schedules,
  worker_positions,
  workers,
} from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { buildWorkerSearchCond } from '@/modules/hr/_shared/worker-search.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import {
  CreateVacationScheduleDto,
  QueryVacationScheduleDto,
  UpdateVacationScheduleDto,
  VacationScheduleListResponseDto,
} from '@/modules/hr/vacation-schedules/dto/vacation-schedule.dto';

@Injectable()
export class VacationScheduleService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
    private readonly i18n: I18nService,
  ) {}

  async findAll(
    filters: QueryVacationScheduleDto,
  ): Promise<VacationScheduleListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;

    const orgIds = filters.organizations
      ? filters.organizations.split(',').map((s) => Number(s)).filter((n) => !Number.isNaN(n))
      : [];

    const where = and(
      isNull(vacation_schedules.deleted_at),
      filters.organization_id
        ? eq(vacation_schedules.organization_id, filters.organization_id)
        : undefined,
      orgIds.length > 0
        ? inArray(vacation_schedules.organization_id, orgIds)
        : undefined,
    );

    const offset = (page - 1) * perPage;

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: vacation_schedules.id,
          month: vacation_schedules.month,
          org_id: organizations.id,
          org_name: organizations.name,
          org_name_ru: organizations.name_ru,
          org_name_en: organizations.name_en,
          org_group: organizations.group,
          worker_id: workers.id,
          worker_photo: workers.photo,
          worker_last: workers.last_name,
          worker_first: workers.first_name,
          worker_middle: workers.middle_name,
        })
        .from(vacation_schedules)
        .leftJoin(
          organizations,
          eq(organizations.id, vacation_schedules.organization_id),
        )
        .leftJoin(workers, eq(workers.id, vacation_schedules.worker_id))
        .where(where)
        .orderBy(asc(vacation_schedules.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(vacation_schedules).where(where),
    ]);

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => ({
          id: r.id,
          organization: r.org_id
            ? {
                id: r.org_id,
                name:
                  lang === 'ru'
                    ? (r.org_name_ru ?? r.org_name)
                    : lang === 'en'
                      ? (r.org_name_en ?? r.org_name)
                      : r.org_name,
                group: r.org_group ?? false,
              }
            : null,
          worker: r.worker_id
            ? {
                id: r.worker_id,
                photo: await this.minio.fileUrl(r.worker_photo),
                last_name: r.worker_last,
                first_name: r.worker_first,
                middle_name: r.worker_middle,
              }
            : null,
          month: r.month,
        })),
      ),
    };
  }

  // POST /api/v1/hr/vacation-schedules
  async create(dto: CreateVacationScheduleDto): Promise<void> {
    const [wp] = await this.db
      .select({ id: worker_positions.id, worker_id: worker_positions.worker_id })
      .from(worker_positions)
      .where(eq(worker_positions.id, dto.worker_position_id))
      .limit(1);
    if (!wp || !wp.worker_id) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    // Upsert: organization_id + worker_id (Laravel updateOrCreate).
    const [existing] = await this.db
      .select({ id: vacation_schedules.id })
      .from(vacation_schedules)
      .where(
        and(
          eq(vacation_schedules.organization_id, dto.organization_id),
          eq(vacation_schedules.worker_id, wp.worker_id),
          notDeleted(vacation_schedules),
        ),
      )
      .limit(1);

    if (existing) {
      await this.db
        .update(vacation_schedules)
        .set({
          worker_position_id: dto.worker_position_id,
          month: dto.month,
          updated_at: sql`NOW()`,
        })
        .where(eq(vacation_schedules.id, existing.id));
    } else {
      await this.db.insert(vacation_schedules).values({
        organization_id: dto.organization_id,
        worker_id: wp.worker_id,
        worker_position_id: dto.worker_position_id,
        month: dto.month,
      });
    }
  }

  // PUT /api/v1/hr/vacation-schedules/{id}
  async update(id: number, dto: UpdateVacationScheduleDto): Promise<void> {
    const [row] = await this.db
      .select({ id: vacation_schedules.id })
      .from(vacation_schedules)
      .where(and(eq(vacation_schedules.id, id), notDeleted(vacation_schedules)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    const setData: Record<string, unknown> = { updated_at: sql`NOW()` };
    if (dto.month != null) setData.month = dto.month;
    await this.db
      .update(vacation_schedules)
      .set(setData)
      .where(eq(vacation_schedules.id, id));
  }

  // DELETE /api/v1/hr/vacation-schedules/{id}
  async remove(id: number): Promise<void> {
    const [row] = await this.db
      .select({ id: vacation_schedules.id })
      .from(vacation_schedules)
      .where(and(eq(vacation_schedules.id, id), notDeleted(vacation_schedules)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    await this.db
      .update(vacation_schedules)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(vacation_schedules.id, id));
  }

  // GET /api/v1/hr/vacation-schedules-not-included
  // Worker positions whose contract has no vacation_schedule (workers not yet in schedule).
  async noVacationScheduleWorkers(filters: QueryVacationScheduleDto) {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;
    const lang = this.ctx.lang;

    // Laravel scopeSearchByFullName parity.
    const searchCond = buildWorkerSearchCond(filters.search);

    // worker_positions where worker NOT IN (workers in vacation_schedules).
    const where = and(
      notDeleted(worker_positions),
      sql`NOT EXISTS (
        SELECT 1 FROM ${vacation_schedules} vs
        WHERE vs.worker_id = ${worker_positions.worker_id}
          AND vs.deleted_at IS NULL
      )`,
      searchCond,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: worker_positions.id,
          worker_id: workers.id,
          worker_uuid: workers.uuid,
          worker_last: workers.last_name,
          worker_first: workers.first_name,
          worker_middle: workers.middle_name,
          worker_photo: workers.photo,
          worker_birthday: workers.birthday,
          dept_name: departments.name,
          dept_level: departments.level,
          pos_name: positionsTable.name,
          org_id: organizations.id,
          org_name: organizations.name,
          org_group: organizations.group,
        })
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
        .orderBy(asc(worker_positions.organization_id), asc(worker_positions.department_id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(worker_positions)
        .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
        .where(where),
    ]);

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => ({
          id: r.id,
          worker: r.worker_id
            ? {
                id: r.worker_id,
                uuid: r.worker_uuid,
                last_name: r.worker_last,
                first_name: r.worker_first,
                middle_name: r.worker_middle,
                photo: await this.minio.fileUrl(r.worker_photo),
                birthday: r.worker_birthday,
              }
            : null,
          department: r.dept_name
            ? { name: r.dept_name, level: r.dept_level }
            : null,
          position: r.pos_name ? { name: r.pos_name } : null,
          organization: r.org_id
            ? { id: r.org_id, name: r.org_name, group: r.org_group ?? false }
            : null,
        })),
      ),
    };
    void lang;
  }
}
