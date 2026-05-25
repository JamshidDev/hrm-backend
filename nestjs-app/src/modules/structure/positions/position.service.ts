// Position service. Laravel: PositionController.
// scopeSearch: name LIKE. Order by name. Optional ?ids=1,2,3 filter.
// File upload — doc/docx optional (Laravel: position-examples folder).

import { Injectable } from '@nestjs/common';
import { and, eq, ilike, inArray, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { positions } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { paginate } from '@/common/pagination/paginate.util';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { MinioService, type UploadedFile } from '@/shared/minio/minio.service';
import { PositionMapper } from '@/modules/structure/positions/position.mapper';
import {
  QueryPositionDto,
  CreatePositionDto,
  UpdatePositionDto,
  PositionListResponseDto,
} from '@/modules/structure/positions/dto/position.dto';

@Injectable()
export class PositionService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly minio: MinioService,
  ) {}

  async findAll(filters: QueryPositionDto): Promise<PositionListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;

    // Laravel: ?ids=1,2,3 — comma-separated, whereIn.
    const idList = filters.ids
      ? filters.ids
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => !Number.isNaN(n))
      : null;

    const where = and(
      notDeleted(positions),
      filters.search ? ilike(positions.name, `%${filters.search}%`) : undefined,
      idList && idList.length > 0 ? inArray(positions.id, idList) : undefined,
    );

    return paginate({
      db: this.db,
      countTable: positions,
      countWhere: where,
      query: ({ limit, offset }) =>
        this.db
          .select()
          .from(positions)
          .where(where)
          // Laravel: ->orderBy('name')
          .orderBy(positions.name)
          .limit(limit)
          .offset(offset),
      page,
      perPage,
      mapper: PositionMapper.toItem,
    });
  }

  async create(dto: CreatePositionDto, file?: UploadedFile): Promise<void> {
    const nextId = await this.nextId();
    let filePath: string | null = null;
    if (file) {
      filePath = await this.minio.uploadFormFile(file, 'position-examples', [
        'doc',
        'docx',
      ]);
    }

    await this.db.insert(positions).values({
      id: nextId,
      name: dto.name,
      name_ru: dto.name_ru ?? null,
      name_en: dto.name_en ?? null,
      classification_index: dto.classification_index ?? null,
      classification_code: dto.classification_code ?? null,
      file: filePath,
    });
  }

  async update(
    id: number,
    dto: UpdatePositionDto,
    file?: UploadedFile,
  ): Promise<void> {
    await this.findById(id);

    // Laravel: $position->update($data) — faqat berilgan field'larni yangilaydi.
    const updates: Record<string, unknown> = { name: dto.name };
    if (dto.name_ru !== undefined) updates.name_ru = dto.name_ru;
    if (dto.name_en !== undefined) updates.name_en = dto.name_en;
    if (dto.classification_index !== undefined)
      updates.classification_index = dto.classification_index;
    if (dto.classification_code !== undefined)
      updates.classification_code = dto.classification_code;
    if (file) {
      updates.file = await this.minio.uploadFormFile(
        file,
        'position-examples',
        ['doc', 'docx'],
      );
    }

    await this.db.update(positions).set(updates).where(eq(positions.id, id));
  }

  async remove(id: number): Promise<void> {
    await this.findById(id);
    await this.db
      .update(positions)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(positions.id, id));
  }

  // ---- Helper'lar ----

  private async findById(id: number) {
    const [row] = await this.db
      .select({ id: positions.id })
      .from(positions)
      .where(and(eq(positions.id, id), notDeleted(positions)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    return row;
  }

  private async nextId(): Promise<number> {
    const [row] = await this.db
      .select({ maxId: sql<number>`COALESCE(MAX(${positions.id}), 0)` })
      .from(positions);
    return Number(row?.maxId ?? 0) + 1;
  }
}
