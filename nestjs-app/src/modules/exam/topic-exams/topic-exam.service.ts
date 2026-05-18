// Topic exam service. Laravel: Exam/TopicExamController.
// Topic ichidagi imtihonlar ustida CRUD + filter/exams + solved-workers.

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { exams, worker_exams } from '@/db/schema';
import { nextId, pageOf } from '@/modules/exam/_shared/helpers';
import { examWhomName } from '@/modules/exam/_shared/enums';
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

  // Bitta imtihon. Topilmasa 404. ExamResource shape'i bilan qaytadi.
  async show(_topicId: number, examId: number) {
    const [row] = await this.db.select().from(exams).where(eq(exams.id, examId)).limit(1);
    if (!row) throw new BusinessException(404, 'not_found');
    return toExamResource(row);
  }

  // Yangi imtihon yaratish; default qiymatlar Laravel'dagi default'lar.
  async create(topicId: number, dto: CreateExamDto) {
    const id = await nextId(this.db, exams);
    await this.db.insert(exams).values({
      id,
      topic_id: topicId,
      name: dto.name,
      deadline: dto.deadline ?? null,
      variant: dto.variant ?? 4,
      minute: dto.minute ?? 45,
      tests_count: dto.tests_count ?? 36,
      chances: dto.chances ?? 1,
      active: dto.active ?? false,
      description: dto.description ?? null,
      whom: dto.whom ?? 1,
      camera: dto.camera ?? false,
      user_id: this.ctx.user_or_fail.id,
    });
  }

  // Mavjud imtihonni qisman yangilash.
  async update(_topicId: number, examId: number, dto: UpdateExamDto) {
    const data: Record<string, unknown> = { updated_at: sql`NOW()` };
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
    await this.db.update(exams).set(data).where(eq(exams.id, examId));
  }

  // Soft-delete.
  async remove(_topicId: number, examId: number) {
    await this.db.update(exams).set({ deleted_at: sql`NOW()` }).where(eq(exams.id, examId));
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
    return { current_page: page, per_page: perPage, total: Number(total), data: rows };
  }

  // Imtihonni topshirgan xodimlar ro'yxati (worker_exams jadvalidan).
  async solvedWorkers(_topicId: number, examId: number, q: QueryTopicExamDto) {
    const { page, perPage, offset } = pageOf(q);
    const where = and(eq(worker_exams.exam_id, examId), notDeleted(worker_exams));
    const [rows, [{ total }]] = await Promise.all([
      this.db.select().from(worker_exams).where(where).limit(perPage).offset(offset),
      this.db.select({ total: count() }).from(worker_exams).where(where),
    ]);
    return { current_page: page, per_page: perPage, total: Number(total), data: rows };
  }

  // Laravel: TopicExamQuestionController::attachQuestion — external linking job.
  // Hozir stub: javob true qaytaramiz (frontend uchun).
  async attachQuestion(_examId: number, _body: unknown) {
    return { attached: true };
  }

  // Laravel: TopicExamQuestionController::questions — biriktirilgan savollar
  // ro'yxati. Hozir bo'sh paginatsiya qaytaramiz.
  async questions(_examId: number, q: QueryTopicExamDto) {
    const { page, perPage } = pageOf(q);
    return { current_page: page, per_page: perPage, total: 0, data: [] as Array<unknown> };
  }
}
