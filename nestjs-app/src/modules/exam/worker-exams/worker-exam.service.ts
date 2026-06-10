// Worker exam service. Laravel parity:
//   - WorkerExamController::index    → Exam::filter + with(results, topic) paginate
//   - WorkerExamController::startExam → WorkerExam create + random question pick
//   - DashboardController::workerStatistics → score bucket [0-55,56-71,72-85,86-100]

import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import {
  exam_category_options,
  exam_category_questions,
  exam_tests,
  exams,
  topics,
  users,
  worker_exam_questions,
  worker_exams,
  worker_positions,
  workers,
} from '@/db/schema';
import { nextId, pageOf } from '@/modules/exam/_shared/helpers';

// Laravel ExamWhomEnum::get(int) — exam.exam_whom.{one|two|three|four|five}.
const EXAM_WHOM_KEYS: Record<number, string> = {
  1: 'messages.exam.exam_whom.one',
  2: 'messages.exam.exam_whom.two',
  3: 'messages.exam.exam_whom.three',
  4: 'messages.exam.exam_whom.four',
  5: 'messages.exam.exam_whom.five',
};

// Laravel TopicTypeEnum::get(int) — exam.exam_types.{one|two|three|four}.
const TOPIC_TYPE_KEYS: Record<number, string> = {
  1: 'messages.exam.exam_types.one',
  2: 'messages.exam.exam_types.two',
  3: 'messages.exam.exam_types.three',
  4: 'messages.exam.exam_types.four',
};

interface QueryListLike {
  page?: number | string;
  per_page?: number | string;
}
interface QueryStatsLike {
  from?: string;
  to?: string;
}

@Injectable()
export class WorkerExamService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly i18n: I18nService,
    private readonly minio: MinioService,
  ) {}

  // GET /api/v1/exam/worker-exams
  //
  // Laravel: WorkerExamService::index
  //   Exam::query()
  //     ->with(['results' => fn ($q) => $q->where('worker_id', $user->worker_id),
  //             'topic:id,name,type'])
  //     ->filter($user, $filters)
  //     ->orderByDesc('id')
  //     ->paginate($filters['per_page'] ?? 10);
  //
  // filter($user) — Exam::scopeFilter:
  //   active=true AND
  //   (whom=3 AND exam_workers.worker_id = $workerId) OR
  //   (whom=2 AND topic_organizations.organization_id = $orgId AND
  //              exam_positions.position_id = $positionId) OR
  //   (whom=1 AND topic_organizations.organization_id = $orgId) OR
  //   (whom=4 AND topic_organizations.organization_id = $orgId AND
  //              edu_plans→edu_plan_workers.worker_id = $workerId)
  async list(q: QueryListLike) {
    const { page, perPage, offset } = pageOf(q);
    const lang = this.ctx.lang;
    const user = this.ctx.user_or_fail;
    const workerId = user.worker_id;
    const orgId = user.organization_id;

    // Laravel: $user->load('worker.position')->worker?->position?->position_id
    //  → worker.position (HasOne) where status=ACTIVE (2). Bo'sh bo'lsa null.
    let positionId: number | null = null;
    if (workerId != null) {
      const [wp] = await this.db
        .select({ position_id: worker_positions.position_id })
        .from(worker_positions)
        .where(
          and(
            eq(worker_positions.worker_id, workerId),
            eq(worker_positions.status, 2),
            notDeleted(worker_positions),
          ),
        )
        .limit(1);
      positionId = wp?.position_id ?? null;
    }

    // whom-OR sub-conditions: SQL fragmentlar (NULL bo'lsa False) qaytaradi.
    // Eslatma: Laravel `orWhere('whom', X)->whereHas(...)` Eloquent'da bitta
    // OR clause sifatida qo'shiladi (sql-da `whom = X AND EXISTS(...)`).
    const whomOr: ReturnType<typeof sql>[] = [];

    // whom = 3 → exam_workers'da $workerId bo'lishi shart.
    if (workerId != null) {
      whomOr.push(sql`(${exams.whom} = 3 AND EXISTS (
        SELECT 1 FROM exam_workers ew
         WHERE ew.exam_id = ${exams.id}
           AND ew.worker_id = ${workerId}
      ))`);
    }

    // whom = 2 → topic.hasOrganizations + exam_positions.position_id = $positionId.
    // Laravel whereHas('topic.hasOrganizations') Eloquent traversal INNER JOIN
    // topics qiladi → topic.deleted_at IS NULL ham tekshiriladi.
    if (orgId != null && positionId != null) {
      whomOr.push(sql`(${exams.whom} = 2 AND EXISTS (
        SELECT 1 FROM topic_organizations to_
         JOIN topics t ON t.id = to_.topic_id
         WHERE to_.topic_id = ${exams.topic_id}
           AND to_.organization_id = ${orgId}
           AND t.deleted_at IS NULL
      ) AND EXISTS (
        SELECT 1 FROM exam_positions ep
         WHERE ep.exam_id = ${exams.id}
           AND ep.position_id = ${positionId}
      ))`);
    }

    // whom = 1 → topic.hasOrganizations match.
    if (orgId != null) {
      whomOr.push(sql`(${exams.whom} = 1 AND EXISTS (
        SELECT 1 FROM topic_organizations to_
         JOIN topics t ON t.id = to_.topic_id
         WHERE to_.topic_id = ${exams.topic_id}
           AND to_.organization_id = ${orgId}
           AND t.deleted_at IS NULL
      ))`);
    }

    // whom = 4 → topic.hasOrganizations + edu_plans→edu_plan_workers.worker_id.
    if (orgId != null && workerId != null) {
      whomOr.push(sql`(${exams.whom} = 4 AND EXISTS (
        SELECT 1 FROM topic_organizations to_
         JOIN topics t ON t.id = to_.topic_id
         WHERE to_.topic_id = ${exams.topic_id}
           AND to_.organization_id = ${orgId}
           AND t.deleted_at IS NULL
      ) AND EXISTS (
        SELECT 1 FROM edu_plan_exams epe
         JOIN edu_plan_workers epw ON epw.edu_plan_id = epe.edu_plan_id
         WHERE epe.exam_id = ${exams.id}
           AND epw.worker_id = ${workerId}
           AND epw.deleted_at IS NULL
      ))`);
    }

    const whomClause =
      whomOr.length > 0 ? sql.join(whomOr, sql` OR `) : sql`FALSE`;

    const where = and(
      notDeleted(exams),
      eq(exams.active, true),
      sql`(${whomClause})`,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: exams.id,
          name: exams.name,
          whom: exams.whom,
          deadline: exams.deadline,
          variant: exams.variant,
          tests_count: exams.tests_count,
          active: exams.active,
          minute: exams.minute,
          chances: exams.chances,
          description: exams.description,
          camera: exams.camera,
          topic_id: exams.topic_id,
        })
        .from(exams)
        .where(where)
        .orderBy(desc(exams.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(exams).where(where),
    ]);

    // Batch-load topic'lar + worker'ning natijalari.
    const topicIds = [
      ...new Set(
        rows.map((r) => r.topic_id).filter((v): v is number => v != null),
      ),
    ];
    const examIds = rows.map((r) => r.id);

    const [topicRows, resultRows] = await Promise.all([
      topicIds.length
        ? this.db
            .select({
              id: topics.id,
              name: topics.name,
              type: topics.type,
            })
            .from(topics)
            .where(inArray(topics.id, topicIds))
        : Promise.resolve(
            [] as Array<{ id: number; name: string | null; type: number }>,
          ),
      workerId != null && examIds.length
        ? this.db
            .select({
              id: worker_exams.id,
              exam_id: worker_exams.exam_id,
              created: worker_exams.created,
              ended: worker_exams.ended,
              result: worker_exams.result,
            })
            .from(worker_exams)
            .where(
              and(
                eq(worker_exams.worker_id, workerId),
                inArray(worker_exams.exam_id, examIds),
                notDeleted(worker_exams),
              ),
            )
        : Promise.resolve(
            [] as Array<{
              id: number;
              exam_id: number;
              created: string | null;
              ended: string | null;
              result: number | null;
            }>,
          ),
    ]);

    const topicMap = new Map(topicRows.map((t) => [t.id, t]));
    const resultsByExam = new Map<number, typeof resultRows>();
    for (const r of resultRows) {
      const arr = resultsByExam.get(r.exam_id) ?? [];
      arr.push(r);
      resultsByExam.set(r.exam_id, arr);
    }

    const data = rows.map((r) => {
      const t = r.topic_id != null ? topicMap.get(r.topic_id) : undefined;
      return {
        id: r.id,
        name: r.name,
        whom: {
          id: r.whom,
          name: this.translateOrEmpty(EXAM_WHOM_KEYS[r.whom], lang),
        },
        topic: t
          ? {
              id: t.id,
              name: t.name,
              type: {
                id: t.type,
                name: this.translateOrEmpty(TOPIC_TYPE_KEYS[t.type], lang),
              },
            }
          : null,
        results: (resultsByExam.get(r.id) ?? []).map((wer) => ({
          id: wer.id,
          created: wer.created,
          ended: wer.ended,
          result: wer.result,
        })),
        deadline: r.deadline,
        variant: r.variant,
        tests_count: r.tests_count,
        active: r.active,
        minute: r.minute,
        chances: r.chances,
        description: r.description,
        camera: r.camera,
      };
    });

    return {
      current_page: page,
      total: Number(total),
      data,
    };
  }

  // GET /api/v1/exam/worker-exams/statistics
  //
  // Laravel: DashboardController::workerStatistics → ExamDashboardService::workerStatistics
  //   SUM(CASE WHEN result BETWEEN X AND Y THEN 1 ELSE 0 END) for 4 buckets.
  //   Default from = startOfYear, to = today.
  async statistics(
    q: QueryStatsLike,
  ): Promise<Array<{ label: string; count: number }>> {
    const workerId = this.ctx.user_or_fail.worker_id;
    const now = new Date();
    const defaultFrom = `${now.getFullYear()}-01-01`;
    const defaultTo = now.toISOString().slice(0, 10);
    const from = q.from ?? defaultFrom;
    const to = q.to ?? defaultTo;

    if (workerId == null) {
      // Laravel: agar worker_id null bo'lsa, query bo'sh natijalar qaytaradi.
      return [
        { label: '0-55', count: 0 },
        { label: '56-71', count: 0 },
        { label: '72-85', count: 0 },
        { label: '86-100', count: 0 },
      ];
    }

    const [row] = await this.db
      .select({
        r0_55: sql<number>`SUM(CASE WHEN ${worker_exams.result} BETWEEN 0 AND 55 THEN 1 ELSE 0 END)`,
        r56_71: sql<number>`SUM(CASE WHEN ${worker_exams.result} BETWEEN 56 AND 71 THEN 1 ELSE 0 END)`,
        r72_85: sql<number>`SUM(CASE WHEN ${worker_exams.result} BETWEEN 72 AND 85 THEN 1 ELSE 0 END)`,
        r86_100: sql<number>`SUM(CASE WHEN ${worker_exams.result} BETWEEN 86 AND 100 THEN 1 ELSE 0 END)`,
      })
      .from(worker_exams)
      .where(
        and(
          eq(worker_exams.worker_id, workerId),
          sql`${worker_exams.created_at} BETWEEN ${from} AND ${to}`,
          notDeleted(worker_exams),
        ),
      );

    return [
      { label: '0-55', count: Number(row?.r0_55 ?? 0) },
      { label: '56-71', count: Number(row?.r56_71 ?? 0) },
      { label: '72-85', count: Number(row?.r72_85 ?? 0) },
      { label: '86-100', count: Number(row?.r86_100 ?? 0) },
    ];
  }

  // POST /api/v1/exam/worker-exams/:examId/start
  //
  // Laravel: WorkerExamService::startExam
  //   1) Exam::findOrFail + exam_tests with('exam_tests:id,exam_id,exam_category_id,count')
  //   2) WorkerExam::where(worker, exam)->whereNotNull(created)->whereNull(ended) exists?
  //       → throw badRequest(messages.exam.created)
  //   3) Token = Str::random(60), WorkerExam::create(...)
  //   4) buildForExam: har exam_test'dan random `count` ta savol + options shuffle
  //   5) WorkerExamQuestion::insert(...) — answers ustuni JSON sifatida
  //   6) Return: {worker_exam_details, exam, questions, active_token}
  async start(examId: number) {
    const user = this.ctx.user_or_fail;
    const workerId = user.worker_id;
    if (workerId == null) {
      throw new BusinessException(400, this.i18n.t('messages.not_found'));
    }

    // 1) Exam + uning exam_tests'i.
    const [exam] = await this.db
      .select()
      .from(exams)
      .where(and(eq(exams.id, examId), notDeleted(exams)))
      .limit(1);
    if (!exam)
      throw new BusinessException(404, this.i18n.t('messages.not_found'));

    // 2) Tugamagan attemp bormi.
    const [running] = await this.db
      .select({ id: worker_exams.id })
      .from(worker_exams)
      .where(
        and(
          eq(worker_exams.worker_id, workerId),
          eq(worker_exams.exam_id, examId),
          sql`${worker_exams.created} IS NOT NULL`,
          sql`${worker_exams.ended} IS NULL`,
          notDeleted(worker_exams),
        ),
      )
      .limit(1);
    if (running) {
      throw new BusinessException(400, this.i18n.t('messages.exam.created'));
    }

    // 3) Token (60 a-zA-Z0-9 char — Laravel Str::random parity).
    const activeToken = randomAlnum(60);

    // exam_tests — exam ostidagi kategoriya+count map.
    const tests = await this.db
      .select({
        exam_category_id: exam_tests.exam_category_id,
        count: exam_tests.count,
      })
      .from(exam_tests)
      .where(and(eq(exam_tests.exam_id, examId), notDeleted(exam_tests)));

    // 4) buildForExam — har kategoriya'dan `count` ta random savol.
    //    inRandomOrder() + limit + options(select id,text,is_correct) + shuffle.
    type Built = {
      ques: string;
      options: Array<{
        id: number;
        category_question_id: number | null;
        text: string;
        is_correct: boolean;
      }>;
    };
    const built: Built[] = [];
    for (const t of tests) {
      const cnt = Number(t.count ?? 0);
      if (cnt <= 0 || t.exam_category_id == null) continue;
      // Eloquent inRandomOrder() → ORDER BY RANDOM().
      const qs = await this.db
        .select({
          id: exam_category_questions.id,
          ques: exam_category_questions.ques,
        })
        .from(exam_category_questions)
        .where(
          and(
            eq(exam_category_questions.exam_category_id, t.exam_category_id),
            notDeleted(exam_category_questions),
          ),
        )
        .orderBy(sql`RANDOM()`)
        .limit(cnt);
      if (qs.length === 0) continue;
      const qIds = qs.map((q) => q.id);
      const opts = await this.db
        .select({
          id: exam_category_options.id,
          category_question_id: exam_category_options.category_question_id,
          text: exam_category_options.text,
          is_correct: exam_category_options.is_correct,
        })
        .from(exam_category_options)
        .where(
          and(
            inArray(exam_category_options.category_question_id, qIds),
            notDeleted(exam_category_options),
          ),
        );
      const optsByQ = new Map<number, Built['options']>();
      for (const o of opts) {
        if (o.category_question_id == null) continue;
        const arr = optsByQ.get(o.category_question_id) ?? [];
        arr.push(o);
        optsByQ.set(o.category_question_id, arr);
      }
      for (const q of qs) {
        const list = (optsByQ.get(q.id) ?? []).slice();
        shuffleInPlace(list);
        built.push({ ques: q.ques ?? '', options: list });
      }
    }

    // Tranzaksiyada worker_exams + worker_exam_questions insert.
    const created = await this.db.transaction(async (tx) => {
      // worker_exams ID (MAX+1, Laravel parallel parity).
      const weId = await nextId(tx, worker_exams);
      await tx.insert(worker_exams).values({
        id: weId,
        exam_id: examId,
        topic_id: exam.topic_id ?? null,
        user_id: user.id,
        worker_id: workerId,
        created: sql`NOW()`,
        user_agent: this.ctx.user_agent ?? null,
        ip_address: this.ctx.ip ?? null,
        active_token: activeToken,
        created_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      });
      // Sequence advance — Laravel parallel parity.
      await tx.execute(
        sql`SELECT setval(pg_get_serial_sequence('worker_exams', 'id'), GREATEST((SELECT MAX(id) FROM worker_exams), 1))`,
      );

      // worker_exam_questions insert — Laravel ham INSERT bilan kiritadi.
      if (built.length > 0) {
        const rows = built.map((b) => ({
          worker_id: workerId,
          user_id: user.id,
          worker_exam_id: weId,
          question: b.ques,
          // Laravel Eloquent options collection'ni JSON sifatida saqlaydi.
          answers: b.options,
          created_at: sql`NOW()`,
          updated_at: sql`NOW()`,
        }));
        await tx.insert(worker_exam_questions).values(rows);
        await tx.execute(
          sql`SELECT setval(pg_get_serial_sequence('worker_exam_questions', 'id'), GREATEST((SELECT MAX(id) FROM worker_exam_questions), 1))`,
        );
      }

      return weId;
    });

    // 5) Response uchun ma'lumotlarni yig'ish.
    const [weRow] = await this.db
      .select({
        id: worker_exams.id,
        created: worker_exams.created,
        ended: worker_exams.ended,
        result: worker_exams.result,
        ip_address: worker_exams.ip_address,
        user_agent: worker_exams.user_agent,
      })
      .from(worker_exams)
      .where(eq(worker_exams.id, created))
      .limit(1);

    // UserInfoResource: user (id, uuid, worker, phone).
    const [userRow] = await this.db
      .select({ id: users.id, uuid: users.uuid, phone: users.phone })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    let workerInfo: {
      id: number;
      photo: string | null;
      last_name: string | null;
      first_name: string | null;
      middle_name: string | null;
    } | null = null;
    const [workerRow] = await this.db
      .select({
        id: workers.id,
        photo: workers.photo,
        last_name: workers.last_name,
        first_name: workers.first_name,
        middle_name: workers.middle_name,
      })
      .from(workers)
      .where(eq(workers.id, workerId))
      .limit(1);
    if (workerRow) {
      workerInfo = {
        id: workerRow.id,
        photo: await this.minio.fileUrl(workerRow.photo),
        last_name: workerRow.last_name,
        first_name: workerRow.first_name,
        middle_name: workerRow.middle_name,
      };
    }

    // Questions — insert qilingan qatorlarni qaytarish (ID asc, Eloquent get() parity).
    const qRows = await this.db
      .select({
        id: worker_exam_questions.id,
        question: worker_exam_questions.question,
        answers: worker_exam_questions.answers,
        result: worker_exam_questions.result,
      })
      .from(worker_exam_questions)
      .where(
        and(
          eq(worker_exam_questions.worker_id, workerId),
          eq(worker_exam_questions.worker_exam_id, created),
          notDeleted(worker_exam_questions),
        ),
      )
      .orderBy(worker_exam_questions.id);

    return {
      worker_exam_details: {
        id: weRow?.id ?? created,
        created: weRow?.created ?? null,
        ended: weRow?.ended ?? null,
        result: weRow?.result ?? null,
        ip_address: weRow?.ip_address ?? null,
        user_agent: weRow?.user_agent ?? null,
        user: userRow
          ? {
              id: userRow.id,
              uuid: userRow.uuid,
              worker: workerInfo,
              phone: userRow.phone,
            }
          : null,
      },
      exam: {
        id: exam.id,
        name: exam.name,
        deadline: exam.deadline,
        variant: exam.variant,
        minute: exam.minute,
        tests_count: exam.tests_count,
        chances: exam.chances,
        active: exam.active,
        description: exam.description,
        camera: exam.camera,
      },
      questions: qRows.map((r) => {
        // answers JSON-decoded array — har birini {id, text}'gacha qisqartirish.
        const opts = Array.isArray(r.answers) ? r.answers : [];
        return {
          id: r.id,
          question: r.question,
          answers: opts.map((o: any) => ({ id: o?.id, text: o?.text })),
          result: r.result,
        };
      }),
      active_token: activeToken,
    };
  }
  /**
   * GET /exam/worker-exams/:workerExamId/continue — Laravel WorkerExamService::continueExam.
   * active_token tekshiriladi; {worker_exam_details, exam, questions} qaytariladi.
   */
  async continue(workerExamId: number, activeToken?: string) {
    const [we] = await this.db
      .select()
      .from(worker_exams)
      .where(eq(worker_exams.id, workerExamId))
      .limit(1);
    if (!we) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    // assertActiveToken — boshqa qurilmadan kirish taqiqlangan.
    if (we.active_token !== (activeToken ?? null)) {
      throw new BusinessException(
        403,
        this.i18n.t('messages.exam.access_from_another_device_is_prohibited'),
      );
    }

    // user (UserInfoResource: id, uuid, worker(WorkerMinimal), phone).
    let user: Record<string, unknown> | null = null;
    const [u] = await this.db
      .select({
        id: users.id,
        uuid: users.uuid,
        phone: users.phone,
        w_id: workers.id,
        w_photo: workers.photo,
        w_last: workers.last_name,
        w_first: workers.first_name,
        w_middle: workers.middle_name,
      })
      .from(users)
      .leftJoin(workers, eq(workers.id, users.worker_id))
      .where(eq(users.id, we.user_id))
      .limit(1);
    if (u) {
      user = {
        id: u.id,
        uuid: u.uuid,
        worker: u.w_id
          ? {
              id: u.w_id,
              photo: await this.minio.fileUrl(u.w_photo),
              last_name: u.w_last,
              first_name: u.w_first,
              middle_name: u.w_middle,
            }
          : null,
        phone: u.phone,
      };
    }

    // exam (ExamInfoResource).
    const [exam] = await this.db
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
      .where(eq(exams.id, we.exam_id))
      .limit(1);

    // questions (WorkerExamQuestionsResource: answers = json → [{id, text}]).
    const qs = await this.db
      .select({
        id: worker_exam_questions.id,
        question: worker_exam_questions.question,
        answers: worker_exam_questions.answers,
        result: worker_exam_questions.result,
      })
      .from(worker_exam_questions)
      .where(eq(worker_exam_questions.worker_exam_id, workerExamId))
      // Laravel WorkerExam::questions() hasMany ->orderBy('id').
      .orderBy(worker_exam_questions.id);

    return {
      worker_exam_details: {
        id: we.id,
        created: we.created,
        ended: we.ended,
        result: we.result,
        ip_address: we.ip_address,
        user_agent: we.user_agent,
        user,
      },
      exam: exam ?? null,
      questions: qs.map((q) => ({
        id: q.id,
        question: q.question,
        answers: Array.isArray(q.answers)
          ? (q.answers as { id: number; text: string }[]).map((a) => ({
              id: a.id,
              text: a.text,
            }))
          : [],
        result: q.result,
      })),
    };
  }
  // GET /worker-exams/:workerExamId/finished — Laravel WorkerExamService::finishExam.
  //   result = questions.where('is_correct', 1).count() → update(ended=now, result).
  async finish(workerExamId: number, activeToken?: string) {
    const [we] = await this.db
      .select({
        id: worker_exams.id,
        created: worker_exams.created,
        ip_address: worker_exams.ip_address,
        user_agent: worker_exams.user_agent,
        active_token: worker_exams.active_token,
        user_id: worker_exams.user_id,
      })
      .from(worker_exams)
      .where(eq(worker_exams.id, workerExamId))
      .limit(1);
    if (!we) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    // assertActiveToken — boshqa qurilmadan kirish taqiqlangan.
    if (we.active_token !== (activeToken ?? null)) {
      throw new BusinessException(
        403,
        this.i18n.t('messages.exam.access_from_another_device_is_prohibited'),
      );
    }

    // result = to'g'ri javoblar soni (is_correct = true).
    const [{ c }] = await this.db
      .select({ c: count() })
      .from(worker_exam_questions)
      .where(
        and(
          eq(worker_exam_questions.worker_exam_id, workerExamId),
          eq(worker_exam_questions.is_correct, true),
        ),
      );
    const result = Number(c);

    await this.db
      .update(worker_exams)
      .set({ ended: sql`NOW()`, result, updated_at: sql`NOW()` })
      .where(eq(worker_exams.id, workerExamId));

    // WorkerExamResultResource: {id, created, ended, result, ip_address,
    // user_agent, user}.
    const [u] = await this.db
      .select({
        id: users.id,
        uuid: users.uuid,
        last_name: workers.last_name,
        first_name: workers.first_name,
        middle_name: workers.middle_name,
      })
      .from(users)
      .leftJoin(workers, eq(workers.id, users.worker_id))
      .where(eq(users.id, we.user_id))
      .limit(1);

    return {
      id: we.id,
      created: we.created,
      ended: new Date().toISOString(),
      result,
      ip_address: we.ip_address,
      user_agent: we.user_agent,
      user: u ?? null,
    };
  }
  // GET /api/v1/exam/worker-exams/:workerExamId/result
  //
  // Laravel: WorkerExamService::results
  //   $workerExam = WorkerExam::with('questions')->findOrFail($workerExamId);
  //   if (!$workerExam->ended) throw badRequest(messages.exam.exam_not_ended);
  //   return WorkerExamQuestionsResource::collection(
  //     $workerExam->questions->where('is_correct', 0)
  //   );
  //
  // Resource shape: {id, question, answers: [{id, text}], result}.
  async results(workerExamId: number) {
    const [we] = await this.db
      .select({
        id: worker_exams.id,
        ended: worker_exams.ended,
      })
      .from(worker_exams)
      .where(eq(worker_exams.id, workerExamId))
      .limit(1);
    if (!we) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    if (we.ended == null) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.exam.exam_not_ended'),
      );
    }

    // is_correct=false → noto'g'ri javob berilgan savollar.
    const qRows = await this.db
      .select({
        id: worker_exam_questions.id,
        question: worker_exam_questions.question,
        answers: worker_exam_questions.answers,
        result: worker_exam_questions.result,
      })
      .from(worker_exam_questions)
      .where(
        and(
          eq(worker_exam_questions.worker_exam_id, workerExamId),
          eq(worker_exam_questions.is_correct, false),
          notDeleted(worker_exam_questions),
        ),
      )
      .orderBy(worker_exam_questions.id);

    return qRows.map((r) => {
      const opts = Array.isArray(r.answers) ? r.answers : [];
      return {
        id: r.id,
        question: r.question,
        answers: opts.map((o: any) => ({ id: o?.id, text: o?.text })),
        result: r.result,
      };
    });
  }
  /**
   * POST /exam/worker-exams/:examId/send-result/:questionId — Laravel
   * WorkerExamService::sendResult. active_token + expiry tekshiriladi; tanlangan
   * javob (result) saqlanadi, is_correct = (result === to'g'ri javob id).
   */
  async sendResult(
    _examId: number,
    questionId: number,
    result: number,
    activeToken?: string,
  ): Promise<void> {
    // WorkerExamQuestion::with('worker_exam.exam')->findOrFail.
    const [q] = await this.db
      .select({
        id: worker_exam_questions.id,
        answers: worker_exam_questions.answers,
        we_created: worker_exams.created,
        we_ended: worker_exams.ended,
        we_active_token: worker_exams.active_token,
        exam_minute: exams.minute,
      })
      .from(worker_exam_questions)
      .innerJoin(
        worker_exams,
        eq(worker_exams.id, worker_exam_questions.worker_exam_id),
      )
      .leftJoin(exams, eq(exams.id, worker_exams.exam_id))
      .where(eq(worker_exam_questions.id, questionId))
      .limit(1);
    if (!q) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    // assertActiveToken — boshqa qurilmadan kirish taqiqlangan.
    if (q.we_active_token !== (activeToken ?? null)) {
      throw new BusinessException(
        403,
        this.i18n.t('messages.exam.access_from_another_device_is_prohibited'),
      );
    }

    // assertExamNotExpired — created + exam.minute < now() YOKI ended → 400.
    const createdMs = q.we_created
      ? new Date(q.we_created).getTime()
      : Number.NaN;
    const deadlineMs = createdMs + (q.exam_minute ?? 0) * 60_000;
    if (q.we_ended || deadlineMs < Date.now()) {
      throw new BusinessException(
        400,
        this.i18n.t(
          'messages.exam.this_exam_has_already_been_completed_or_expired',
        ),
      );
    }

    // answers JSON ichidan to'g'ri javobni (is_correct == 1) topamiz.
    const answers = Array.isArray(q.answers)
      ? (q.answers as { id: number; is_correct?: number | boolean }[])
      : [];
    const correct = answers.find(
      (a) => a.is_correct === 1 || a.is_correct === true,
    );

    await this.db
      .update(worker_exam_questions)
      .set({
        result,
        is_correct: correct != null && result === correct.id,
        updated_at: sql`NOW()`,
      })
      .where(eq(worker_exam_questions.id, questionId));
  }

  async destroy(examId: number) {
    await this.db
      .update(worker_exams)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(worker_exams.id, examId));
  }

  // i18n.t() agar kalit topilmasa kalitning o'zini qaytarishi mumkin —
  // bunday holda bo'sh string'ga aylantiramiz (Laravel ExamWhomEnum::get parity).
  private translateOrEmpty(key: string | undefined, lang: string): string {
    if (!key) return '';
    const v = this.i18n.t(key, { lang });
    return typeof v === 'string' && v !== key ? v : '';
  }
}

// Laravel Str::random(60) parity — 60 ta tasodifiy alfa-numeric belgi.
function randomAlnum(len: number): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) {
    out += chars[bytes[i] % chars.length];
  }
  return out;
}

// Fisher-Yates shuffle (Laravel Collection::shuffle parity).
function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
