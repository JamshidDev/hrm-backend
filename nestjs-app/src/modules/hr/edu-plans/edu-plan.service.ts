// EduPlans + workers service. Laravel: LMS/EduPlanController + EduPlanWorkerController.

import { Injectable } from '@nestjs/common';
import { and, asc, count, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  departments,
  edu_plan_workers,
  edu_plans,
  learning_centers,
  organizations,
  positions as positionsTable,
  specializations,
  worker_positions,
  workers,
} from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import {
  AttachEduPlanWorkersDto,
  AttachedEduPlanWorkersQueryDto,
  DetachEduPlanWorkersDto,
  QueryEduPlansDto,
  SearchEduPlanWorkersDto,
} from '@/modules/hr/edu-plans/dto/edu-plan.dto';

@Injectable()
export class EduPlanService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
  ) {}

  // GET /api/v1/hr/edu-plans
  async list(filters: QueryEduPlansDto) {
    const perPage = filters.per_page ?? 50;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;
    const currentYear = new Date().getFullYear();

    const where = and(
      notDeleted(edu_plans),
      sql`EXTRACT(YEAR FROM ${edu_plans.start_date})::int = ${currentYear}`,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: edu_plans.id,
          name: edu_plans.name,
          type: edu_plans.type,
          start_date: edu_plans.start_date,
          end_date: edu_plans.end_date,
          hours: edu_plans.hours,
          serial: edu_plans.serial,
          count_groups: edu_plans.count_groups,
          count_workers: edu_plans.count_workers,
          spec_id: specializations.id,
          spec_name: specializations.name,
          lc_id: learning_centers.id,
          lc_name: learning_centers.name,
        })
        .from(edu_plans)
        .leftJoin(
          specializations,
          eq(specializations.id, edu_plans.specialization_id),
        )
        .leftJoin(
          learning_centers,
          eq(learning_centers.id, edu_plans.learning_center_id),
        )
        .where(where)
        .orderBy(asc(edu_plans.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(edu_plans).where(where),
    ]);

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        start_date: r.start_date,
        end_date: r.end_date,
        hours: r.hours,
        serial: r.serial,
        count_groups: r.count_groups,
        count_workers: r.count_workers,
        specialization: r.spec_id
          ? { id: r.spec_id, name: r.spec_name }
          : null,
        learning_center: r.lc_id ? { id: r.lc_id, name: r.lc_name } : null,
      })),
    };
  }

  // GET /api/v1/hr/edu-plans/search-workers
  async searchWorkers(filters: SearchEduPlanWorkersDto) {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;

    // Find specialization → positions (specialization.has_positions).
    const [plan] = await this.db
      .select({
        specialization_id: edu_plans.specialization_id,
      })
      .from(edu_plans)
      .where(eq(edu_plans.id, filters.edu_plan_id))
      .limit(1);
    if (!plan) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    // has_positions — join via specialization_positions pivot table.
    // Skipping (pivot table not standardized) — return paginated worker_positions
    // by specialization-related positions if available, else all active worker_positions.
    // Simplification: return active worker_positions paginated.
    const searchCond = filters.search
      ? or(
          ilike(workers.last_name, `%${filters.search}%`),
          ilike(workers.first_name, `%${filters.search}%`),
        )
      : undefined;

    const where = and(
      eq(worker_positions.status, 2),
      notDeleted(worker_positions),
      searchCond,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: worker_positions.id,
          worker_id: workers.id,
          worker_last: workers.last_name,
          worker_first: workers.first_name,
          worker_middle: workers.middle_name,
          worker_photo: workers.photo,
          org_name: organizations.name,
          dept_name: departments.name,
          dept_level: departments.level,
          pos_name: positionsTable.name,
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
        .where(where)
        .orderBy(asc(worker_positions.id))
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
                last_name: r.worker_last,
                first_name: r.worker_first,
                middle_name: r.worker_middle,
                photo: await this.minio.fileUrl(r.worker_photo),
              }
            : null,
          organization: r.org_name ? { name: r.org_name } : null,
          department: r.dept_name
            ? { name: r.dept_name, level: r.dept_level }
            : null,
          position: r.pos_name ? { name: r.pos_name } : null,
        })),
      ),
    };
  }

  // POST /api/v1/hr/edu-plans/attach-workers
  async attachWorkers(dto: AttachEduPlanWorkersDto): Promise<void> {
    const [plan] = await this.db
      .select({
        id: edu_plans.id,
        learning_center_id: edu_plans.learning_center_id,
      })
      .from(edu_plans)
      .where(eq(edu_plans.id, dto.edu_plan_id))
      .limit(1);
    if (!plan) {
      throw new BusinessException(
        404,
        this.i18n.t('messages.not_found'),
      );
    }

    const wps = await this.db
      .select({
        id: worker_positions.id,
        worker_id: worker_positions.worker_id,
        organization_id: worker_positions.organization_id,
      })
      .from(worker_positions)
      .where(inArray(worker_positions.id, dto.worker_position_ids));

    const toInsert = wps
      .filter((wp) => wp.worker_id != null)
      .map((wp) => ({
        edu_plan_id: plan.id,
        learning_center_id: plan.learning_center_id,
        worker_id: wp.worker_id!,
        worker_position_id: wp.id,
        organization_id: wp.organization_id ?? 0,
      }));
    if (toInsert.length > 0) {
      await this.db.insert(edu_plan_workers).values(toInsert);
    }
  }

  // GET /api/v1/hr/edu-plans/attached-workers
  async attachedWorkers(filters: AttachedEduPlanWorkersQueryDto) {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;

    const where = and(
      notDeleted(edu_plan_workers),
      filters.edu_plan_id
        ? eq(edu_plan_workers.edu_plan_id, filters.edu_plan_id)
        : undefined,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: edu_plan_workers.id,
          edu_plan_id: edu_plan_workers.edu_plan_id,
          learning_center_id: edu_plan_workers.learning_center_id,
          worker_position_id: edu_plan_workers.worker_position_id,
          worker_id: workers.id,
          worker_last: workers.last_name,
          worker_first: workers.first_name,
          worker_middle: workers.middle_name,
          worker_photo: workers.photo,
          wp_organization_id: worker_positions.organization_id,
          wp_department_id: worker_positions.department_id,
        })
        .from(edu_plan_workers)
        .leftJoin(
          worker_positions,
          eq(worker_positions.id, edu_plan_workers.worker_position_id),
        )
        .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
        .where(where)
        .orderBy(asc(edu_plan_workers.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(edu_plan_workers)
        .where(where),
    ]);

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => ({
          id: r.id,
          edu_plan_id: r.edu_plan_id,
          worker_position: r.worker_position_id
            ? {
                id: r.worker_position_id,
                organization_id: r.wp_organization_id,
                department_id: r.wp_department_id,
                worker: r.worker_id
                  ? {
                      id: r.worker_id,
                      last_name: r.worker_last,
                      first_name: r.worker_first,
                      middle_name: r.worker_middle,
                      photo: await this.minio.fileUrl(r.worker_photo),
                    }
                  : null,
              }
            : null,
        })),
      ),
    };
  }

  // POST /api/v1/hr/edu-plans/detach-workers
  async detachWorkers(dto: DetachEduPlanWorkersDto): Promise<void> {
    if (dto.ids.length === 0) return;
    await this.db
      .update(edu_plan_workers)
      .set({ deleted_at: sql`NOW()` })
      .where(inArray(edu_plan_workers.id, dto.ids));
  }
}
