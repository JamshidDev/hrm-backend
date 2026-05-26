// Edu-plan-exams service. Laravel: EduPlanExamController.
//   GET  /lms/exams         → exams list filtered by whom=4 + topic.org=user.org
//   POST /lms/exams/attach  → attach exam to edu_plan (with dedup)
//   GET  /lms/exams/detach/:id → hard delete edu_plan_exams row
//   GET  /lms/exams/result  → worker_exams results (stub)

import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { and, count, desc, eq, inArray, max, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { OrgScopeService } from '@/common/database/org-scope.service';
import {
  edu_plan_exams,
  exams,
  lessons,
  topics,
} from '@/db/schema';
import { ExamMapper } from '@/modules/lms/edu-plan-exams/edu-plan-exam.mapper';
import type {
  AttachEduPlanExamDto,
  EduPlanExamListQueryDto,
} from '@/modules/lms/edu-plan-exams/dto/edu-plan-exam.dto';

@Injectable()
export class LmsEduPlanExamService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly i18n: I18nService,
    private readonly scope: OrgScopeService,
  ) {}

  private async nextId(): Promise<number> {
    const [{ m }] = await this.db
      .select({ m: max(edu_plan_exams.id) })
      .from(edu_plan_exams);
    return Number(m ?? 0) + 1;
  }

  // GET /lms/exams — Laravel: EduPlanExamController::exams.
  //
  //   Exam::query()
  //     ->with('topic:id,name,type')
  //     ->where('whom', ExamWhomEnum::FOUR->value)  // 4
  //     ->whereHas('topic', fn $q => $q->where('organization_id', $user->organization_id))
  //     ->orderByDesc('id')
  //     ->paginate(per_page);
  //
  // Returns paginated `ExamResource` shape (id, name, whom, topic{type}, deadline,
  // variant, minute, tests_count, chances, active, description).
  async list(q: EduPlanExamListQueryDto) {
    const page = Math.max(1, Number(q.page ?? 1));
    const perPage = Math.max(1, Number(q.per_page ?? 10));
    const offset = (page - 1) * perPage;

    // EXISTS topic in user's org-scope (Laravel uses strict `user.org_id`; biz
    // OrgScopeService bilan kengaytirilgan: admin → all, leader → subtree,
    // default → own. Aks holda HQ-darajadagi user pastdagi orglardagi exams'larni
    // ko'rmaydi — Laravel'da bu real bug edi).
    const scopeIds = await this.scope.ids();
    const orgIn = scopeIds.length
      ? sql`AND topics.organization_id IN (${sql.join(scopeIds.map((n) => sql`${n}`), sql`, `)})`
      : sql`AND FALSE`;
    const topicOrgExists = sql`EXISTS (
      SELECT 1 FROM topics
      WHERE topics.id = ${exams.topic_id}
        ${orgIn}
        AND topics.deleted_at IS NULL
    )`;

    const where = and(notDeleted(exams), eq(exams.whom, 4), topicOrgExists);

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: exams.id,
          name: exams.name,
          whom: exams.whom,
          topic_id: exams.topic_id,
          deadline: exams.deadline,
          variant: exams.variant,
          minute: exams.minute,
          tests_count: exams.tests_count,
          chances: exams.chances,
          active: exams.active,
          description: exams.description,
        })
        .from(exams)
        .where(where)
        .orderBy(desc(exams.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(exams).where(where),
    ]);

    // Batch eager-load topics (id, name, type) — `with('topic:id,name,type')`.
    const topicIds = [
      ...new Set(rows.map((r) => Number(r.topic_id)).filter(Boolean)),
    ];
    const tRows = topicIds.length
      ? await this.db
          .select({
            id: topics.id,
            name: topics.name,
            type: topics.type,
          })
          .from(topics)
          .where(inArray(topics.id, topicIds))
      : [];
    const topicMap: Record<
      number,
      { id: number; name: string | null; type: number }
    > = {};
    for (const t of tRows) topicMap[Number(t.id)] = t;

    return {
      current_page: page,
      total: Number(total),
      data: rows.map((r) => ExamMapper.toItem(r, topicMap)),
    };
  }

  // POST /lms/exams/attach — Laravel: EduPlanExamController::attachExam.
  //
  //   Validate: type, exam_id required.
  //   If neither lesson_id nor edu_plan_id → 400 lms.edu_plan_or_lesson_is_required.
  //   If lesson_id → resolve edu_plan_id = Lesson::find($lesson_id)->edu_plan_id.
  //   Dedup: edu_plan_exams (edu_plan_id, type, exam_id, [lesson_id]) — agar mavjud
  //          bo'lsa 400 lms.exam_already_attached.
  //   Create EduPlanExam row.
  async attach(dto: AttachEduPlanExamDto) {
    const type = Number(dto.exam_type);
    const examId = Number(dto.exam_id);
    if (!Number.isInteger(type) || type <= 0 || !Number.isInteger(examId) || examId <= 0) {
      throw new BusinessException(422, 'type and exam_id are required');
    }

    let eduPlanId = Number(dto.edu_plan_id ?? 0);
    const lessonId = dto.lesson_id ? Number(dto.lesson_id) : null;

    if (!lessonId && !eduPlanId) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.lms.edu_plan_or_lesson_is_required'),
      );
    }
    if (lessonId) {
      const [l] = await this.db
        .select({ id: lessons.id, edu_plan_id: lessons.edu_plan_id })
        .from(lessons)
        .where(eq(lessons.id, lessonId))
        .limit(1);
      if (!l) throw new BusinessException(404, this.i18n.t('messages.not_found'));
      eduPlanId = Number(l.edu_plan_id);
    }

    // Dedup check.
    const conds = [
      eq(edu_plan_exams.edu_plan_id, eduPlanId),
      eq(edu_plan_exams.exam_type, type),
      eq(edu_plan_exams.exam_id, examId),
      notDeleted(edu_plan_exams),
    ];
    if (lessonId) conds.push(eq(edu_plan_exams.lesson_id, lessonId));
    const [{ c }] = await this.db
      .select({ c: count() })
      .from(edu_plan_exams)
      .where(and(...conds));
    if (Number(c) > 0) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.lms.exam_already_attached'),
      );
    }

    const id = await this.nextId();
    await this.db.insert(edu_plan_exams).values({
      id,
      edu_plan_id: eduPlanId,
      exam_id: examId,
      exam_type: type,
      lesson_id: lessonId,
      created_at: sql`NOW()`,
      updated_at: sql`NOW()`,
    } as any);
    return { id };
  }

  // GET /lms/exams/detach/:examId — hard delete (Laravel: findOrFail + delete).
  // Note: Laravel uses `delete()` on a SoftDeletes model → it's actually a SOFT delete,
  // not force delete. We mirror that.
  async detach(examId: number) {
    const [row] = await this.db
      .select({ id: edu_plan_exams.id })
      .from(edu_plan_exams)
      .where(eq(edu_plan_exams.id, examId))
      .limit(1);
    if (!row) throw new BusinessException(404, this.i18n.t('messages.not_found'));
    await this.db
      .update(edu_plan_exams)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(edu_plan_exams.id, examId));
    return { success: true };
  }

  /** GET /lms/exams/result — stub (Laravel: complex joins). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async results(q: EduPlanExamListQueryDto) {
    const page = Math.max(1, Number(q.page ?? 1));
    return { current_page: page, total: 0, data: [] };
  }
}
