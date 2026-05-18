// Topic file service. Laravel: Exam/TopicFileController.
// Topic'ga biriktirilgan fayllar (videolar, rasmlar, kitoblar, audio).

import { Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { topic_files } from '@/db/schema';
import { MinioService } from '@/shared/minio/minio.service';
import { nextId } from '@/modules/exam/_shared/helpers';
import type {
  CreateTopicFileDto,
  UpdateTopicFileDto,
} from '@/modules/exam/topic-files/dto/topic-file.dto';

// Laravel TopicFileEnum::list().
const TOPIC_FILE_GROUPS: Array<{ id: number; name: string }> = [
  { id: 1, name: 'Videolar' },
  { id: 2, name: 'Rasmlar' },
  { id: 3, name: 'Kitoblar' },
  { id: 4, name: 'Audiolar' },
];

@Injectable()
export class TopicFileService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly minio: MinioService,
  ) {}

  // Laravel: index — fayllarni type bo'yicha guruhlab qaytaradi
  // (paginatsiya YO'Q). Har guruh: {id, name, items: TopicFileMinimalResource[]}.
  async list(topicId: number) {
    const rows = await this.db
      .select()
      .from(topic_files)
      .where(and(eq(topic_files.topic_id, topicId), notDeleted(topic_files)));

    // type bo'yicha guruhlash.
    const byType: Record<number, typeof rows> = {};
    for (const r of rows) {
      const t = r.type ?? 1;
      (byType[t] ??= [] as typeof rows).push(r);
    }

    // Har bir guruh uchun MinIO signed URL'larni hisoblash.
    const groups = await Promise.all(
      TOPIC_FILE_GROUPS.map(async (g) => {
        const items = byType[g.id] ?? [];
        const mapped = await Promise.all(
          items.map(async (r) => ({
            id: r.id,
            file: await this.minio.fileUrl(r.file),
            file_name: r.file_name,
            file_extension: r.file_extension,
            active: r.active,
          })),
        );
        return { id: g.id, name: g.name, items: mapped };
      }),
    );
    return groups;
  }

  // Bitta fayl ko'rsatish; topilmasa 404.
  async show(_topicId: number, fileId: number) {
    const [row] = await this.db
      .select()
      .from(topic_files)
      .where(eq(topic_files.id, fileId))
      .limit(1);
    if (!row) throw new BusinessException(404, 'not_found');
    return row;
  }

  // Topic'ga yangi fayl yozish.
  async create(topicId: number, dto: CreateTopicFileDto) {
    const id = await nextId(this.db, topic_files);
    await this.db.insert(topic_files).values({
      id,
      topic_id: topicId,
      file_name: dto.file_name,
      file: dto.file ?? null,
      file_extension: dto.file_extension ?? null,
      type: dto.type ?? 1,
      active: dto.active ?? true,
    });
  }

  // Fayl atributlarini yangilash.
  async update(_topicId: number, fileId: number, dto: UpdateTopicFileDto) {
    await this.db
      .update(topic_files)
      .set({
        file_name: dto.file_name,
        file: dto.file ?? null,
        file_extension: dto.file_extension ?? null,
        type: dto.type ?? 1,
        active: dto.active ?? true,
        updated_at: sql`NOW()`,
      })
      .where(eq(topic_files.id, fileId));
  }

  // Soft-delete (deleted_at = NOW()).
  async remove(_topicId: number, fileId: number) {
    await this.db
      .update(topic_files)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(topic_files.id, fileId));
  }
}
