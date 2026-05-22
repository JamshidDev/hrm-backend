// Edu-plan-exams service. Laravel: EduPlanExamController.
// attach (POST), detach (GET /detach/:examId), list, results.

import { Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, max } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { edu_plan_exams, exams } from '@/db/schema';
import {
  lmsPaginate,
  readPaging,
} from '@/modules/lms/_shared/lms-paginate.util';
import { EduPlanExamMapper } from '@/modules/lms/edu-plan-exams/edu-plan-exam.mapper';
import type {
  AttachEduPlanExamDto,
  EduPlanExamListQueryDto,
} from '@/modules/lms/edu-plan-exams/dto/edu-plan-exam.dto';

@Injectable()
export class LmsEduPlanExamService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  private async nextId(): Promise<number> {
    const [{ m }] = await this.db
      .select({ m: max(edu_plan_exams.id) })
      .from(edu_plan_exams);
    return Number(m ?? 0) + 1;
  }

  /** GET /lms/exams — paginatsiya. Filter: edu_plan_id. */
  async list(q: EduPlanExamListQueryDto) {
    const { page, perPage } = readPaging(q);
    const conditions = [notDeleted(edu_plan_exams)];
    if (q.edu_plan_id)
      conditions.push(eq(edu_plan_exams.edu_plan_id, q.edu_plan_id));
    const where = and(...conditions);

    return lmsPaginate({
      db: this.db,
      countTable: edu_plan_exams,
      countWhere: where,
      page,
      perPage,
      query: ({ limit, offset }) =>
        this.db
          .select()
          .from(edu_plan_exams)
          .where(where)
          .orderBy(desc(edu_plan_exams.id))
          .limit(limit)
          .offset(offset),
      mapper: () => ({}) as never,
      mapList: async (rows) => {
        if (!rows.length) return [];
        const examIds = [...new Set(rows.map((r) => r.exam_id))];
        const exRows = await this.db
          .select({ id: exams.id, name: exams.name })
          .from(exams)
          .where(inArray(exams.id, examIds));
        const examMap: Record<number, { id: number; name: string | null }> = {};
        for (const e of exRows) examMap[e.id] = e;
        return rows.map((r) => EduPlanExamMapper.toItem(r, examMap));
      },
    });
  }

  /** POST /lms/exams/attach — exam_type default 3 (Final). */
  async attach(dto: AttachEduPlanExamDto) {
    const id = await this.nextId();
    const [row] = await this.db
      .insert(edu_plan_exams)
      .values({
        id,
        edu_plan_id: dto.edu_plan_id,
        exam_id: dto.exam_id,
        exam_type: dto.exam_type ?? 3,
        lesson_id: dto.lesson_id ?? null,
      })
      .returning();
    return { id: row.id };
  }

  /** GET /lms/exams/detach/:examId — hard delete. */
  async detach(examId: number) {
    const result = await this.db
      .delete(edu_plan_exams)
      .where(eq(edu_plan_exams.id, examId))
      .returning({ id: edu_plan_exams.id });
    if (!result.length) throw new BusinessException(404, 'not_found');
    return { success: true };
  }

  /** GET /lms/exams/result — stub (Laravel: complex joins). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async results(q: EduPlanExamListQueryDto) {
    const { page } = readPaging(q);
    return { current_page: page, total: 0, data: [] };
  }
}
