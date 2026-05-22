// AppInstruction service. Laravel: AppInstructionController.
// 6 endpoint: index, store, update, destroy, detachPhoto, exportToPdf.
// Photo upload va PDF export hozircha stub (MinIO + dompdf real implement keyin).

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { app_instruction_photos, app_instructions } from '@/db/schema';
import {
  InstructionMapper,
  type InstructionItem,
} from '@/modules/admin/instructions/instruction.mapper';
import type {
  CreateInstructionDto,
  InstructionExportQueryDto,
  InstructionListQueryDto,
  UpdateInstructionDto,
} from '@/modules/admin/instructions/dto/instruction.dto';

@Injectable()
export class InstructionService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  /** GET /admin/instructions — paginated. Filter: menu, sub_menu. */
  async list(q: InstructionListQueryDto) {
    const page = Math.max(1, Number(q?.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(q?.per_page ?? 10)));
    const offset = (page - 1) * perPage;

    const conds: SQL[] = [notDeleted(app_instructions)];
    if (q.menu) conds.push(eq(app_instructions.menu, q.menu));
    if (q.sub_menu) conds.push(eq(app_instructions.sub_menu, q.sub_menu));
    const where = and(...conds) ?? notDeleted(app_instructions);

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(app_instructions)
        .where(where)
        .orderBy(desc(app_instructions.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(app_instructions).where(where),
    ]);

    const data = await this.enrichWithPhotos(rows);
    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data,
    };
  }

  /** POST /admin/instructions — yangi instruksiya yaratish. */
  async create(dto: CreateInstructionDto): Promise<InstructionItem> {
    const [row] = await this.db
      .insert(app_instructions)
      .values({
        menu: dto.menu,
        sub_menu: dto.sub_menu,
        title: dto.title,
        title_ru: dto.title_ru ?? null,
        title_en: dto.title_en ?? null,
        text: dto.text,
        text_ru: dto.text_ru ?? null,
        text_en: dto.text_en ?? null,
        created_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      })
      .returning();
    return InstructionMapper.toItem(row, {});
  }

  /** PUT /admin/instructions/:id — partial update. */
  async update(
    id: number,
    dto: UpdateInstructionDto,
  ): Promise<InstructionItem> {
    const data: Record<string, unknown> = { updated_at: sql`NOW()` };
    if (dto.menu !== undefined) data.menu = dto.menu;
    if (dto.sub_menu !== undefined) data.sub_menu = dto.sub_menu;
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.title_ru !== undefined) data.title_ru = dto.title_ru;
    if (dto.title_en !== undefined) data.title_en = dto.title_en;
    if (dto.text !== undefined) data.text = dto.text;
    if (dto.text_ru !== undefined) data.text_ru = dto.text_ru;
    if (dto.text_en !== undefined) data.text_en = dto.text_en;

    const [row] = await this.db
      .update(app_instructions)
      .set(data)
      .where(eq(app_instructions.id, id))
      .returning();
    if (!row) throw new BusinessException(404, 'not_found');

    const photos = await this.db
      .select()
      .from(app_instruction_photos)
      .where(
        and(
          eq(app_instruction_photos.app_instruction_id, id),
          notDeleted(app_instruction_photos),
        ),
      );
    return InstructionMapper.toItem(row, { [id]: photos });
  }

  /** DELETE /admin/instructions/:id — cascade photos + soft-delete. */
  async remove(id: number) {
    await this.db.transaction(async (tx) => {
      const [row] = await tx
        .select({ id: app_instructions.id })
        .from(app_instructions)
        .where(eq(app_instructions.id, id))
        .limit(1);
      if (!row) throw new BusinessException(404, 'not_found');

      await tx
        .update(app_instruction_photos)
        .set({ deleted_at: sql`NOW()` })
        .where(eq(app_instruction_photos.app_instruction_id, id));

      await tx
        .update(app_instructions)
        .set({ deleted_at: sql`NOW()` })
        .where(eq(app_instructions.id, id));
    });
  }

  /** DELETE /admin/instruction-photos/:id — bitta photoni o'chirish. */
  async detachPhoto(photoId: number) {
    const [row] = await this.db
      .update(app_instruction_photos)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(app_instruction_photos.id, photoId))
      .returning({ id: app_instruction_photos.id });
    if (!row) throw new BusinessException(404, 'not_found');
  }

  /** GET /admin/instructions-export — PDF export (stub). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async exportToPdf(_q: InstructionExportQueryDto) {
    // Laravel: dompdf bilan A4 landscape PDF generatsiyalaydi.
    // NestJS hozircha stub — real implement keyin (puppeteer yoki @aws-sdk/client-textract).
    return { success: true, stub: true, message: 'PDF export stub' };
  }

  // -----------------------------------------
  // Helpers
  // -----------------------------------------

  private async enrichWithPhotos(
    rows: Array<typeof app_instructions.$inferSelect>,
  ): Promise<InstructionItem[]> {
    if (!rows.length) return [];
    const ids = rows.map((r) => r.id);
    const photos = await this.db
      .select()
      .from(app_instruction_photos)
      .where(
        and(
          inArray(app_instruction_photos.app_instruction_id, ids),
          notDeleted(app_instruction_photos),
        ),
      );
    const byInstr: Record<number, typeof photos> = {};
    for (const p of photos) {
      (byInstr[p.app_instruction_id] ??= []).push(p);
    }
    return rows.map((r) => InstructionMapper.toItem(r, byInstr));
  }
}
