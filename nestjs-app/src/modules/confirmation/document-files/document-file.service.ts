// DocumentFile service. Laravel: Confirmation/DocumentFileController.

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { document_files } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { MinioService } from '@/shared/minio/minio.service';
import {
  CreateDocumentFileDto,
  QueryDocumentFileDto,
  UpdateDocumentFileDto,
} from '@/modules/confirmation/document-files/dto/document-file.dto';

@Injectable()
export class DocumentFileService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly minio: MinioService,
  ) {}

  // GET /api/v1/document/files
  async findAll(filters: QueryDocumentFileDto) {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;

    const where = and(
      notDeleted(document_files),
      filters.model_type
        ? eq(document_files.model_type, filters.model_type)
        : undefined,
      filters.model_id != null
        ? eq(document_files.model_id, filters.model_id)
        : undefined,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(document_files)
        .where(where)
        .orderBy(desc(document_files.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(document_files).where(where),
    ]);

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => ({
          ...r,
          file: await this.minio.fileUrl(r.file),
        })),
      ),
    };
  }

  // GET /api/v1/document/files/{id}
  async findOne(id: number) {
    const [row] = await this.db
      .select()
      .from(document_files)
      .where(and(eq(document_files.id, id), notDeleted(document_files)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    return { ...row, file: await this.minio.fileUrl(row.file) };
  }

  // POST /api/v1/document/files
  async create(dto: CreateDocumentFileDto): Promise<void> {
    let filePath = dto.file;
    if (dto.file.startsWith('data:')) {
      filePath = await this.minio.uploadBase64File(
        dto.file,
        'document-files',
        ['jpg', 'jpeg', 'png', 'pdf', 'docx'],
        10240,
      );
    }
    await this.db.insert(document_files).values({
      model_id: dto.model_id,
      model_type: dto.model_type,
      worker_application_id: dto.worker_application_id ?? null,
      file: filePath,
      original_name: dto.original_name ?? null,
    });
  }

  // PUT /api/v1/document/files/{id}
  async update(id: number, dto: UpdateDocumentFileDto): Promise<void> {
    const [row] = await this.db
      .select({ id: document_files.id })
      .from(document_files)
      .where(and(eq(document_files.id, id), notDeleted(document_files)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    const setData: Record<string, unknown> = { updated_at: sql`NOW()` };
    if (dto.file) {
      if (dto.file.startsWith('data:')) {
        setData.file = await this.minio.uploadBase64File(
          dto.file,
          'document-files',
          ['jpg', 'jpeg', 'png', 'pdf', 'docx'],
          10240,
        );
      } else {
        setData.file = dto.file;
      }
    }
    if (dto.original_name !== undefined) setData.original_name = dto.original_name;

    await this.db
      .update(document_files)
      .set(setData)
      .where(eq(document_files.id, id));
  }

  // DELETE /api/v1/document/files/{id}
  async remove(id: number): Promise<void> {
    const [row] = await this.db
      .select({ id: document_files.id })
      .from(document_files)
      .where(and(eq(document_files.id, id), notDeleted(document_files)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    await this.db
      .update(document_files)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(document_files.id, id));
  }

  // GET /api/v1/document/applications — Laravel: DocumentFileController::applications.
  async applications(filters: QueryDocumentFileDto) {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;

    const where = and(
      notDeleted(document_files),
      sql`${document_files.worker_application_id} IS NOT NULL`,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(document_files)
        .where(where)
        .orderBy(desc(document_files.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(document_files).where(where),
    ]);

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => ({
          ...r,
          file: await this.minio.fileUrl(r.file),
        })),
      ),
    };
  }
}
