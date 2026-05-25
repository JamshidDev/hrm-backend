// Topic file service. Laravel: Exam/TopicFileController + TopicFileService.
// Topic'ga biriktirilgan fayllar (videolar, rasmlar, kitoblar, audio).
//
// POST/PUT — multipart upload. Service:
//   1) Faylni MinIO'ga yuklaydi (uploadFormFile).
//   2) `file_extension` aniqlanadi, `type` TopicFileEnum::getType bo'yicha.
//   3) `file_name` = clientOriginalName.
//   4) Sequence advance — Laravel parallel ishlayotgani uchun.

import { Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { topic_files, topics } from '@/db/schema';
import { MinioService } from '@/shared/minio/minio.service';
import { nextId } from '@/modules/exam/_shared/helpers';

// Laravel TopicFileEnum guruhlari + label.
const TOPIC_FILE_GROUPS: Array<{ id: number; name: string }> = [
  { id: 1, name: 'Videolar' },
  { id: 2, name: 'Rasmlar' },
  { id: 3, name: 'Kitoblar' },
  { id: 4, name: 'Audiolar' },
];

// Laravel TopicFileEnum::getType — extension → type id.
const VIDEO_EXTS = new Set([
  'mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'mpeg', 'mpg',
  'ogv', 'ogg', '3gp', '3g2', 'ts', 'm2ts', 'mts', 'f4v',
]);
const IMAGE_EXTS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'tif', 'svg',
  'ico', 'heic', 'heif', 'avif', 'psd', 'raw', 'ai', 'eps',
]);
const AUDIO_EXTS = new Set([
  'mp3', 'wav', 'aac', 'flac', 'ogg', 'wma', 'm4a', 'alac', 'opus', 'amr', 'aiff',
]);
// Boshqa hammasi book (PDF, doc, ...).
function resolveTopicFileType(extension: string): number {
  const ext = extension.toLowerCase();
  if (VIDEO_EXTS.has(ext)) return 1;
  if (IMAGE_EXTS.has(ext)) return 2;
  if (AUDIO_EXTS.has(ext)) return 4;
  return 3;
}

// `active` form-data string'dan boolean'ga. Laravel mixed qabul qiladi:
//   '0' | '1' | 'true' | 'false' | true | false | 0 | 1.
function parseActive(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
  }
  return false;
}

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

  // Laravel TopicFileService::store — fayl upload + DB record.
  async create(
    topicId: number,
    file: Express.Multer.File | undefined,
    active: unknown,
  ): Promise<void> {
    if (!file) {
      throw new BusinessException(422, 'file: required|file');
    }
    // Laravel `findOrFail` topic_id ni tekshirish kerak.
    const [topic] = await this.db
      .select({ id: topics.id })
      .from(topics)
      .where(and(eq(topics.id, topicId), notDeleted(topics)))
      .limit(1);
    if (!topic) throw new BusinessException(404, 'not_found');

    const ext = (file.originalname.split('.').pop() ?? '').toLowerCase();
    // Laravel uploadFormFile([$fileExtension]) — faqat shu extension allowed.
    const storedPath = await this.minio.uploadFormFile(
      {
        originalname: file.originalname,
        buffer: file.buffer,
        mimetype: file.mimetype,
        size: file.size,
      },
      'topic-files',
      [ext],
      null,
      256, // 256 MB — videolar uchun katta limit
    );

    await this.db.transaction(async (tx) => {
      const id = await nextId(tx, topic_files);
      await tx.insert(topic_files).values({
        id,
        topic_id: topicId,
        file: storedPath,
        file_extension: ext,
        file_name: file.originalname,
        type: resolveTopicFileType(ext),
        active: parseActive(active),
        created_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      });
      // Sequence advance — Laravel parallel ishlayotgani uchun.
      await tx.execute(
        sql`SELECT setval(pg_get_serial_sequence('topic_files', 'id'), GREATEST((SELECT MAX(id) FROM topic_files), 1))`,
      );
    });
  }

  // Laravel TopicFileService::update — fayl bo'lsa qayta yuklaymiz + eski faylni o'chirib qo'yamiz.
  async update(
    _topicId: number,
    fileId: number,
    active: unknown,
    file?: Express.Multer.File,
  ): Promise<void> {
    const [row] = await this.db
      .select({ id: topic_files.id, file: topic_files.file })
      .from(topic_files)
      .where(eq(topic_files.id, fileId))
      .limit(1);
    if (!row) throw new BusinessException(404, 'not_found');

    if (file) {
      const ext = (file.originalname.split('.').pop() ?? '').toLowerCase();
      const storedPath = await this.minio.uploadFormFile(
        {
          originalname: file.originalname,
          buffer: file.buffer,
          mimetype: file.mimetype,
          size: file.size,
        },
        'topic-files',
        [ext],
        null,
        256,
      );
      await this.db
        .update(topic_files)
        .set({
          file: storedPath,
          file_extension: ext,
          file_name: file.originalname,
          type: resolveTopicFileType(ext),
          active: parseActive(active),
          updated_at: sql`NOW()`,
        })
        .where(eq(topic_files.id, fileId));
      // Laravel: eski faylni MinIO'dan o'chirish — hozircha skip qilinadi
      // (background cleanup uchun alohida ish kerak).
    } else {
      await this.db
        .update(topic_files)
        .set({ active: parseActive(active), updated_at: sql`NOW()` })
        .where(eq(topic_files.id, fileId));
    }
  }

  // Laravel TopicFileService::destroy — soft-delete.
  async remove(_topicId: number, fileId: number): Promise<void> {
    await this.db
      .update(topic_files)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(topic_files.id, fileId));
  }
}
