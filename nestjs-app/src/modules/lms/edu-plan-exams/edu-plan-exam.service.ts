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
import { MinioService } from '@/shared/minio/minio.service';
import {
  edu_plan_exams,
  exams,
  lessons,
  topics,
  worker_exams,
  workers,
} from '@/db/schema';
import {
  lmsPaginate,
  readPaging,
} from '@/modules/lms/_shared/lms-paginate.util';
import { ExamMapper } from '@/modules/lms/edu-plan-exams/edu-plan-exam.mapper';
import type {
  AttachEduPlanExamDto,
  EduPlanExamListQueryDto,
  ExamResultQueryDto,
} from '@/modules/lms/edu-plan-exams/dto/edu-plan-exam.dto';

// Laravel TopicTypeEnum int → i18n kalit so'zi (messages.exam.exam_types.*).
const TOPIC_TYPE_WORDS = ['', 'one', 'two', 'three', 'four'] as const;

@Injectable()
export class LmsEduPlanExamService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly i18n: I18nService,
    private readonly minio: MinioService,
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

    // Laravel STRICT parity (qaror #12 = A): whereHas('topic', fn =>
    //   $q->where('organization_id', $user->organization_id)) — bitta org, childIds
    //   YO'Q, admin ham faqat o'z org'ini ko'radi. (Laravel `where(col, null)` →
    //   `IS NULL`, shuning uchun org_id null bo'lsa IS NULL.)
    const userOrgId = this.ctx.user_or_fail.organization_id;
    const orgCond =
      userOrgId == null
        ? sql`AND topics.organization_id IS NULL`
        : sql`AND topics.organization_id = ${userOrgId}`;
    const topicOrgExists = sql`EXISTS (
      SELECT 1 FROM topics
      WHERE topics.id = ${exams.topic_id}
        ${orgCond}
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
  async attach(
    dto: AttachEduPlanExamDto,
  ): Promise<{ message: boolean | string; error: boolean; data: unknown }> {
    // type + exam_id majburiy — DTO (@IsInt) validatsiya qiladi (Laravel validate).
    const type = Number(dto.type);
    const examId = Number(dto.exam_id);

    let eduPlanId = Number(dto.edu_plan_id ?? 0);
    const lessonId = dto.lesson_id ? Number(dto.lesson_id) : null;

    // Laravel: Helper::response(false, ...) — soft-error (HTTP 200, message=false).
    if (!lessonId && !eduPlanId) {
      return {
        message: false,
        error: false,
        data: this.i18n.t('messages.lms.edu_plan_or_lesson_is_required'),
      };
    }
    // Laravel: Lesson::findOrFail($lesson_id)->edu_plan_id (topilmasa 404).
    if (lessonId) {
      const [l] = await this.db
        .select({ id: lessons.id, edu_plan_id: lessons.edu_plan_id })
        .from(lessons)
        .where(eq(lessons.id, lessonId))
        .limit(1);
      if (!l)
        throw new BusinessException(404, this.i18n.t('messages.not_found'));
      eduPlanId = Number(l.edu_plan_id);
    }

    // Dedup: (edu_plan_id, type, exam_id, [lesson_id]) — Laravel where(...)->count().
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
      return {
        message: false,
        error: false,
        data: this.i18n.t('messages.lms.exam_already_attached'),
      };
    }

    // EduPlanExam::create($data).
    const id = await this.nextId();
    await this.db.insert(edu_plan_exams).values({
      id,
      edu_plan_id: eduPlanId,
      exam_id: examId,
      exam_type: type,
      lesson_id: lessonId,
      created_at: sql`NOW()`,
      updated_at: sql`NOW()`,
    });
    // Laravel: Helper::response(true, trans('messages.successfully_attached')).
    return {
      message: true,
      error: false,
      data: this.i18n.t('messages.successfully_attached'),
    };
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
    if (!row)
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    await this.db
      .update(edu_plan_exams)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(edu_plan_exams.id, examId));
    return { success: true };
  }

  // GET /lms/exams/result — Laravel: EduPlanExamController::results.
  //   WorkerExam::with(['worker','exam','topic'])->join(workers)->join(topics)
  //     ->when(search → CONCAT fullname ILIKE)
  //     ->when(topics → topic_id IN csv)->when(exams → exam_id IN csv)
  //     ->orderByDesc('id')->paginate() → ExamResultResource.
  async results(q: ExamResultQueryDto) {
    const { page, perPage } = readPaging(q);
    const lang = this.ctx.lang;
    const conditions = [notDeleted(worker_exams)];

    const search = q.search?.trim();
    if (search) {
      conditions.push(sql`EXISTS (
        SELECT 1 FROM workers w
        WHERE w.id = ${worker_exams.worker_id}
          AND CONCAT(w.last_name, ' ', w.first_name, ' ', w.middle_name) ILIKE ${`%${search}%`}
      )`);
    }
    const topicIds = this.csvInts(q.topics);
    if (topicIds.length) {
      conditions.push(inArray(worker_exams.topic_id, topicIds));
    }
    const examIds = this.csvInts(q.exams);
    if (examIds.length) {
      conditions.push(inArray(worker_exams.exam_id, examIds));
    }

    const where = and(...conditions);

    return lmsPaginate({
      db: this.db,
      countTable: worker_exams,
      countWhere: where,
      page,
      perPage,
      query: ({ limit, offset }) =>
        this.db
          .select({
            id: worker_exams.id,
            worker_id: worker_exams.worker_id,
            exam_id: worker_exams.exam_id,
            topic_id: worker_exams.topic_id,
            created: worker_exams.created,
            ended: worker_exams.ended,
            result: worker_exams.result,
            deleted_at: worker_exams.deleted_at,
          })
          .from(worker_exams)
          .where(where)
          .orderBy(desc(worker_exams.id))
          .limit(limit)
          .offset(offset),
      mapper: () => ({}) as never,
      mapList: async (rows) => {
        if (!rows.length) return [];
        const workerIds = [
          ...new Set(
            rows.map((r) => r.worker_id).filter((x): x is number => x != null),
          ),
        ];
        const examIdSet = [
          ...new Set(
            rows.map((r) => r.exam_id).filter((x): x is number => x != null),
          ),
        ];
        const topicIdSet = [
          ...new Set(
            rows.map((r) => r.topic_id).filter((x): x is number => x != null),
          ),
        ];

        const [workerRows, examRows, topicRows] = await Promise.all([
          this.db
            .select({
              id: workers.id,
              last_name: workers.last_name,
              first_name: workers.first_name,
              middle_name: workers.middle_name,
              photo: workers.photo,
            })
            .from(workers)
            .where(inArray(workers.id, workerIds.length ? workerIds : [-1])),
          this.db
            .select({
              id: exams.id,
              name: exams.name,
              deadline: exams.deadline,
              variant: exams.variant,
              minute: exams.minute,
              tests_count: exams.tests_count,
              chances: exams.chances,
              active: exams.active,
              description: exams.description,
              camera: exams.camera,
            })
            .from(exams)
            .where(inArray(exams.id, examIdSet.length ? examIdSet : [-1])),
          this.db
            .select({ id: topics.id, name: topics.name, type: topics.type })
            .from(topics)
            .where(inArray(topics.id, topicIdSet.length ? topicIdSet : [-1])),
        ]);

        const workerMap = new Map(workerRows.map((w) => [w.id, w]));
        const examMap = new Map(examRows.map((e) => [e.id, e]));
        const topicMap = new Map(topicRows.map((t) => [t.id, t]));

        const photoMap = new Map<number, string | null>();
        await Promise.all(
          workerRows.map(async (w) => {
            photoMap.set(w.id, await this.minio.fileUrl(w.photo));
          }),
        );

        const topicTypeName = (type: number | null): string => {
          const word = TOPIC_TYPE_WORDS[Number(type)];
          return word
            ? this.i18n.t(`messages.exam.exam_types.${word}`, { lang })
            : '';
        };

        return rows.map((r) => {
          const w = r.worker_id ? workerMap.get(r.worker_id) : undefined;
          const ex = r.exam_id ? examMap.get(r.exam_id) : undefined;
          const tp = r.topic_id ? topicMap.get(r.topic_id) : undefined;
          return {
            id: r.id,
            // Laravel WorkerMinimalResource (whenLoaded → null bo'lsa null).
            worker: w
              ? {
                  id: w.id,
                  photo: photoMap.get(w.id) ?? null,
                  last_name: w.last_name,
                  first_name: w.first_name,
                  middle_name: w.middle_name,
                }
              : null,
            created: r.created,
            ended: r.ended,
            result: r.result,
            // ExamInfoResource (exam null bo'lsa null-wrapped — bizda exam doim bor).
            exam: ex
              ? {
                  id: ex.id,
                  name: ex.name,
                  deadline: ex.deadline,
                  variant: ex.variant,
                  minute: ex.minute,
                  tests_count: ex.tests_count,
                  chances: ex.chances,
                  active: ex.active,
                  description: ex.description,
                  camera: ex.camera,
                }
              : null,
            // TopicMinResource {id, name, type:{id, name}}.
            topic: tp
              ? {
                  id: tp.id,
                  name: tp.name,
                  type: { id: tp.type, name: topicTypeName(tp.type) },
                }
              : null,
            deleted_at: r.deleted_at,
          };
        });
      },
    });
  }

  // CSV "1,2,3" → [1,2,3] (bo'sh/invalid → bo'sh massiv).
  private csvInts(csv: string | undefined): number[] {
    if (!csv) return [];
    return csv
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
  }
}
