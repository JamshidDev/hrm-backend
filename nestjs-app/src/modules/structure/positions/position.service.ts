import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { positions } from '@/db/schema';
import { paginate } from '@/common/pagination/paginate.util';
import { findByIdOrFail, softDeleteById } from '@/common/database/crud.helper';
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
    const { search } = filters;
    const idList = filters.ids
      ? filters.ids
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => !Number.isNaN(n))
      : null;
    const where = {
      deleted_at: { isNull: true as const },
      ...(search ? { name: { ilike: `%${search}%` } } : {}),
      ...(idList && idList.length > 0 ? { id: { in: idList } } : {}),
    };

    return paginate({
      db: this.db,
      count: () =>
        this.db.$count(sql`(${this.db.query.positions.findMany({ where })})`),
      query: ({ limit, offset }) =>
        this.db.query.positions.findMany({
          where,
          orderBy: { name: 'asc' },
          limit,
          offset,
        }),
      page,
      perPage,
      mapper: PositionMapper.toItem,
    });
  }

  async create(dto: CreatePositionDto, file?: UploadedFile): Promise<void> {
    const [{ maxId }] = await this.db
      .select({ maxId: sql<number>`COALESCE(MAX(${positions.id}), 0)` })
      .from(positions);
    let filePath: string | null = null;
    if (file) {
      filePath = await this.minio.uploadFormFile(file, 'position-examples', [
        'doc',
        'docx',
      ]);
    }

    await this.db.insert(positions).values({
      id: Number(maxId) + 1,
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
    await findByIdOrFail(this.db, positions, id, this.i18n);

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
    await findByIdOrFail(this.db, positions, id, this.i18n);
    await softDeleteById(this.db, positions, id);
  }
}
