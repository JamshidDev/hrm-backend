// Exam category service. Laravel: Exam/ExamCategoryController.
// Savol kategoriyalari ustida CRUD + clear + excel-header/import (stub).

import { Injectable } from '@nestjs/common';
import { count, eq, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { exam_categories, exam_category_questions } from '@/db/schema';
import { nextId, pageOf } from '@/modules/exam/_shared/helpers';
import type {
  CreateCategoryDto,
  QueryCategoryDto,
  UpdateCategoryDto,
} from '@/modules/exam/categories/dto/category.dto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
  ) {}

  async list(q: QueryCategoryDto) {
    const { page, perPage, offset } = pageOf(q);
    const where = notDeleted(exam_categories);
    const [rows, [{ total }]] = await Promise.all([
      this.db.select().from(exam_categories).where(where).limit(perPage).offset(offset),
      this.db.select({ total: count() }).from(exam_categories).where(where),
    ]);
    return { current_page: page, per_page: perPage, total: Number(total), data: rows };
  }

  async show(id: number) {
    const [row] = await this.db
      .select()
      .from(exam_categories)
      .where(eq(exam_categories.id, id))
      .limit(1);
    if (!row) throw new BusinessException(404, 'not_found');
    return row;
  }

  async create(dto: CreateCategoryDto) {
    const id = await nextId(this.db, exam_categories);
    await this.db.insert(exam_categories).values({
      id,
      name: dto.name,
      organization_id: dto.organization_id ?? null,
      user_id: this.ctx.user_or_fail.id,
    });
  }

  async update(id: number, dto: UpdateCategoryDto) {
    await this.db
      .update(exam_categories)
      .set({
        name: dto.name,
        organization_id: dto.organization_id ?? null,
        updated_at: sql`NOW()`,
      })
      .where(eq(exam_categories.id, id));
  }

  async remove(id: number) {
    await this.db
      .update(exam_categories)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(exam_categories.id, id));
  }

  // Laravel: clear — kategoriya ostidagi barcha savollarni soft-delete qiladi.
  async clear(categoryId: number) {
    await this.db
      .update(exam_category_questions)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(exam_category_questions.exam_category_id, categoryId));
  }

  // Laravel: excel-header — import uchun kutilgan ustun nomlari.
  excelHeader() {
    return {
      columns: ['question', 'option_1', 'option_2', 'option_3', 'option_4', 'correct'],
    };
  }

  // Laravel: import — Excel'dan savollarni yuklash. External job, stub qoldiramiz.
  async excelImport(_categoryId: number, _body: unknown) {
    return { imported: true };
  }
}
