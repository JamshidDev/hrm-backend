// Exam category service. Laravel: Exam/ExamCategoryController.
// Savol kategoriyalari ustida CRUD + clear + excel-header/import (stub).

import { Injectable } from '@nestjs/common';
import { and, count, eq, inArray, isNull, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { OrgScopeService } from '@/common/database/org-scope.service';
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
    private readonly scope: OrgScopeService,
  ) {}

  // Laravel ExamCategory::scopeFilter — `where('user_id', $user->id)` +
  //   QueryHelper::filterByOrganizations(role + organizations + organization_id).
  // Resource: ExamCategoryResource — {id, name, questions_count}.
  async list(q: QueryCategoryDto) {
    const { page, perPage, offset } = pageOf(q);
    const userId = this.ctx.user_or_fail.id;

    const inScope = await this.scope.whereOrg(exam_categories.organization_id, {
      organizations: q.organizations,
      organization_id: q.organization_id,
    });

    const where = and(
      notDeleted(exam_categories),
      eq(exam_categories.user_id, userId),
      inScope,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: exam_categories.id,
          name: exam_categories.name,
        })
        .from(exam_categories)
        .where(where)
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(exam_categories).where(where),
    ]);

    // withCount('questions') parity — exam_category_questions.deleted_at IS NULL.
    const ids = rows.map((r) => r.id);
    const counts = ids.length
      ? ((await this.db
          .select({
            cat_id: exam_category_questions.exam_category_id,
            cnt: count(),
          })
          .from(exam_category_questions)
          .where(
            and(
              inArray(exam_category_questions.exam_category_id, ids),
              isNull(exam_category_questions.deleted_at),
            ),
          )
          .groupBy(exam_category_questions.exam_category_id)) as unknown as Array<{
          cat_id: number | null;
          cnt: number;
        }>)
      : [];
    const countMap = new Map<number, number>(
      counts
        .filter((c) => c.cat_id != null)
        .map((c) => [c.cat_id as number, Number(c.cnt)]),
    );

    return {
      current_page: page,
      total: Number(total),
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        questions_count: countMap.get(r.id) ?? 0,
      })),
    };
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

  // Laravel: $data['organization_id'] = $user->organization_id; $data['user_id'] = $user->id.
  async create(dto: CreateCategoryDto) {
    const user = this.ctx.user_or_fail;
    await this.db.transaction(async (tx) => {
      const id = await nextId(tx, exam_categories);
      await tx.insert(exam_categories).values({
        id,
        name: dto.name,
        organization_id: user.organization_id ?? null,
        user_id: user.id,
        created_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      });
      // Sequence advance — Laravel parallel parity.
      await tx.execute(
        sql`SELECT setval(pg_get_serial_sequence('exam_categories', 'id'), GREATEST((SELECT MAX(id) FROM exam_categories), 1))`,
      );
    });
  }

  // Laravel: ExamCategoryController::update — `$request->validated()` faqat
  // ruxsat etilgan field'larni o'tkazadi (UpdateExamCategoryRequest'da `name`
  // bor xolos), shu sababli `organization_id`'ni jo'natilmagan paytda
  // tegmaymiz. Aks holda update list scope'idan tushib qoladi.
  async update(id: number, dto: UpdateCategoryDto) {
    const set: Record<string, unknown> = {
      name: dto.name,
      updated_at: sql`NOW()`,
    };
    if (dto.organization_id !== undefined) {
      set.organization_id = dto.organization_id;
    }
    await this.db
      .update(exam_categories)
      .set(set)
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
      columns: [
        'question',
        'option_1',
        'option_2',
        'option_3',
        'option_4',
        'correct',
      ],
    };
  }

  // Laravel: import — Excel'dan savollarni yuklash. External job, stub qoldiramiz.
  async excelImport(_categoryId: number, _body: unknown) {
    return { imported: true };
  }
}
