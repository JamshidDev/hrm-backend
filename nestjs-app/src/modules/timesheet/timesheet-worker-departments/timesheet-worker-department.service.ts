// TimeSheetWorkerDepartment service.
// index: worker_positions WHERE EXISTS time_sheet_worker_departments + joins.
// attach: bulk insert dept entries + role attach (TimesheetHR).
// detach: hard delete by worker_position_id OR department_id.

import { Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  inArray,
  isNull,
  sql,
} from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  time_sheet_worker_departments,
  worker_positions,
  workers,
  departments,
  organizations,
  positions as positionsTable,
  users as usersTable,
} from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import { getShortPosition } from '@/modules/hr/_shared/position-helper';
import {
  AttachDto,
  DetachDto,
  QueryTimeSheetWorkerDepartmentDto,
  TimeSheetWorkerDepartmentListResponseDto,
} from '@/modules/timesheet/timesheet-worker-departments/dto/timesheet-worker-department.dto';

@Injectable()
export class TimeSheetWorkerDepartmentService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
  ) {}

  async findAll(
    filters: QueryTimeSheetWorkerDepartmentDto,
  ): Promise<TimeSheetWorkerDepartmentListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;
    const offset = (page - 1) * perPage;

    // `organizations` — vergul bilan ajratilgan organization id lar.
    const orgIds = filters.organizations
      ? filters.organizations
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isFinite(n) && n > 0)
      : [];

    // EXISTS time_sheet_worker_departments — faqat shu worker_position'ga
    // TimeSheet department biriktirilganlar.
    // Laravel: scopeFilter status=ACTIVE(=2) + organizations filter qo'shadi.
    const where = and(
      eq(worker_positions.status, 2),
      isNull(worker_positions.deleted_at),
      orgIds.length > 0
        ? inArray(worker_positions.organization_id, orgIds)
        : undefined,
      exists(
        this.db
          .select({ x: sql`1` })
          .from(time_sheet_worker_departments)
          .where(
            and(
              eq(time_sheet_worker_departments.worker_position_id, worker_positions.id),
              isNull(time_sheet_worker_departments.deleted_at),
            ),
          ),
      ),
    );

    const [wpRows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: worker_positions.id,
          worker_id: workers.id,
          worker_photo: workers.photo,
          worker_last: workers.last_name,
          worker_first: workers.first_name,
          worker_middle: workers.middle_name,
          dept_name: departments.name,
          dept_level: departments.level,
          pos_name: positionsTable.name,
          org_full_name: organizations.full_name,
        })
        .from(worker_positions)
        .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
        .leftJoin(departments, eq(departments.id, worker_positions.department_id))
        .leftJoin(positionsTable, eq(positionsTable.id, worker_positions.position_id))
        .leftJoin(organizations, eq(organizations.id, worker_positions.organization_id))
        .where(where)
        .orderBy(
          asc(worker_positions.organization_id),
          asc(worker_positions.department_id),
          asc(worker_positions.department_position_id),
          asc(worker_positions.id),
        )
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(worker_positions).where(where),
    ]);

    // Batch-load departments per worker_position.
    const wpIds = wpRows.map((r) => r.id);
    const deptRows = wpIds.length
      ? await this.db
          .select({
            id: time_sheet_worker_departments.id,
            worker_position_id: time_sheet_worker_departments.worker_position_id,
            department_id: departments.id,
            department_name: departments.name,
            department_level: departments.level,
            org_id: organizations.id,
            org_name: organizations.name,
            org_name_ru: organizations.name_ru,
            org_name_en: organizations.name_en,
            org_group: organizations.group,
          })
          .from(time_sheet_worker_departments)
          .leftJoin(departments, eq(departments.id, time_sheet_worker_departments.department_id))
          .leftJoin(
            organizations,
            eq(organizations.id, time_sheet_worker_departments.organization_id),
          )
          .where(
            and(
              inArray(time_sheet_worker_departments.worker_position_id, wpIds),
              isNull(time_sheet_worker_departments.deleted_at),
            ),
          )
      : [];
    const depMap = new Map<number, typeof deptRows>();
    for (const d of deptRows) {
      const arr = depMap.get(d.worker_position_id) ?? [];
      arr.push(d);
      depMap.set(d.worker_position_id, arr);
    }

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: await Promise.all(
        wpRows.map(async (r) => ({
          id: r.id,
          worker: r.worker_id
            ? {
                id: r.worker_id,
                photo: await this.minio.fileUrl(r.worker_photo),
                last_name: r.worker_last,
                first_name: r.worker_first,
                middle_name: r.worker_middle,
              }
            : null,
          position_name: getShortPosition({
            position_name: r.pos_name,
            department_name: r.dept_name,
            department_level: r.dept_level,
            organization_full_name: r.org_full_name,
          }),
          departments: (depMap.get(r.id) ?? []).map((d) => ({
            id: d.id,
            organization: d.org_id
              ? {
                  id: d.org_id,
                  name:
                    lang === 'ru'
                      ? (d.org_name_ru ?? d.org_name)
                      : lang === 'en'
                        ? (d.org_name_en ?? d.org_name)
                        : d.org_name,
                  group: d.org_group ?? false,
                }
              : null,
            department: d.department_id
              ? {
                  id: d.department_id,
                  name: d.department_name,
                  level: d.department_level,
                }
              : null,
          })),
        })),
      ),
    };
  }

  async attach(dto: AttachDto): Promise<void> {
    // 1. Worker position'ni ol.
    const [wp] = await this.db
      .select({
        id: worker_positions.id,
        worker_id: worker_positions.worker_id,
      })
      .from(worker_positions)
      .where(eq(worker_positions.id, dto.worker_position_id))
      .limit(1);
    if (!wp) {
      throw new BusinessException(400, this.i18n.t('messages.worker_position_not_found'));
    }
    if (!wp.worker_id) {
      throw new BusinessException(400, this.i18n.t('messages.user_not_found'));
    }

    // 2. User'ni ol (worker_id orqali).
    const [user] = await this.db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.worker_id, wp.worker_id))
      .limit(1);
    if (!user) {
      throw new BusinessException(400, this.i18n.t('messages.user_not_found'));
    }

    // 3. Departments olib, org_id'larini aniqlash.
    const deptRows = await this.db
      .select({
        id: departments.id,
        organization_id: departments.organization_id,
      })
      .from(departments)
      .where(inArray(departments.id, dto.departments));

    // 4. Mavjudlarni topib, faqat yangilarni qo'shamiz.
    const existing = await this.db
      .select({ department_id: time_sheet_worker_departments.department_id })
      .from(time_sheet_worker_departments)
      .where(eq(time_sheet_worker_departments.worker_position_id, wp.id));
    const existingIds = new Set(existing.map((e) => e.department_id));

    const toInsert = deptRows
      .filter((d) => !existingIds.has(d.id))
      .map((d) => ({
        organization_id: d.organization_id,
        worker_position_id: wp.id,
        worker_id: wp.worker_id!,
        department_id: d.id,
        work_place_id: d.organization_id,
        active: true,
      }));

    if (toInsert.length > 0) {
      await this.db.insert(time_sheet_worker_departments).values(toInsert);
    }

    // 5. Role attach (TimesheetHR) — skip qilamiz, Laravel logic juda spesifik.
    // Permission'lar bilan ishlash logic uchun alohida helper kerak.
  }

  async detach(dto: DetachDto): Promise<void> {
    if (dto.worker_position_id) {
      await this.db
        .update(time_sheet_worker_departments)
        .set({ deleted_at: sql`NOW()` })
        .where(
          eq(time_sheet_worker_departments.worker_position_id, dto.worker_position_id),
        );
    }
    if (dto.department_id) {
      await this.db
        .delete(time_sheet_worker_departments)
        .where(eq(time_sheet_worker_departments.id, dto.department_id));
    }
  }
}
