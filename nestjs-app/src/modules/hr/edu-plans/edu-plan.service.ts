// EduPlans + workers service. Laravel: LMS/EduPlanController + EduPlanWorkerController.

import { Injectable } from '@nestjs/common';
import { and, asc, count, eq, inArray, isNull, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  departments,
  edu_plan_workers,
  edu_plans,
  learning_centers,
  lms_certificates,
  organizations,
  positions as positionsTable,
  specializations,
  worker_phones,
  worker_positions,
  workers,
} from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { buildWorkerSearchCond } from '@/modules/hr/_shared/worker-search.helper';
import { getShortPosition } from '@/modules/hr/_shared/position-helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import {
  AttachEduPlanWorkersDto,
  AttachedEduPlanWorkersQueryDto,
  DetachEduPlanWorkersDto,
  QueryEduPlansDto,
  SearchEduPlanWorkersDto,
} from '@/modules/hr/edu-plans/dto/edu-plan.dto';

// Laravel EduPlanTypeEnum — type → nom (til bo'yicha).
const EDU_PLAN_TYPE: Record<string, Record<number, string>> = {
  uz: { 1: 'Malaka oshirish', 2: 'Qayta tayyorlash' },
  ru: { 1: 'Повышение квалификации', 2: 'Переподготовка' },
  en: { 1: 'Professional Development', 2: 'Retraining' },
};

// ConfirmationStatusEnum::SUCCESS — sertifikat faqat shu holatda ko'rsatiladi.
const CONFIRMATION_SUCCESS = 3;

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
        specialization: r.spec_id ? { id: r.spec_id, name: r.spec_name } : null,
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
    // Laravel scopeSearchByFullName parity — split by space, AND between terms.
    const searchCond = buildWorkerSearchCond(filters.search);

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
        .leftJoin(
          departments,
          eq(departments.id, worker_positions.department_id),
        )
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
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
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
    const lang = this.ctx.lang;

    // Laravel: when(search) → whereHas('worker', searchByFullName).
    const searchCond = buildWorkerSearchCond(filters.search);

    const where = and(
      notDeleted(edu_plan_workers),
      filters.edu_plan_id
        ? eq(edu_plan_workers.edu_plan_id, filters.edu_plan_id)
        : undefined,
      searchCond,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: edu_plan_workers.id,
          worker_id: edu_plan_workers.worker_id,
          wp_id: worker_positions.id,
          w_id: workers.id,
          w_last: workers.last_name,
          w_first: workers.first_name,
          w_middle: workers.middle_name,
          w_photo: workers.photo,
          org_id: organizations.id,
          org_name: organizations.name,
          org_name_ru: organizations.name_ru,
          org_name_en: organizations.name_en,
          org_group: organizations.group,
          org_full_name: organizations.full_name,
          dept_name: departments.name,
          dept_level: departments.level,
          pos_name: positionsTable.name,
          ep_id: edu_plans.id,
          ep_name: edu_plans.name,
          ep_type: edu_plans.type,
          ep_start_date: edu_plans.start_date,
          ep_hours: edu_plans.hours,
          ep_count_groups: edu_plans.count_groups,
          ep_count_workers: edu_plans.count_workers,
          spec_id: specializations.id,
          spec_name: specializations.name,
          lc_id: learning_centers.id,
          lc_name: learning_centers.name,
          lc_code: learning_centers.code,
        })
        .from(edu_plan_workers)
        .leftJoin(
          worker_positions,
          eq(worker_positions.id, edu_plan_workers.worker_position_id),
        )
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
        .leftJoin(edu_plans, eq(edu_plans.id, edu_plan_workers.edu_plan_id))
        .leftJoin(
          specializations,
          eq(specializations.id, edu_plans.specialization_id),
        )
        .leftJoin(
          learning_centers,
          eq(learning_centers.id, edu_plan_workers.learning_center_id),
        )
        .where(where)
        .orderBy(asc(edu_plan_workers.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(edu_plan_workers)
        .leftJoin(
          worker_positions,
          eq(worker_positions.id, edu_plan_workers.worker_position_id),
        )
        .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
        .where(where),
    ]);

    // Telefonlar va sertifikatlar — batch (N+1 yo'q).
    const workerIds = [...new Set(rows.map((r) => r.worker_id))];
    const epwIds = rows.map((r) => r.id);

    const [phoneRows, certRows] = await Promise.all([
      workerIds.length
        ? this.db
            .select({
              worker_id: worker_phones.worker_id,
              phone: worker_phones.phone,
            })
            .from(worker_phones)
            .where(inArray(worker_phones.worker_id, workerIds))
        : [],
      epwIds.length
        ? this.db
            .select()
            .from(lms_certificates)
            // Laravel: faqat confirmation=SUCCESS bo'lgan sertifikat ko'rsatiladi.
            .where(
              and(
                inArray(lms_certificates.edu_plan_worker_id, epwIds),
                eq(lms_certificates.confirmation, CONFIRMATION_SUCCESS),
                isNull(lms_certificates.deleted_at),
              ),
            )
        : [],
    ]);

    const phonesByWorker = new Map<number, number[]>();
    for (const p of phoneRows) {
      if (p.phone == null) continue;
      const list = phonesByWorker.get(p.worker_id) ?? [];
      list.push(p.phone);
      phonesByWorker.set(p.worker_id, list);
    }
    const certByEpw = new Map<number, (typeof certRows)[number]>();
    for (const c of certRows) {
      if (c.edu_plan_worker_id != null) certByEpw.set(c.edu_plan_worker_id, c);
    }

    const orgName = (
      name: string | null,
      ru: string | null,
      en: string | null,
    ): string | null =>
      lang === 'ru' ? (ru ?? name) : lang === 'en' ? (en ?? name) : name;

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => {
          const cert = certByEpw.get(r.id);
          return {
            id: r.id,
            worker_position: r.wp_id
              ? {
                  id: r.wp_id,
                  worker: r.w_id
                    ? {
                        id: r.w_id,
                        last_name: r.w_last,
                        first_name: r.w_first,
                        middle_name: r.w_middle,
                        photo: await this.minio.fileUrl(r.w_photo),
                      }
                    : null,
                  phones: phonesByWorker.get(r.worker_id) ?? [],
                  post_short_name: getShortPosition({
                    position_name: r.pos_name,
                    department_name: r.dept_name,
                    department_level: r.dept_level,
                    organization_full_name: r.org_full_name,
                  }),
                  organization: r.org_id
                    ? {
                        id: r.org_id,
                        name: orgName(r.org_name, r.org_name_ru, r.org_name_en),
                        group: r.org_group ?? false,
                      }
                    : null,
                }
              : null,
            learning_center: r.lc_id
              ? { id: r.lc_id, name: r.lc_name, code: r.lc_code }
              : null,
            edu_plan: r.ep_id
              ? {
                  id: r.ep_id,
                  name: r.ep_name,
                  specialization: r.spec_id
                    ? { id: r.spec_id, name: r.spec_name }
                    : null,
                  type: {
                    id: r.ep_type,
                    name: this.eduPlanTypeName(r.ep_type, lang),
                  },
                  start_date: r.ep_start_date,
                  hours: r.ep_hours,
                  count_groups: r.ep_count_groups,
                  count_workers: r.ep_count_workers,
                }
              : null,
            certificate: cert
              ? {
                  id: cert.id,
                  cert_from: cert.cert_from,
                  cert_to: cert.cert_to,
                  serial: cert.serial,
                  number: cert.number,
                  start_exam_result: cert.start_exam_result,
                  end_exam_result: cert.end_exam_result,
                  confirmation_file: await this.minio.fileUrl(
                    cert.confirmation_file,
                  ),
                  generate: cert.generate,
                  confirmation: {
                    id: cert.confirmation,
                    name: this.trMessage(
                      'messages.confirmation.status.success',
                      lang,
                    ),
                  },
                }
              : null,
          };
        }),
      ),
    };
  }

  // i18n xabar — string qaytaradi.
  private trMessage(key: string, lang: string): string {
    const v: unknown = this.i18n.t(key, { lang });
    return typeof v === 'string' ? v : '';
  }

  // EduPlanTypeEnum — type id → nom (til bo'yicha).
  private eduPlanTypeName(type: number | null, lang: string): string {
    if (type == null) return '';
    return (EDU_PLAN_TYPE[lang] ?? EDU_PLAN_TYPE.uz)[type] ?? '';
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
