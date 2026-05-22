// Chat news media service. Laravel: ChatNewsMediaService.
// Multipart fayl qabul qiladi → MinIO'ga yuklaydi → chat_news_media yozuvi yaratadi.

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, sql, type SQL } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { MinioService } from '@/shared/minio/minio.service';
import { chat_news_media } from '@/db/schema';
import type {
  CreateMediaDto,
  MediaListQueryDto,
} from '@/modules/chat/news-media/dto/media.dto';

const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'];

@Injectable()
export class ChatNewsMediaService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly minio: MinioService,
  ) {}

  async list(q: MediaListQueryDto) {
    const page = Number(q?.page ?? 1);
    const perPage = Number(q?.per_page ?? 10);
    const offset = (page - 1) * perPage;

    const conds: SQL[] = [notDeleted(chat_news_media)];
    if (q.chat_news_id !== undefined) {
      conds.push(eq(chat_news_media.chat_news_id, q.chat_news_id));
    }
    const where = and(...conds);

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(chat_news_media)
        .where(where)
        .orderBy(desc(chat_news_media.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(chat_news_media).where(where),
    ]);

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows,
    };
  }

  async show(id: number) {
    const [row] = await this.db
      .select()
      .from(chat_news_media)
      .where(eq(chat_news_media.id, id))
      .limit(1);
    if (!row) throw new BusinessException(404, 'not_found');
    return row;
  }

  /**
   * POST /chat/media — multipart upload.
   * Laravel: Base64FileUploadTrait::uploadFormFile('chat-media', [pdf,doc,docx,png,jpg,jpeg]).
   */
  async create(dto: CreateMediaDto, file: Express.Multer.File) {
    if (!file) {
      throw new BusinessException(422, 'file_required');
    }

    // MinIO'ga yuklash (extension validation MinioService ichida)
    const minioPath = await this.minio.uploadFormFile(
      file,
      'chat-media',
      ALLOWED_EXTENSIONS,
    );

    const extension =
      (file.originalname.split('.').pop() ?? '').toLowerCase() || null;

    const [row] = await this.db
      .insert(chat_news_media)
      .values({
        chat_news_id: dto.chat_news_id,
        type: dto.type,
        path: minioPath,
        extension,
        size: file.size,
        order: dto.order ?? 1,
        created_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      })
      .returning();
    return row;
  }

  async remove(id: number) {
    const [row] = await this.db
      .update(chat_news_media)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(chat_news_media.id, id))
      .returning({ id: chat_news_media.id });
    if (!row) throw new BusinessException(404, 'not_found');
  }
}
