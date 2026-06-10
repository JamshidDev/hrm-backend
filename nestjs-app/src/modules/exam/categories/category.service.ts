// Exam category service. Laravel: Exam/ExamCategoryController.
// Savol kategoriyalari ustida CRUD + clear + excel-header/import (stub).

import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { Readable } from 'node:stream';
import { and, count, eq, inArray, isNull, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { RequestContext } from '@/common/context/request.context';
import {
  exam_categories,
  exam_category_options,
  exam_category_questions,
} from '@/db/schema';
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
          .groupBy(
            exam_category_questions.exam_category_id,
          )) as unknown as Array<{
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

  // Laravel TopicExamQuestionService::preview — yuklangan Excel'ni o'qib,
  // ustun harflari (A,B,C...) + birinchi 10 qatorni qaytaradi (import preview).
  async previewExcel(
    file: Express.Multer.File,
  ): Promise<{ headers: string[]; preview: unknown[][] }> {
    if (!file?.buffer) {
      throw new BusinessException(422, 'Fayl yuborilmadi');
    }
    const ext = (file.originalname.split('.').pop() ?? '').toLowerCase();
    const wb = new ExcelJS.Workbook();
    if (ext === 'xlsx') {
      await wb.xlsx.load(file.buffer as unknown as ArrayBuffer);
    } else if (ext === 'csv') {
      await wb.csv.read(Readable.from(file.buffer));
    } else {
      // Laravel: csv/xls/xlsx. ExcelJS .xls o'qiy olmaydi → xato (parity: throw).
      throw new BusinessException(400, `Noto'g'ri fayl turi: ${ext}`);
    }

    // Barcha qatorlarni 0-indeksli massivga (ExcelJS row.values 1-indeksli).
    const ws = wb.worksheets[0];
    const rows: unknown[][] = [];
    if (ws) {
      ws.eachRow({ includeEmpty: true }, (row) => {
        const vals = (row.values as unknown[]).slice(1).map((v) => {
          if (v && typeof v === 'object') {
            const o = v as {
              text?: string;
              result?: unknown;
              richText?: { text: string }[];
            };
            return (
              o.text ??
              o.result ??
              o.richText?.map((r) => r.text).join('') ??
              ''
            );
          }
          return v;
        });
        rows.push(vals);
      });
    }

    const previewRows = rows.slice(0, 10);
    let maxCols = 0;
    for (const row of previewRows) {
      const filled = row.filter(
        (c) => c !== null && c !== undefined && String(c).trim() !== '',
      );
      maxCols = Math.max(maxCols, filled.length);
    }
    const usedCols = Math.min(10, maxCols);
    const headers: string[] = [];
    for (let i = 0; i < usedCols; i++) headers.push(this.numToExcelColumn(i));
    const preview = previewRows.map((row) =>
      row.slice(0, usedCols).map((c) => (c === undefined ? null : c)),
    );
    return { headers, preview };
  }

  // Laravel numToExcelColumn — 0→A, 25→Z, 26→AA.
  private numToExcelColumn(index: number): string {
    let letters = '';
    while (index >= 0) {
      letters = String.fromCharCode((index % 26) + 65) + letters;
      index = Math.floor(index / 26) - 1;
    }
    return letters;
  }

  // Laravel TopicExamQuestionService::import — Excel'dan savol+variantlarni yuklash.
  // mapping: {column: field} (field='ques' yoki 'option_*'; '_correct' bilan tugasa
  // to'g'ri javob). startRow — boshidan skip qilinadigan qatorlar soni.
  async importExcel(
    categoryId: number,
    file: Express.Multer.File,
    mappingRaw: string,
    startRow: number,
  ): Promise<void> {
    // Kategoriya mavjudligini tekshirish (Laravel findOrFail).
    const [cat] = await this.db
      .select({ id: exam_categories.id })
      .from(exam_categories)
      .where(eq(exam_categories.id, categoryId))
      .limit(1);
    if (!cat) {
      throw new BusinessException(404, 'Kategoriya topilmadi');
    }
    if (!file?.buffer) {
      throw new BusinessException(422, 'Fayl yuborilmadi');
    }

    let mapping: Record<string, string>;
    try {
      mapping = JSON.parse(mappingRaw) as Record<string, string>;
    } catch {
      throw new BusinessException(422, 'mapping JSON noto‘g‘ri');
    }

    const rows = await this.readExcelRows(file);
    const dataRows = rows.slice(startRow); // Laravel array_slice(rows, startRow).

    await this.db.transaction(async (tx) => {
      for (const row of dataRows) {
        let questionText = '';
        const options: { text: string; is_correct: boolean }[] = [];

        for (const [column, field] of Object.entries(mapping)) {
          const idx = this.excelColumnToIndex(column);
          const value = row[idx];
          if (
            value === null ||
            value === undefined ||
            String(value).trim() === ''
          )
            continue;

          if (field === 'ques') {
            questionText = String(value);
            continue;
          }
          if (field.startsWith('option_')) {
            options.push({
              text: String(value),
              is_correct: field.endsWith('_correct'),
            });
          }
        }

        if (!questionText) continue;

        const qId = await nextId(tx, exam_category_questions);
        await tx.insert(exam_category_questions).values({
          id: qId,
          exam_category_id: categoryId,
          ques: questionText,
          created_at: sql`NOW()`,
          updated_at: sql`NOW()`,
        });

        if (options.length) {
          const baseId = await nextId(tx, exam_category_options);
          await tx.insert(exam_category_options).values(
            options.map((o, i) => ({
              id: baseId + i,
              category_question_id: qId,
              text: o.text,
              is_correct: o.is_correct,
              created_at: sql`NOW()`,
              updated_at: sql`NOW()`,
            })),
          );
        }
      }
    });
  }

  // Laravel excelColumnToIndex — 'A'→0, 'B'→1, 'AA'→26.
  private excelColumnToIndex(column: string): number {
    let index = 0;
    const c = column.toUpperCase();
    for (let i = 0; i < c.length; i++) {
      index = index * 26 + (c.charCodeAt(i) - 65 + 1);
    }
    return index - 1;
  }

  // Yuklangan Excel/CSV'ni 0-indeksli qator massivlariga o'qish (cell matni).
  private async readExcelRows(file: Express.Multer.File): Promise<unknown[][]> {
    const ext = (file.originalname.split('.').pop() ?? '').toLowerCase();
    const wb = new ExcelJS.Workbook();
    if (ext === 'xlsx') {
      await wb.xlsx.load(file.buffer as unknown as ArrayBuffer);
    } else if (ext === 'csv') {
      await wb.csv.read(Readable.from(file.buffer));
    } else {
      throw new BusinessException(400, `Noto'g'ri fayl turi: ${ext}`);
    }
    const ws = wb.worksheets[0];
    const rows: unknown[][] = [];
    if (ws) {
      ws.eachRow({ includeEmpty: true }, (row) => {
        rows.push(
          (row.values as unknown[]).slice(1).map((v) => {
            if (v && typeof v === 'object') {
              const o = v as {
                text?: string;
                result?: unknown;
                richText?: { text: string }[];
              };
              return (
                o.text ??
                o.result ??
                o.richText?.map((r) => r.text).join('') ??
                ''
              );
            }
            return v;
          }),
        );
      });
    }
    return rows;
  }
}
