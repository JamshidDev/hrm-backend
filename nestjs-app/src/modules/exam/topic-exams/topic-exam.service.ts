// Topic exam service. Laravel: Exam/TopicExamController.
// Topic ichidagi imtihonlar ustida CRUD + filter/exams + solved-workers.

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import {
  departments,
  exam_categories,
  exam_positions,
  exam_tests,
  exam_workers,
  exams,
  organizations,
  positions as positionsTable,
  topics,
  worker_exams,
  worker_positions,
  workers,
} from '@/db/schema';
import { nextId, pageOf } from '@/modules/exam/_shared/helpers';
import { examWhomName } from '@/modules/exam/_shared/enums';
import { getShortPosition } from '@/modules/hr/_shared/position-helper';
import type {
  CreateExamDto,
  QueryTopicExamDto,
  UpdateExamDto,
} from '@/modules/exam/topic-exams/dto/topic-exam.dto';

// Laravel ExamResource shape: id, name, whom: {id, name}, deadline, variant,
// minute, tests_count, chances, active, description, camera.
function toExamResource(row: typeof exams.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    whom: { id: row.whom, name: examWhomName(row.whom ?? 0) },
    deadline: row.deadline,
    variant: row.variant,
    minute: row.minute,
    tests_count: row.tests_count,
    chances: row.chances,
    active: row.active,
    description: row.description,
    camera: row.camera,
  };
}

@Injectable()
export class TopicExamService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
    private readonly i18n: I18nService,
  ) {}

  // Topic ichidagi imtihonlar ro'yxati. Laravel orderByDesc('id'), ExamResource.
  async list(topicId: number, q: QueryTopicExamDto) {
    const { page, perPage, offset } = pageOf(q);
    const where = and(eq(exams.topic_id, topicId), notDeleted(exams));
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(exams)
        .where(where)
        .orderBy(desc(exams.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(exams).where(where),
    ]);
    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows.map(toExamResource),
    };
  }

  // Bitta imtihon. Laravel TopicExamService::show — whom bo'yicha 4 xil Resource:
  //   whom=2 → ExamPositionResource (with 'positions')
  //   whom=3 → ExamWorkerPositionResource (with 'worker_positions' detail)
  //   whom=5 → ExamWorkerResource (with 'workers')
  //   default → ExamResource (with `description`).
  async show(_topicId: number, examId: number) {
    const [row] = await this.db
      .select()
      .from(exams)
      .where(eq(exams.id, examId))
      .limit(1);
    if (!row) throw new BusinessException(404, 'not_found');

    const base = {
      id: row.id,
      name: row.name,
      whom: { id: row.whom, name: examWhomName(row.whom ?? 0) },
      deadline: row.deadline,
      variant: row.variant,
      minute: row.minute,
      tests_count: row.tests_count,
      chances: row.chances,
      active: row.active,
    };

    // whom=2 — positions
    if (row.whom === 2) {
      const positionRows = await this.db
        .select({
          id: positionsTable.id,
          name: positionsTable.name,
          name_ru: positionsTable.name_ru,
          classification_index: positionsTable.classification_index,
          classification_code: positionsTable.classification_code,
        })
        .from(exam_positions)
        .innerJoin(
          positionsTable,
          and(
            eq(positionsTable.id, exam_positions.position_id),
            isNull(positionsTable.deleted_at),
          ),
        )
        .where(eq(exam_positions.exam_id, examId));
      return {
        ...base,
        positions: positionRows.map((p) => ({
          id: p.id,
          name: p.name,
          name_ru: p.name_ru,
          classification_index: p.classification_index,
          classification_code: p.classification_code,
        })),
        camera: row.camera,
      };
    }

    // whom=3 — worker_positions detailed (WorkerPositionOnlyResource)
    if (row.whom === 3) {
      const wpRows = await this.db
        .select({
          id: worker_positions.id,
          w_id: workers.id,
          w_photo: workers.photo,
          w_last: workers.last_name,
          w_first: workers.first_name,
          w_middle: workers.middle_name,
          org_full_name: organizations.full_name,
          dept_name: departments.name,
          dept_level: departments.level,
          pos_name: positionsTable.name,
        })
        .from(exam_workers)
        .innerJoin(
          worker_positions,
          eq(worker_positions.id, exam_workers.worker_position_id),
        )
        .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
        .leftJoin(
          organizations,
          and(
            eq(organizations.id, worker_positions.organization_id),
            isNull(organizations.deleted_at),
          ),
        )
        .leftJoin(
          departments,
          and(
            eq(departments.id, worker_positions.department_id),
            isNull(departments.deleted_at),
          ),
        )
        .leftJoin(
          positionsTable,
          and(
            eq(positionsTable.id, worker_positions.position_id),
            isNull(positionsTable.deleted_at),
          ),
        )
        .where(eq(exam_workers.exam_id, examId));

      const workersData = await Promise.all(
        wpRows.map(async (r) => ({
          id: r.id,
          worker: r.w_id
            ? {
                id: r.w_id,
                photo: await this.minio.fileUrl(r.w_photo),
                last_name: r.w_last,
                first_name: r.w_first,
                middle_name: r.w_middle,
              }
            : null,
          post_name: getShortPosition({
            position_name: r.pos_name,
            department_name: r.dept_name,
            department_level: r.dept_level,
            organization_full_name: r.org_full_name,
          }),
        })),
      );
      return { ...base, workers: workersData, camera: row.camera };
    }

    // whom=5 — workers (ExamWorkersShowResource)
    if (row.whom === 5) {
      const wRows = await this.db
        .select({
          ew_id: exam_workers.id,
          ew_worker_position_id: exam_workers.worker_position_id,
          id: workers.id,
          uuid: workers.uuid,
          photo: workers.photo,
          last_name: workers.last_name,
          first_name: workers.first_name,
          middle_name: workers.middle_name,
          birthday: workers.birthday,
        })
        .from(exam_workers)
        .innerJoin(workers, eq(workers.id, exam_workers.worker_id))
        .where(eq(exam_workers.exam_id, examId));

      const workersData = await Promise.all(
        wRows.map(async (r) => ({
          id: r.id,
          uuid: r.uuid,
          photo: await this.minio.fileUrl(r.photo),
          last_name: r.last_name,
          first_name: r.first_name,
          middle_name: r.middle_name,
          birthday: r.birthday,
          worker_position_id: r.ew_worker_position_id,
        })),
      );
      return { ...base, workers: workersData, camera: row.camera };
    }

    // default — ExamResource with description.
    return {
      ...base,
      description: row.description,
      camera: row.camera,
    };
  }

  // Yangi imtihon yaratish. Laravel TopicExamService::store —
  //   findOrFail(topic), organization_id = user.org, active=false (force),
  //   syncWhom(whom_ids, exam, whom).
  async create(topicId: number, dto: CreateExamDto) {
    // Laravel `Topic::findOrFail($topicId)` parity.
    const [topic] = await this.db
      .select({ id: topics.id })
      .from(topics)
      .where(and(eq(topics.id, topicId), notDeleted(topics)))
      .limit(1);
    if (!topic) throw new BusinessException(404, 'not_found');

    await this.db.transaction(async (tx) => {
      const id = await nextId(tx, exams);
      await tx.insert(exams).values({
        id,
        topic_id: topicId,
        name: dto.name,
        deadline: dto.deadline ?? null,
        variant: dto.variant ?? 4,
        minute: dto.minute ?? 45,
        tests_count: dto.tests_count ?? 36,
        chances: dto.chances ?? 1,
        // Laravel: $data['active'] = false; force.
        active: false,
        description: dto.description ?? null,
        whom: dto.whom ?? 1,
        camera: dto.camera ?? false,
        user_id: this.ctx.user_or_fail.id,
        created_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      });
      // Sequence advance — Laravel parallel parity.
      await tx.execute(
        sql`SELECT setval(pg_get_serial_sequence('exams', 'id'), GREATEST((SELECT MAX(id) FROM exams), 1))`,
      );

      // syncWhom: whom=2 → exam_positions, whom=3 → exam_workers.
      await this.syncWhom(tx, id, dto.whom ?? 1, dto.whom_ids ?? []);
    });
  }

  // Laravel TopicExamService::syncWhom.
  private async syncWhom(
    tx: DataSource,
    examId: number,
    whom: number,
    ids: number[],
  ): Promise<void> {
    if (whom === 2 && ids.length > 0) {
      // Position sync (exam_positions pivot).
      await tx.delete(exam_positions).where(eq(exam_positions.exam_id, examId));
      await tx.insert(exam_positions).values(
        ids.map((position_id) => ({ exam_id: examId, position_id })),
      );
      await tx.execute(
        sql`SELECT setval(pg_get_serial_sequence('exam_positions', 'id'), GREATEST((SELECT MAX(id) FROM exam_positions), 1))`,
      );
      return;
    }

    if (whom === 3 && ids.length > 0) {
      // worker_positions → worker_id mapping.
      const wpRows = await tx
        .select({
          id: worker_positions.id,
          worker_id: worker_positions.worker_id,
        })
        .from(worker_positions)
        .where(inArray(worker_positions.id, ids));

      await tx.delete(exam_workers).where(eq(exam_workers.exam_id, examId));
      const pivotRows = wpRows
        .filter((wp) => wp.worker_id != null)
        .map((wp) => ({
          exam_id: examId,
          worker_id: wp.worker_id as number,
          worker_position_id: wp.id,
        }));
      if (pivotRows.length > 0) {
        await tx.insert(exam_workers).values(pivotRows);
        await tx.execute(
          sql`SELECT setval(pg_get_serial_sequence('exam_workers', 'id'), GREATEST((SELECT MAX(id) FROM exam_workers), 1))`,
        );
      }
      return;
    }
  }

  // Laravel TopicExamService::update — PATCH-style:
  //   1) topic_id force-set
  //   2) Topic::findOrFail (404)
  //   3) IF active=true va tests_count > SUM(exam_tests.count) → 400
  //   4) exam->update($data)
  //   5) syncWhom($data['whom_ids'] ?? [], $exam, $data['whom'] ?? $exam->whom)
  async update(topicId: number, examId: number, dto: UpdateExamDto) {
    // Topic mavjudligini tekshirish.
    const [topic] = await this.db
      .select({ id: topics.id })
      .from(topics)
      .where(and(eq(topics.id, topicId), notDeleted(topics)))
      .limit(1);
    if (!topic) throw new BusinessException(404, 'not_found');

    // Mavjud exam'ni olamiz (tests_count + whom default uchun).
    const [exam] = await this.db
      .select()
      .from(exams)
      .where(eq(exams.id, examId))
      .limit(1);
    if (!exam) throw new BusinessException(404, 'not_found');

    // Laravel validation: active=true bo'lsa, tests_count = SUM(exam_tests.count).
    if (dto.active === true) {
      const targetTestsCount = dto.tests_count ?? exam.tests_count;
      const [{ totalCount }] = await this.db
        .select({ totalCount: sql<number>`COALESCE(SUM(${exam_tests.count}), 0)` })
        .from(exam_tests)
        .where(eq(exam_tests.exam_id, examId));
      if (Number(targetTestsCount) > Number(totalCount)) {
        throw new BusinessException(
          400,
          this.i18n.t('messages.exam.the_number_of_tests_is_not_equal') as string,
        );
      }
    }

    await this.db.transaction(async (tx) => {
      // Build update data (PATCH semantics).
      const data: Record<string, unknown> = {
        updated_at: sql`NOW()`,
        topic_id: topicId, // Laravel force-sets topic_id.
      };
      if (dto.name !== undefined) data.name = dto.name;
      if (dto.deadline !== undefined) data.deadline = dto.deadline;
      if (dto.variant !== undefined) data.variant = dto.variant;
      if (dto.minute !== undefined) data.minute = dto.minute;
      if (dto.tests_count !== undefined) data.tests_count = dto.tests_count;
      if (dto.chances !== undefined) data.chances = dto.chances;
      if (dto.active !== undefined) data.active = dto.active;
      if (dto.description !== undefined) data.description = dto.description;
      if (dto.whom !== undefined) data.whom = dto.whom;
      if (dto.camera !== undefined) data.camera = dto.camera;
      await tx.update(exams).set(data).where(eq(exams.id, examId));

      // syncWhom — whom_ids ham, whom ham keladi (yoki avvalgi exam.whom).
      if (dto.whom_ids !== undefined) {
        const whom = dto.whom ?? exam.whom ?? 1;
        await this.syncWhom(tx, examId, whom, dto.whom_ids);
      }
    });
  }

  // Soft-delete.
  async remove(_topicId: number, examId: number) {
    await this.db
      .update(exams)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(exams.id, examId));
  }

  // Laravel: filter/exams — PaginateResource bilan o'ralgan dropdown ro'yxati.
  async filter(q: QueryTopicExamDto) {
    const { page, perPage, offset } = pageOf(q);
    const where = notDeleted(exams);
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({ id: exams.id, name: exams.name, topic_id: exams.topic_id })
        .from(exams)
        .where(where)
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(exams).where(where),
    ]);
    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows,
    };
  }

  // Imtihonni topshirgan xodimlar ro'yxati (worker_exams jadvalidan).
  async solvedWorkers(_topicId: number, examId: number, q: QueryTopicExamDto) {
    const { page, perPage, offset } = pageOf(q);
    const where = and(
      eq(worker_exams.exam_id, examId),
      notDeleted(worker_exams),
    );
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(worker_exams)
        .where(where)
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(worker_exams).where(where),
    ]);
    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows,
    };
  }

  // Laravel: TopicExamQuestionService::attachQuestions — transaction ichida
  //   1) exam_tests WHERE exam_id = $examId — forceDelete (hard),
  //   2) yangi savollarni insert.
  async attachQuestion(
    examId: number,
    questions: Array<{ exam_category_id: number; count: number }>,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      // forceDelete — hard delete (not soft).
      await tx.delete(exam_tests).where(eq(exam_tests.exam_id, examId));

      if (questions.length === 0) return;

      await tx.insert(exam_tests).values(
        questions.map((q) => ({
          exam_id: examId,
          exam_category_id: q.exam_category_id,
          count: q.count,
          created_at: sql`NOW()`,
          updated_at: sql`NOW()`,
        })),
      );
    });
  }

  // Laravel: TopicExamQuestionController::questions — Exam::with('categories.category')
  //   ->findOrFail($examId); TopicExamCategoriesResource::collection.
  // Resource: {id, category: {id, name}, count}. Paginatsiyasiz flat array.
  async questions(examId: number, _q: QueryTopicExamDto) {
    // Laravel findOrFail — exam mavjudligini tekshirish.
    const [examRow] = await this.db
      .select({ id: exams.id })
      .from(exams)
      .where(eq(exams.id, examId))
      .limit(1);
    if (!examRow) throw new BusinessException(404, 'not_found');

    // exam_tests + category (eager-loaded).
    const rows = await this.db
      .select({
        id: exam_tests.id,
        count: exam_tests.count,
        cat_id: exam_categories.id,
        cat_name: exam_categories.name,
      })
      .from(exam_tests)
      .leftJoin(
        exam_categories,
        eq(exam_categories.id, exam_tests.exam_category_id),
      )
      .where(
        and(eq(exam_tests.exam_id, examId), isNull(exam_tests.deleted_at)),
      );

    return rows.map((r) => ({
      id: r.id,
      category: r.cat_id ? { id: r.cat_id, name: r.cat_name } : null,
      count: r.count,
    }));
  }
}
