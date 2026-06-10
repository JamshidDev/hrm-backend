// Edu-plans service. Laravel: EduPlanController + EduPlanService.
// List: learning_center + specialization + subjects + workers_count + exams_count.

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, ilike, inArray, max, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import {
  departments,
  edu_plan_exams,
  edu_plan_subjects,
  edu_plan_workers,
  edu_plans,
  learning_center_users,
  learning_centers,
  organizations,
  positions,
  specializations,
  subjects as subjectsTable,
  worker_phones,
  worker_positions,
  workers,
} from '@/db/schema';
import {
  lmsPaginate,
  readPaging,
} from '@/modules/lms/_shared/lms-paginate.util';
import { EduPlanMapper } from '@/modules/lms/edu-plans/edu-plan.mapper';
import { getShortPosition } from '@/modules/hr/_shared/position-helper';
import { MinioService } from '@/shared/minio/minio.service';
import { RequestContext } from '@/common/context/request.context';
import type {
  DetachEduPlanWorkersDto,
  EduPlanListQueryDto,
  UpsertEduPlanDto,
} from '@/modules/lms/edu-plans/dto/edu-plan.dto';

@Injectable()
export class LmsEduPlanService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly minio: MinioService,
    private readonly ctx: RequestContext,
  ) {}

  private async nextId(): Promise<number> {
    const [{ m }] = await this.db
      .select({ m: max(edu_plans.id) })
      .from(edu_plans);
    return Number(m ?? 0) + 1;
  }

  /** GET /lms/edu-plan — Laravel parity with batch joins. */
  async list(q: EduPlanListQueryDto) {
    const { page, perPage } = readPaging(q);
    const conditions = [notDeleted(edu_plans)];

    // Laravel EduPlan::scopeFilter — foydalanuvchi biriktirilgan learning
    // center'lar (learning_center_users) bilan cheklash (role-scope).
    const userId = this.ctx.user_or_fail.id;
    conditions.push(
      inArray(
        edu_plans.learning_center_id,
        this.db
          .select({ id: learning_center_users.learning_center_id })
          .from(learning_center_users)
          .where(eq(learning_center_users.user_id, userId)),
      ),
    );

    if (q.learning_center_id) {
      conditions.push(eq(edu_plans.learning_center_id, q.learning_center_id));
    }
    if (q.specialization_id) {
      conditions.push(eq(edu_plans.specialization_id, q.specialization_id));
    }
    // Nom bo'yicha qidiruv — Laravel whereLike('name', %search%). `search` yoki
    // `name` (frontend ba'zan `name` yuboradi).
    const nameSearch = q.search ?? q.name;
    if (nameSearch) {
      conditions.push(ilike(edu_plans.name, `%${nameSearch}%`));
    }
    // Laravel: whereYear/whereMonth('start_date', ...).
    if (q.year) {
      conditions.push(
        sql`EXTRACT(YEAR FROM ${edu_plans.start_date}) = ${q.year}`,
      );
    }
    if (q.month) {
      conditions.push(
        sql`EXTRACT(MONTH FROM ${edu_plans.start_date}) = ${q.month}`,
      );
    }
    const where = and(...conditions);

    return lmsPaginate({
      db: this.db,
      countTable: edu_plans,
      countWhere: where,
      page,
      perPage,
      query: ({ limit, offset }) =>
        this.db
          .select()
          .from(edu_plans)
          .where(where)
          .orderBy(desc(edu_plans.id))
          .limit(limit)
          .offset(offset),
      mapper: () => ({}) as never,
      mapList: async (rows) => {
        if (!rows.length) return [];
        const planIds = rows.map((r) => r.id);
        const lcIds = [...new Set(rows.map((r) => r.learning_center_id))];
        const specIds = [...new Set(rows.map((r) => r.specialization_id))];

        const [lcRows, specRows, subjLinks, workersC, examsC] =
          await Promise.all([
            this.db
              .select({ id: learning_centers.id, name: learning_centers.name })
              .from(learning_centers)
              .where(inArray(learning_centers.id, lcIds)),
            this.db
              .select({ id: specializations.id, name: specializations.name })
              .from(specializations)
              .where(inArray(specializations.id, specIds)),
            this.db
              .select({
                edu_plan_id: edu_plan_subjects.edu_plan_id,
                subject_id: edu_plan_subjects.subject_id,
              })
              .from(edu_plan_subjects)
              .where(inArray(edu_plan_subjects.edu_plan_id, planIds)),
            this.db
              .select({
                edu_plan_id: edu_plan_workers.edu_plan_id,
                total: count(),
              })
              .from(edu_plan_workers)
              .where(
                and(
                  inArray(edu_plan_workers.edu_plan_id, planIds),
                  notDeleted(edu_plan_workers),
                ),
              )
              .groupBy(edu_plan_workers.edu_plan_id),
            this.db
              .select({
                edu_plan_id: edu_plan_exams.edu_plan_id,
                total: count(),
              })
              .from(edu_plan_exams)
              .where(
                and(
                  inArray(edu_plan_exams.edu_plan_id, planIds),
                  notDeleted(edu_plan_exams),
                ),
              )
              .groupBy(edu_plan_exams.edu_plan_id),
          ]);

        const subjectIds = [...new Set(subjLinks.map((s) => s.subject_id))];
        const subjectRows = subjectIds.length
          ? await this.db
              .select({ id: subjectsTable.id, name: subjectsTable.name })
              .from(subjectsTable)
              .where(inArray(subjectsTable.id, subjectIds))
          : [];

        const lcMap: Record<number, { id: number; name: string | null }> = {};
        for (const lc of lcRows) lcMap[lc.id] = lc;
        const specMap: Record<number, { id: number; name: string | null }> = {};
        for (const s of specRows) specMap[s.id] = s;
        const subjectMap: Record<number, { id: number; name: string | null }> =
          {};
        for (const s of subjectRows) subjectMap[s.id] = s;

        const subjectsByPlan: Record<
          number,
          { id: number; name: string | null }[]
        > = {};
        for (const link of subjLinks) {
          const sub = subjectMap[link.subject_id];
          if (!sub) continue;
          (subjectsByPlan[link.edu_plan_id] ??= []).push(sub);
        }

        const workersCount: Record<number, number> = {};
        for (const w of workersC) workersCount[w.edu_plan_id] = Number(w.total);
        const examsCount: Record<number, number> = {};
        for (const e of examsC) examsCount[e.edu_plan_id] = Number(e.total);

        return rows.map((r) =>
          EduPlanMapper.toListItem(
            { ...r, name: r.name ?? '' },
            lcMap,
            specMap,
            subjectsByPlan,
            workersCount,
            examsCount,
          ),
        );
      },
    });
  }

  /** GET /lms/edu-plan/:id — Laravel show (raw model + serial). */
  async show(id: number) {
    const [row] = await this.db
      .select()
      .from(edu_plans)
      .where(eq(edu_plans.id, id))
      .limit(1);
    if (!row) throw new BusinessException(404, 'not_found');
    return {
      id: row.id,
      name: row.name,
      learning_center_id: row.learning_center_id,
      specialization_id: row.specialization_id,
      type: row.type,
      start_date: row.start_date,
      end_date: row.end_date,
      hours: row.hours,
      count_groups: row.count_groups,
      count_workers: row.count_workers,
      serial: row.serial,
    };
  }

  // Laravel: EduPlanController::store — create + if($request->subjects) sync.
  async create(dto: UpsertEduPlanDto) {
    const id = await this.nextId();
    await this.db.insert(edu_plans).values({
      id,
      name: dto.name,
      learning_center_id: dto.learning_center_id,
      specialization_id: dto.specialization_id,
      type: dto.type ?? 1,
      start_date: dto.start_date ?? null,
      end_date: dto.end_date ?? null,
      hours: dto.hours ?? null,
      count_groups: dto.count_groups ?? 1,
      count_workers: dto.count_workers ?? 30,
      serial: dto.serial ?? 1,
      created_at: sql`NOW()`,
      updated_at: sql`NOW()`,
    });
    // Pivot sync (Laravel `$eduPlan->subjects()->sync($request->subjects)`).
    if (dto.subjects?.length) await this.syncSubjects(id, dto.subjects);
    return { id };
  }

  // Laravel: EduPlanController::update — Eloquent partial update + subjects sync (if present).
  async update(id: number, dto: UpsertEduPlanDto) {
    const data: Record<string, unknown> = { updated_at: sql`NOW()` };
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.learning_center_id !== undefined)
      data.learning_center_id = dto.learning_center_id;
    if (dto.specialization_id !== undefined)
      data.specialization_id = dto.specialization_id;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.start_date !== undefined) data.start_date = dto.start_date;
    if (dto.end_date !== undefined) data.end_date = dto.end_date;
    if (dto.hours !== undefined) data.hours = dto.hours;
    if (dto.count_groups !== undefined) data.count_groups = dto.count_groups;
    if (dto.count_workers !== undefined) data.count_workers = dto.count_workers;
    if (dto.serial !== undefined) data.serial = dto.serial;

    const [row] = await this.db
      .update(edu_plans)
      .set(data)
      .where(eq(edu_plans.id, id))
      .returning({ id: edu_plans.id });
    if (!row) throw new BusinessException(404, 'not_found');
    // Pivot sync — faqat subjects[] payload'da bo'lsa (Laravel `if ($request->subjects)`).
    if (dto.subjects !== undefined) await this.syncSubjects(id, dto.subjects);
    return { id };
  }

  // Laravel: destroy — soft-delete + detach subjects.
  async remove(id: number) {
    const [row] = await this.db
      .update(edu_plans)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(edu_plans.id, id))
      .returning({ id: edu_plans.id });
    if (!row) throw new BusinessException(404, 'not_found');
    // Pivot clear (Laravel `$eduPlan->subjects()->detach()`).
    await this.db
      .delete(edu_plan_subjects)
      .where(eq(edu_plan_subjects.edu_plan_id, id));
  }

  // BelongsToMany::sync — delete-then-insert (Laravel parity).
  private async syncSubjects(
    eduPlanId: number,
    subjectIds: number[] | undefined,
  ): Promise<void> {
    await this.db
      .delete(edu_plan_subjects)
      .where(eq(edu_plan_subjects.edu_plan_id, eduPlanId));
    const ids = [
      ...new Set(
        (subjectIds ?? [])
          .map((n) => Number(n))
          .filter((n) => Number.isInteger(n) && n > 0),
      ),
    ];
    if (!ids.length) return;
    await this.db
      .insert(edu_plan_subjects)
      .values(ids.map((sid) => ({ edu_plan_id: eduPlanId, subject_id: sid })));
  }

  /**
   * GET /lms/edu-plans/:eduPlanId/attached-workers — Laravel
   * EduPlanController::attachedWorkersToEduPlan + AttachedWorkersResource.
   * Shakl: {id, worker_position: {id, worker:{id,photo,last_name,first_name,
   * middle_name}, phones:[...], post_short_name, organization:{id,name,group}}}.
   */
  async attachedWorkers(eduPlanId: number, q: EduPlanListQueryDto) {
    const { page, perPage } = readPaging(q);
    const lang = this.ctx.lang;
    const where = and(
      eq(edu_plan_workers.edu_plan_id, eduPlanId),
      notDeleted(edu_plan_workers),
    );

    return lmsPaginate({
      db: this.db,
      countTable: edu_plan_workers,
      countWhere: where,
      page,
      perPage,
      query: ({ limit, offset }) =>
        this.db
          .select({
            id: edu_plan_workers.id,
            wp_id: worker_positions.id,
            wp_type: worker_positions.type,
            position_name: positions.name,
            department_name: departments.name,
            department_level: departments.level,
            worker_id: workers.id,
            last_name: workers.last_name,
            first_name: workers.first_name,
            middle_name: workers.middle_name,
            photo: workers.photo,
            org_id: organizations.id,
            org_name: organizations.name,
            org_name_ru: organizations.name_ru,
            org_name_en: organizations.name_en,
            org_full_name: organizations.full_name,
            org_group: organizations.group,
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
          .leftJoin(positions, eq(positions.id, worker_positions.position_id))
          .where(where)
          // Laravel: orderByDesc('edu_plan_id').
          .orderBy(desc(edu_plan_workers.edu_plan_id))
          .limit(limit)
          .offset(offset),
      mapper: () => ({}) as never,
      mapList: async (rows) => {
        // Telefon raqamlari — HasMany, batch (N+1 oldini olish).
        const workerIds = [
          ...new Set(
            rows.map((r) => r.worker_id).filter((v): v is number => !!v),
          ),
        ];
        const phoneRows = workerIds.length
          ? await this.db
              .select({
                worker_id: worker_phones.worker_id,
                phone: worker_phones.phone,
              })
              .from(worker_phones)
              .where(inArray(worker_phones.worker_id, workerIds))
          : [];
        const phoneMap = new Map<number, string[]>();
        for (const p of phoneRows) {
          const arr = phoneMap.get(p.worker_id) ?? [];
          if (p.phone != null) arr.push(String(p.phone));
          phoneMap.set(p.worker_id, arr);
        }

        return Promise.all(
          rows.map(async (r) => ({
            id: r.id,
            worker_position: r.wp_id
              ? {
                  id: r.wp_id,
                  worker: r.worker_id
                    ? {
                        id: r.worker_id,
                        photo: await this.minio.fileUrl(r.photo),
                        last_name: r.last_name,
                        first_name: r.first_name,
                        middle_name: r.middle_name,
                      }
                    : null,
                  phones: r.worker_id ? (phoneMap.get(r.worker_id) ?? []) : [],
                  post_short_name: getShortPosition({
                    position_name: r.position_name,
                    department_name: r.department_name,
                    department_level: r.department_level,
                    organization_full_name: r.org_full_name,
                  }),
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
                }
              : null,
          })),
        );
      },
    });
  }

  async detachWorkers(eduPlanId: number, dto: DetachEduPlanWorkersDto) {
    await this.db
      .update(edu_plan_workers)
      .set({ deleted_at: sql`NOW()` })
      .where(
        and(
          eq(edu_plan_workers.edu_plan_id, eduPlanId),
          inArray(edu_plan_workers.worker_id, dto.worker_ids),
        ),
      );
    return { success: true, detached: dto.worker_ids.length };
  }
}
