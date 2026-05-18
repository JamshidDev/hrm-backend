// WorkerPhoto service. Laravel: HR/WorkerPhotoService.
// Endpointlar: index/store/update/destroy.
// `current` photo bo'lsa worker.photo'ni ham yangilaymiz.

import { Injectable } from '@nestjs/common';
import { and, asc, eq, isNull, ne, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { worker_photos, workers } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { MinioService } from '@/shared/minio/minio.service';
import {
  CreateWorkerPhotoDto,
  UpdateWorkerPhotoDto,
  WorkerPhotoItemDto,
} from '@/modules/hr/worker-photos/dto/worker-photo.dto';

@Injectable()
export class WorkerPhotoService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly minio: MinioService,
  ) {}

  // GET /api/v1/hr/worker-photos?worker_id=
  // Laravel: WorkerPhoto::where('worker_id', request('worker_id'))->get()
  //   no param → matches `worker_id IS NULL` rows.
  async findAll(workerId?: number): Promise<WorkerPhotoItemDto[]> {
    const rows = await this.db
      .select({
        id: worker_photos.id,
        photo: worker_photos.photo,
        current: worker_photos.current,
      })
      .from(worker_photos)
      .where(
        and(
          workerId != null
            ? eq(worker_photos.worker_id, workerId)
            : isNull(worker_photos.worker_id),
          notDeleted(worker_photos),
        ),
      )
      .orderBy(asc(worker_photos.id));
    return Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        photo: await this.minio.fileUrl(r.photo),
        current: r.current,
      })),
    );
  }

  // POST /api/v1/hr/worker-photos — store: base64 upload + worker_photos insert.
  async create(dto: CreateWorkerPhotoDto): Promise<WorkerPhotoItemDto[]> {
    const path = await this.minio.uploadBase64File(
      dto.photo,
      'worker-photos',
      ['jpg', 'jpeg', 'png'],
    );

    if (dto.current) {
      // Unset previous current photos, set worker.photo.
      await this.db
        .update(worker_photos)
        .set({ current: false })
        .where(eq(worker_photos.worker_id, dto.worker_id));
      await this.db
        .update(workers)
        .set({ photo: path })
        .where(eq(workers.id, dto.worker_id));
    }

    await this.db.insert(worker_photos).values({
      worker_id: dto.worker_id,
      photo: path,
      current: dto.current ?? false,
    });

    return this.findAll(dto.worker_id);
  }

  // PUT /api/v1/hr/worker-photos/{id} — update (optionally with new photo + current toggle).
  async update(id: number, dto: UpdateWorkerPhotoDto): Promise<void> {
    const [existing] = await this.db
      .select()
      .from(worker_photos)
      .where(and(eq(worker_photos.id, id), notDeleted(worker_photos)))
      .limit(1);
    if (!existing) {
      throw new BusinessException(400, this.i18n.t('messages.user_not_found'));
    }

    const setData: Record<string, unknown> = {};
    if (dto.photo) {
      setData.photo = await this.minio.uploadBase64File(
        dto.photo,
        'worker-photos',
        ['jpg', 'jpeg', 'png'],
      );
    }
    if (dto.current) {
      // Unset other current photos for this worker.
      if (existing.worker_id != null) {
        await this.db
          .update(worker_photos)
          .set({ current: false })
          .where(
            and(
              eq(worker_photos.worker_id, existing.worker_id),
              ne(worker_photos.id, id),
            ),
          );
        const finalPath = (setData.photo as string | undefined) ?? existing.photo;
        await this.db
          .update(workers)
          .set({ photo: finalPath })
          .where(eq(workers.id, existing.worker_id));
      }
      setData.current = true;
    }

    if (Object.keys(setData).length > 0) {
      await this.db
        .update(worker_photos)
        .set(setData)
        .where(eq(worker_photos.id, id));
    }
  }

  // DELETE /api/v1/hr/worker-photos/{id} — non-current only.
  async remove(id: number): Promise<void> {
    const [photo] = await this.db
      .select({ id: worker_photos.id, current: worker_photos.current })
      .from(worker_photos)
      .where(and(eq(worker_photos.id, id), notDeleted(worker_photos)))
      .limit(1);
    if (!photo) {
      throw new BusinessException(400, this.i18n.t('messages.user_not_found'));
    }
    if (photo.current) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.does_not_delete_current_photo'),
      );
    }
    await this.db
      .update(worker_photos)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(worker_photos.id, id));
  }
}
