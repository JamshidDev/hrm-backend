// Category question service. Laravel: Exam/TopicQuestionController.
// Resource: /api/v1/exam/categories/{categoryId}/questions.

import { Injectable } from '@nestjs/common';
import { and, count, eq, inArray, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import {
  exam_categories,
  exam_category_options,
  exam_category_questions,
} from '@/db/schema';
import { nextId, pageOf } from '@/modules/exam/_shared/helpers';
import type {
  CreateQuestionDto,
  QueryCategoryQuestionDto,
  UpdateQuestionDto,
} from '@/modules/exam/category-questions/dto/category-question.dto';

@Injectable()
export class CategoryQuestionService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  // Laravel TopicQuestionService::index — TopicQuestionResource:
  //   {id, ques, exam_category:{id,name,questions_count}, options:[{id,text,is_correct}]}.
  async list(categoryId: number, q: QueryCategoryQuestionDto) {
    const { page, perPage, offset } = pageOf(q);
    const where = and(
      eq(exam_category_questions.exam_category_id, categoryId),
      notDeleted(exam_category_questions),
    );
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: exam_category_questions.id,
          ques: exam_category_questions.ques,
          exam_category_id: exam_category_questions.exam_category_id,
        })
        .from(exam_category_questions)
        .where(where)
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(exam_category_questions)
        .where(where),
    ]);

    // Laravel `with('exam_category')` — `withCount('questions')` chaqirilmagani
    // uchun `exam_category->questions_count` = null.
    const catIds = [
      ...new Set(
        rows
          .map((r) => r.exam_category_id)
          .filter((id): id is number => id != null),
      ),
    ];
    const catRows = catIds.length
      ? await this.db
          .select({ id: exam_categories.id, name: exam_categories.name })
          .from(exam_categories)
          .where(inArray(exam_categories.id, catIds))
      : [];
    const catMap = new Map<
      number,
      { id: number; name: string | null; questions_count: null }
    >();
    for (const c of catRows) {
      catMap.set(c.id, {
        id: c.id,
        name: c.name,
        questions_count: null,
      });
    }

    // Options — batch.
    const qIds = rows.map((r) => r.id);
    const opts = qIds.length
      ? await this.db
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
          )
      : [];
    const optMap = new Map<
      number,
      Array<{ id: number; text: string | null; is_correct: boolean | null }>
    >();
    for (const o of opts) {
      const cid = o.category_question_id as number;
      if (!optMap.has(cid)) optMap.set(cid, []);
      optMap
        .get(cid)!
        .push({ id: o.id, text: o.text, is_correct: o.is_correct });
    }

    return {
      current_page: page,
      total: Number(total),
      data: rows.map((r) => ({
        id: r.id,
        ques: r.ques,
        exam_category:
          r.exam_category_id != null
            ? (catMap.get(r.exam_category_id) ?? null)
            : null,
        options: optMap.get(r.id) ?? [],
      })),
    };
  }

  // Bitta savolni variantlari bilan ko'rsatish. Laravel TopicQuestionResource.
  async show(_categoryId: number, questionId: number) {
    const [row] = await this.db
      .select({
        id: exam_category_questions.id,
        ques: exam_category_questions.ques,
        exam_category_id: exam_category_questions.exam_category_id,
      })
      .from(exam_category_questions)
      .where(eq(exam_category_questions.id, questionId))
      .limit(1);
    if (!row) throw new BusinessException(404, 'not_found');

    const [catRow, opts] = await Promise.all([
      row.exam_category_id != null
        ? this.db
            .select({
              id: exam_categories.id,
              name: exam_categories.name,
            })
            .from(exam_categories)
            .where(eq(exam_categories.id, row.exam_category_id))
            .limit(1)
        : Promise.resolve([] as Array<{ id: number; name: string | null }>),
      this.db
        .select({
          id: exam_category_options.id,
          text: exam_category_options.text,
          is_correct: exam_category_options.is_correct,
        })
        .from(exam_category_options)
        .where(
          and(
            eq(exam_category_options.category_question_id, questionId),
            notDeleted(exam_category_options),
          ),
        ),
    ]);
    // Laravel show — withCount yo'q → questions_count: null.
    const cat = catRow[0];
    return {
      id: row.id,
      ques: row.ques,
      exam_category: cat
        ? { id: cat.id, name: cat.name, questions_count: null as number | null }
        : null,
      options: opts,
    };
  }

  // Laravel TopicQuestionService::store — transaction: question + options.
  async create(categoryId: number, dto: CreateQuestionDto) {
    return this.db.transaction(async (tx) => {
      const id = await nextId(tx, exam_category_questions);
      await tx.insert(exam_category_questions).values({
        id,
        exam_category_id: categoryId,
        ques: dto.ques,
        created_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      });
      // Sequence advance — Laravel parallel parity.
      await tx.execute(
        sql`SELECT setval(pg_get_serial_sequence('exam_category_questions', 'id'), GREATEST((SELECT MAX(id) FROM exam_category_questions), 1))`,
      );

      if (dto.options?.length) {
        await tx.insert(exam_category_options).values(
          dto.options.map((o) => ({
            category_question_id: id,
            text: o.text,
            is_correct: o.is_correct ?? false,
            created_at: sql`NOW()`,
            updated_at: sql`NOW()`,
          })),
        );
        await tx.execute(
          sql`SELECT setval(pg_get_serial_sequence('exam_category_options', 'id'), GREATEST((SELECT MAX(id) FROM exam_category_options), 1))`,
        );
      }
      return { id };
    });
  }

  // Laravel TopicQuestionService::update — findOrFail + transaction:
  //   1) question.update({exam_category_id, ques})
  //   2) DELETE FROM exam_category_options WHERE category_question_id = ...
  //   3) INSERT new options.
  async update(
    categoryId: number,
    questionId: number,
    dto: UpdateQuestionDto,
  ) {
    // Laravel findOrFail parity.
    const [row] = await this.db
      .select({ id: exam_category_questions.id })
      .from(exam_category_questions)
      .where(eq(exam_category_questions.id, questionId))
      .limit(1);
    if (!row) throw new BusinessException(404, 'not_found');

    await this.db.transaction(async (tx) => {
      await tx
        .update(exam_category_questions)
        .set({
          exam_category_id: categoryId,
          ques: dto.ques,
          updated_at: sql`NOW()`,
        })
        .where(eq(exam_category_questions.id, questionId));

      // Laravel: delete + re-insert (force hard delete).
      await tx
        .delete(exam_category_options)
        .where(eq(exam_category_options.category_question_id, questionId));

      if (dto.options?.length) {
        await tx.insert(exam_category_options).values(
          dto.options.map((o) => ({
            category_question_id: questionId,
            text: o.text,
            is_correct: o.is_correct ?? false,
            created_at: sql`NOW()`,
            updated_at: sql`NOW()`,
          })),
        );
        await tx.execute(
          sql`SELECT setval(pg_get_serial_sequence('exam_category_options', 'id'), GREATEST((SELECT MAX(id) FROM exam_category_options), 1))`,
        );
      }
    });
  }

  async remove(_categoryId: number, questionId: number) {
    await this.db
      .update(exam_category_questions)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(exam_category_questions.id, questionId));
  }
}
