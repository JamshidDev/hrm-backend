// Listeners service. Laravel: ListenerController + ListenerLessonController.
// Tinglovchi (listener) — guruhga (edu_plan_workers) biriktirilgan worker.

import { Injectable } from '@nestjs/common';
import { and, asc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import {
  edu_plan_exams,
  edu_plan_workers,
  edu_plans,
  exams,
  groups,
  learning_centers,
  lessons,
  specializations,
  subjects,
  workers,
} from '@/db/schema';
import type { LessonExam } from '@/modules/lms/lessons/lesson.mapper';
import type { ListenerCalendarQueryDto } from '@/modules/lms/listeners/dto/listener.dto';

// ListenerStatusEnum / EduPlanTypeEnum — int → i18n kalit so'zi.
const NUM_WORDS = ['', 'one', 'two', 'three', 'four'] as const;

// Listener calendar dars item'i — Lesson calendar'dan farqli: `teacher` YO'Q.
export interface ListenerLessonItem {
  id: number;
  name: string | null;
  group: number | null; // group?.code
  subject: string | null; // subject?.name
  start_time: string;
  end_time: string;
  exam: LessonExam | null;
}

export interface ListenerCalendarDay {
  lesson_date: string;
  lessons: ListenerLessonItem[];
}

@Injectable()
export class LmsListenerService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
    private readonly i18n: I18nService,
  ) {}

  private eduPlanTypeName(type: number | null): string {
    const w = NUM_WORDS[Number(type)];
    return w
      ? this.i18n.t(`messages.lms.edu_plan.types.${w}`, { lang: this.ctx.lang })
      : '';
  }

  private listenerStatusName(status: number | null): string {
    const w = NUM_WORDS[Number(status)];
    return w
      ? this.i18n.t(`messages.lms.edu_plan.listener.status.${w}`, {
          lang: this.ctx.lang,
        })
      : '';
  }

  // Laravel Group::getCode($lc) = 'M' . $lc?->code . ' ' . $group->code . '-guruh'.
  private groupCode(
    lcCode: string | number | null | undefined,
    groupCode: number | null | undefined,
  ): string {
    return `M${lcCode ?? ''} ${groupCode ?? ''}-guruh`;
  }

  // GET /lms/listener — Laravel: ListenerController::index (dashboard).
  //   { edu_plans, lessons (max 3), user, positions }
  //
  // PARITY — `positions` DOIM []: Laravel'da `$user->load(['worker.positions:id,
  // organization_id,position_id,department_id,position_date', ...])` constrained
  // eager-load `worker_id` (FK) ni select QILMAYDI. Shu sabab Eloquent yuklangan
  // position'larni worker'ga BOG'LAY olmaydi → `$user->worker->positions` bo'sh →
  // `WorkerPositionMinResource::collection([])` = []. (Mashhur Laravel footgun.)
  // Frontend Laravel'ning bo'sh [] javobi bilan ishlaydi — biz aynan takrorlaymiz.
  async index() {
    const userId = Number(this.ctx.user?.id ?? 0);
    const workerId = Number(this.ctx.user?.worker_id ?? 0);

    const [eduPlans, recentLessons, user] = await Promise.all([
      this.buildEduPlans(workerId),
      this.buildRecentLessons(userId),
      this.buildUser(userId, workerId),
    ]);

    return {
      edu_plans: eduPlans,
      lessons: recentLessons,
      user,
      positions: [], // Laravel eager-load FK-omission → doimo []
    };
  }

  // edu_plans — EduPlanWorker::where('worker_id', $user->worker_id)
  //   ->with(['learning_center','edu_plan','group:id,code'])->get()
  //   → EduPlanWorkerResource.
  private async buildEduPlans(workerId: number) {
    const rows = await this.db
      .select({
        id: edu_plan_workers.id,
        status: edu_plan_workers.status,
        learning_center_id: edu_plan_workers.learning_center_id,
        edu_plan_id: edu_plan_workers.edu_plan_id,
        group_id: edu_plan_workers.group_id,
      })
      .from(edu_plan_workers)
      .where(
        and(
          eq(edu_plan_workers.worker_id, workerId),
          notDeleted(edu_plan_workers),
        ),
      );

    if (!rows.length) return [];

    const lcIds = [...new Set(rows.map((r) => r.learning_center_id))];
    const epIds = [...new Set(rows.map((r) => r.edu_plan_id))];
    const grpIds = [
      ...new Set(rows.map((r) => r.group_id).filter((x): x is number => !!x)),
    ];

    const [lcRows, epRows, grpRows] = await Promise.all([
      this.db
        .select({
          id: learning_centers.id,
          name: learning_centers.name,
          code: learning_centers.code,
        })
        .from(learning_centers)
        .where(inArray(learning_centers.id, lcIds)),
      this.db
        .select({
          id: edu_plans.id,
          name: edu_plans.name,
          specialization_id: edu_plans.specialization_id,
          type: edu_plans.type,
          start_date: edu_plans.start_date,
          hours: edu_plans.hours,
          count_groups: edu_plans.count_groups,
          count_workers: edu_plans.count_workers,
        })
        .from(edu_plans)
        .where(inArray(edu_plans.id, epIds)),
      this.db
        .select({ id: groups.id, code: groups.code })
        .from(groups)
        .where(inArray(groups.id, grpIds.length ? grpIds : [-1])),
    ]);

    const specIds = [
      ...new Set(epRows.map((e) => e.specialization_id).filter(Boolean)),
    ];
    const specRows = specIds.length
      ? await this.db
          .select({ id: specializations.id, name: specializations.name })
          .from(specializations)
          .where(inArray(specializations.id, specIds))
      : [];

    const lcMap = new Map(lcRows.map((l) => [l.id, l]));
    const epMap = new Map(epRows.map((e) => [e.id, e]));
    const grpMap = new Map(grpRows.map((g) => [g.id, g]));
    const specMap = new Map(specRows.map((s) => [s.id, s]));

    return rows.map((r) => {
      const lc = lcMap.get(r.learning_center_id);
      const ep = epMap.get(r.edu_plan_id);
      const grp = r.group_id != null ? grpMap.get(r.group_id) : undefined;
      const spec = ep?.specialization_id
        ? specMap.get(ep.specialization_id)
        : undefined;

      return {
        id: r.id,
        learning_center: lc
          ? { id: lc.id, name: lc.name, code: lc.code }
          : null,
        edu_plan: ep
          ? {
              id: ep.id,
              name: ep.name,
              specialization: spec ? { id: spec.id, name: spec.name } : null,
              type: { id: ep.type, name: this.eduPlanTypeName(ep.type) },
              start_date: ep.start_date,
              hours: ep.hours,
              count_groups: ep.count_groups,
              count_workers: ep.count_workers,
            }
          : null,
        status: { id: r.status, name: this.listenerStatusName(r.status) },
        // GroupResource — code epw.learning_center bilan.
        group: grp
          ? { id: grp.id, code: this.groupCode(lc?.code, grp.code) }
          : null,
      };
    });
  }

  // lessons (max 3) — whereHas('group.workers', worker_id = $user->id),
  //   orderBy lesson_date, start_time, limit 3 → {id, name, group(GroupListResource),
  //   subject, start_time, end_time}.
  private async buildRecentLessons(userId: number) {
    const groupWorkerExists = sql`EXISTS (
      SELECT 1 FROM edu_plan_workers epw
      JOIN groups g ON g.id = epw.group_id AND g.deleted_at IS NULL
      JOIN workers w ON w.id = epw.worker_id AND w.deleted_at IS NULL
      WHERE epw.group_id = ${lessons.group_id}
        AND epw.worker_id = ${userId}
    )`;

    const rows = await this.db
      .select({
        id: lessons.id,
        name: lessons.name,
        group_id: lessons.group_id,
        subject_id: lessons.subject_id,
        start_time: lessons.start_time,
        end_time: lessons.end_time,
      })
      .from(lessons)
      .where(and(notDeleted(lessons), groupWorkerExists))
      .orderBy(asc(lessons.lesson_date), asc(lessons.start_time))
      .limit(3);

    if (!rows.length) return [];

    const grpIds = [...new Set(rows.map((r) => r.group_id))];
    const subjIds = [...new Set(rows.map((r) => r.subject_id))];

    const [grpRows, subjRows] = await Promise.all([
      this.db
        .select({
          id: groups.id,
          code: groups.code,
          learning_center_id: groups.learning_center_id,
        })
        .from(groups)
        .where(inArray(groups.id, grpIds)),
      this.db
        .select({ id: subjects.id, name: subjects.name })
        .from(subjects)
        .where(inArray(subjects.id, subjIds)),
    ]);

    const lcIds = [...new Set(grpRows.map((g) => g.learning_center_id))];
    const lcRows = lcIds.length
      ? await this.db
          .select({ id: learning_centers.id, code: learning_centers.code })
          .from(learning_centers)
          .where(inArray(learning_centers.id, lcIds))
      : [];

    const grpMap = new Map(grpRows.map((g) => [g.id, g]));
    const subjMap = new Map(subjRows.map((s) => [s.id, s.name]));
    const lcCodeMap = new Map(lcRows.map((l) => [l.id, l.code]));

    return rows.map((r) => {
      const grp = grpMap.get(r.group_id);
      const lcCode = grp ? lcCodeMap.get(grp.learning_center_id) : undefined;
      return {
        id: r.id,
        name: r.name,
        // GroupListResource — code group.learning_center bilan; workers = workers_count
        // (dashboard query withCount qilmaydi → null).
        group: grp
          ? {
              id: grp.id,
              code: this.groupCode(lcCode, grp.code),
              workers: null,
            }
          : null,
        subject: r.subject_id ? (subjMap.get(r.subject_id) ?? null) : null,
        start_time: r.start_time,
        end_time: r.end_time,
      };
    });
  }

  // user — UserWorkerResource: {id, worker: WorkerMinimalResource}.
  private async buildUser(userId: number, workerId: number) {
    const worker = await this.workerMinimal(workerId);
    return { id: userId, worker };
  }

  private async workerMinimal(workerId: number) {
    if (!workerId) return null;
    const [w] = await this.db
      .select({
        id: workers.id,
        last_name: workers.last_name,
        first_name: workers.first_name,
        middle_name: workers.middle_name,
        photo: workers.photo,
      })
      .from(workers)
      .where(eq(workers.id, workerId))
      .limit(1);
    if (!w) return null;
    return {
      id: w.id,
      photo: await this.minio.fileUrl(w.photo),
      last_name: w.last_name,
      first_name: w.first_name,
      middle_name: w.middle_name,
    };
  }

  // GET /lms/listener/lessons — Laravel: ListenerLessonController::index (calendar).
  //
  //   Lesson::with(['group','subject','exam.exam'])
  //     ->whereHas('group.workers', fn($q) => $q->where('worker_id', $user->id))
  //     ->whereBetween('lesson_date', [$start, $end])
  //     ->orderBy('lesson_date')->orderBy('start_time')->get()
  //     ->groupBy('lesson_date')->map(...);   // teacher YO'Q
  //
  // group.workers = belongsToMany(Worker, 'edu_plan_workers', 'group_id', 'worker_id').
  async lessons(q: ListenerCalendarQueryDto): Promise<ListenerCalendarDay[]> {
    const userId = Number(this.ctx.user?.id ?? 0);

    // whereHas('group.workers', worker_id = user.id):
    //   group (lessons.group_id) mavjud (soft-delete) VA shu guruhda
    //   edu_plan_workers.worker_id = userId bo'lgan (deleted bo'lmagan) worker bor.
    const groupWorkerExists = sql`EXISTS (
      SELECT 1 FROM edu_plan_workers epw
      JOIN groups g ON g.id = epw.group_id AND g.deleted_at IS NULL
      JOIN workers w ON w.id = epw.worker_id AND w.deleted_at IS NULL
      WHERE epw.group_id = ${lessons.group_id}
        AND epw.worker_id = ${userId}
    )`;

    const where = and(
      gte(lessons.lesson_date, q.start_date),
      lte(lessons.lesson_date, q.end_date),
      notDeleted(lessons),
      groupWorkerExists,
    );

    const rows = await this.db
      .select({
        id: lessons.id,
        name: lessons.name,
        group_id: lessons.group_id,
        subject_id: lessons.subject_id,
        lesson_date: lessons.lesson_date,
        start_time: lessons.start_time,
        end_time: lessons.end_time,
      })
      .from(lessons)
      .where(where)
      .orderBy(asc(lessons.lesson_date), asc(lessons.start_time));

    if (!rows.length) return [];

    // ---- Batch-load relations (teacher YO'Q) ----
    const groupIds = [...new Set(rows.map((r) => r.group_id))];
    const subjectIds = [...new Set(rows.map((r) => r.subject_id))];
    const lessonIds = rows.map((r) => r.id);

    const [groupRows, subjectRows, examLinks] = await Promise.all([
      this.db
        .select({ id: groups.id, code: groups.code })
        .from(groups)
        .where(inArray(groups.id, groupIds)),
      this.db
        .select({ id: subjects.id, name: subjects.name })
        .from(subjects)
        .where(inArray(subjects.id, subjectIds)),
      this.db
        .select({
          id: edu_plan_exams.id,
          lesson_id: edu_plan_exams.lesson_id,
          exam_id: edu_plan_exams.exam_id,
        })
        .from(edu_plan_exams)
        .where(
          and(
            inArray(edu_plan_exams.lesson_id, lessonIds),
            notDeleted(edu_plan_exams),
          ),
        )
        .orderBy(asc(edu_plan_exams.id)),
    ]);

    const examIds = [
      ...new Set(
        examLinks.map((e) => e.exam_id).filter((x): x is number => !!x),
      ),
    ];
    const examRows = examIds.length
      ? await this.db
          .select({ id: exams.id, name: exams.name })
          .from(exams)
          .where(inArray(exams.id, examIds))
      : [];

    const groupCode = new Map(groupRows.map((g) => [g.id, g.code]));
    const subjectName = new Map(subjectRows.map((s) => [s.id, s.name]));
    const examNameMap = new Map(examRows.map((e) => [e.id, e.name]));
    // hasOne — har lesson_id uchun BIRINCHI edu_plan_exam.
    const examByLesson = new Map<number, (typeof examLinks)[number]>();
    for (const link of examLinks) {
      if (link.lesson_id == null) continue;
      if (!examByLesson.has(link.lesson_id)) {
        examByLesson.set(link.lesson_id, link);
      }
    }

    const buildExam = (lessonId: number): LessonExam | null => {
      const link = examByLesson.get(lessonId);
      if (!link) return null;
      return {
        id: link.id,
        exam: {
          id: link.exam_id ?? null,
          name: link.exam_id ? (examNameMap.get(link.exam_id) ?? null) : null,
        },
      };
    };

    // ---- groupBy('lesson_date') ----
    const calendar: ListenerCalendarDay[] = [];
    const dateIndex = new Map<string, number>();
    for (const r of rows) {
      const item: ListenerLessonItem = {
        id: r.id,
        name: r.name,
        group: groupCode.get(r.group_id) ?? null,
        subject: subjectName.get(r.subject_id) ?? null,
        start_time: r.start_time,
        end_time: r.end_time,
        exam: buildExam(r.id),
      };
      let idx = dateIndex.get(r.lesson_date);
      if (idx === undefined) {
        idx = calendar.length;
        dateIndex.set(r.lesson_date, idx);
        calendar.push({ lesson_date: r.lesson_date, lessons: [] });
      }
      calendar[idx].lessons.push(item);
    }
    return calendar;
  }

  // GET /lms/listener/lessons/:lessonId — Laravel: ListenerLessonController::startLesson.
  //   Lesson::findOrFail($id) → LessonStartResource.
  //   {id, name, lesson_date, start_time, end_time, zoom_start_url}.
  async startLesson(lessonId: number) {
    const [row] = await this.db
      .select({
        id: lessons.id,
        name: lessons.name,
        lesson_date: lessons.lesson_date,
        start_time: lessons.start_time,
        end_time: lessons.end_time,
        zoom_start_url: lessons.zoom_start_url,
      })
      .from(lessons)
      .where(and(sql`${lessons.id} = ${lessonId}`, notDeleted(lessons)))
      .limit(1);
    if (!row) throw new BusinessException(404, 'not_found');
    return row;
  }
}
