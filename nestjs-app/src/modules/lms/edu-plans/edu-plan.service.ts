// Edu-plans service. Laravel: EduPlanController + EduPlanService.
// List: learning_center + specialization + subjects + workers_count + exams_count.

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray, max, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import {
  edu_plan_exams,
  edu_plan_subjects,
  edu_plan_workers,
  edu_plans,
  learning_centers,
  specializations,
  subjects as subjectsTable,
} from '@/db/schema';
import {
  lmsPaginate,
  readPaging,
} from '@/modules/lms/_shared/lms-paginate.util';
import { EduPlanMapper } from '@/modules/lms/edu-plans/edu-plan.mapper';
import type {
  DetachEduPlanWorkersDto,
  EduPlanListQueryDto,
  UpsertEduPlanDto,
} from '@/modules/lms/edu-plans/dto/edu-plan.dto';

@Injectable()
export class LmsEduPlanService {
  constructor(@InjectDb() private readonly db: DataSource) {}

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
    if (q.learning_center_id) {
      conditions.push(eq(edu_plans.learning_center_id, q.learning_center_id));
    }
    if (q.specialization_id) {
      conditions.push(eq(edu_plans.specialization_id, q.specialization_id));
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

  /** GET /lms/edu-plans/:eduPlanId/attached-workers — paginatsiya. */
  async attachedWorkers(eduPlanId: number, q: EduPlanListQueryDto) {
    const { page, perPage } = readPaging(q);
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
          .select()
          .from(edu_plan_workers)
          .where(where)
          .orderBy(desc(edu_plan_workers.id))
          .limit(limit)
          .offset(offset),
      mapper: (r) => ({
        id: r.id,
        edu_plan_id: r.edu_plan_id,
        worker_id: r.worker_id,
        worker_position_id: r.worker_position_id,
        group_id: r.group_id,
      }),
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
