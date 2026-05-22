// WorkerLanguage service. Laravel: `$this->language` BelongsTo — full Language model embedded.

import { Injectable } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { worker_languages, languages as languagesTable } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { MinioService, type UploadedFile } from '@/shared/minio/minio.service';
import { WorkerUuidLookup } from '@/modules/hr/_shared/worker-uuid.helper';
import { toLaravelTimestamp as toLaravelTs } from '@/common/utils/datetime.util';
import {
  CreateWorkerLanguageDto,
  UpdateWorkerLanguageDto,
  WorkerLanguageItemDto,
} from '@/modules/hr/worker-languages/dto/worker-language.dto';

@Injectable()
export class WorkerLanguageService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly lookup: WorkerUuidLookup,
    private readonly minio: MinioService,
  ) {}

  async findAll(uuid?: string): Promise<WorkerLanguageItemDto[]> {
    const workerId = await this.lookup.toId(uuid);
    if (workerId == null) return [];
    const rows = await this.db
      .select({
        id: worker_languages.id,
        file: worker_languages.file,
        language_id: languagesTable.id,
        language_name: languagesTable.name,
        language_name_ru: languagesTable.name_ru,
        language_name_en: languagesTable.name_en,
        language_created_at: languagesTable.created_at,
        language_updated_at: languagesTable.updated_at,
        language_deleted_at: languagesTable.deleted_at,
      })
      .from(worker_languages)
      .leftJoin(
        languagesTable,
        eq(languagesTable.id, worker_languages.language_id),
      )
      .where(
        and(
          eq(worker_languages.worker_id, workerId),
          notDeleted(worker_languages),
        ),
      )
      .orderBy(asc(worker_languages.id));
    return Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        language: r.language_id
          ? {
              id: r.language_id,
              name: r.language_name ?? '',
              name_ru: r.language_name_ru,
              name_en: r.language_name_en,
              created_at: toLaravelTs(r.language_created_at),
              updated_at: toLaravelTs(r.language_updated_at),
              deleted_at: toLaravelTs(r.language_deleted_at),
            }
          : null,
        file: await this.minio.fileUrl(r.file),
      })),
    );
  }

  async create(
    dto: CreateWorkerLanguageDto,
    file?: UploadedFile,
  ): Promise<void> {
    // Laravel: Helper::idUuid($uuid) — resolve worker uuid → id.
    const workerId = await this.lookup.toId(dto.uuid);
    if (workerId == null) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    const filePath = file
      ? await this.minio.uploadFormFile(file, 'worker-languages', [
          'png',
          'jpg',
          'jpeg',
          'pdf',
          'docx',
        ])
      : (dto.file ?? null);

    await this.db.insert(worker_languages).values({
      worker_id: workerId,
      language_id: dto.language_id,
      file: filePath,
    });
  }

  async update(
    id: number,
    dto: UpdateWorkerLanguageDto,
    file?: UploadedFile,
  ): Promise<void> {
    await this.assertExists(id);
    const filePath = file
      ? await this.minio.uploadFormFile(file, 'worker-languages', [
          'png',
          'jpg',
          'jpeg',
          'pdf',
          'docx',
        ])
      : (dto.file ?? null);

    await this.db
      .update(worker_languages)
      .set({
        language_id: dto.language_id,
        file: filePath,
      })
      .where(eq(worker_languages.id, id));
  }

  async remove(id: number): Promise<void> {
    await this.assertExists(id);
    await this.db
      .update(worker_languages)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(worker_languages.id, id));
  }

  private async assertExists(id: number) {
    const [row] = await this.db
      .select({ id: worker_languages.id })
      .from(worker_languages)
      .where(and(eq(worker_languages.id, id), notDeleted(worker_languages)))
      .limit(1);
    if (!row) throw new BusinessException(404, this.i18n.t('messages.not_found'));
  }
}
