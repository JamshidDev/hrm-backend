// Category question service. Laravel: Exam/TopicQuestionController.
// Resource: /api/v1/exam/categories/{categoryId}/questions.

import { Injectable } from '@nestjs/common';
import { and, count, eq, inArray, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { exam_category_options, exam_category_questions } from '@/db/schema';
import { nextId, pageOf } from '@/modules/exam/_shared/helpers';
import type {
  CreateQuestionDto,
  QueryCategoryQuestionDto,
  UpdateQuestionDto,
} from '@/modules/exam/category-questions/dto/category-question.dto';

@Injectable()
export class CategoryQuestionService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  // Kategoriya savollarini variantlari bilan ro'yxatlash (N+1 oldini olish — batch join).
  async list(categoryId: number, q: QueryCategoryQuestionDto) {
    const { page, perPage, offset } = pageOf(q);
    const where = and(
      eq(exam_category_questions.exam_category_id, categoryId),
      notDeleted(exam_category_questions),
    );
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(exam_category_questions)
        .where(where)
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(exam_category_questions).where(where),
    ]);

    // Savollarning variantlarini bitta batch query bilan olamiz.
    const qIds = rows.map((r) => r.id);
    const opts = qIds.length
      ? await this.db
          .select()
          .from(exam_category_options)
          .where(
            and(
              inArray(exam_category_options.category_question_id, qIds),
              notDeleted(exam_category_options),
            ),
          )
      : [];
    const optMap = new Map<number, any[]>();
    for (const o of opts) {
      const cid = o.category_question_id as number;
      if (!optMap.has(cid)) optMap.set(cid, []);
      optMap.get(cid)!.push(o);
    }
    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows.map((r) => ({ ...r, options: optMap.get(r.id) ?? [] })),
    };
  }

  // Bitta savolni variantlari bilan ko'rsatish.
  async show(_categoryId: number, questionId: number) {
    const [row] = await this.db
      .select()
      .from(exam_category_questions)
      .where(eq(exam_category_questions.id, questionId))
      .limit(1);
    if (!row) throw new BusinessException(404, 'not_found');
    const opts = await this.db
      .select()
      .from(exam_category_options)
      .where(
        and(
          eq(exam_category_options.category_question_id, questionId),
          notDeleted(exam_category_options),
        ),
      );
    return { ...row, options: opts };
  }

  // Savol + variantlarni transaction'siz yaratish (Laravel parity uchun).
  async create(categoryId: number, dto: CreateQuestionDto) {
    const id = await nextId(this.db, exam_category_questions);
    await this.db.insert(exam_category_questions).values({
      id,
      exam_category_id: categoryId,
      ques: dto.ques,
    });
    if (dto.options?.length) {
      let baseId = await nextId(this.db, exam_category_options);
      const optValues = dto.options.map((o) => ({
        id: baseId++,
        category_question_id: id,
        text: o.text,
        is_correct: o.is_correct ?? false,
      }));
      await this.db.insert(exam_category_options).values(optValues);
    }
    return { id };
  }

  async update(_categoryId: number, questionId: number, dto: UpdateQuestionDto) {
    await this.db
      .update(exam_category_questions)
      .set({ ques: dto.ques, updated_at: sql`NOW()` })
      .where(eq(exam_category_questions.id, questionId));
  }

  async remove(_categoryId: number, questionId: number) {
    await this.db
      .update(exam_category_questions)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(exam_category_questions.id, questionId));
  }
}
