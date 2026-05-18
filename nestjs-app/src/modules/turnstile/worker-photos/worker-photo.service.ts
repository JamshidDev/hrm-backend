// Worker photos service. Laravel: WorkerTerminalController->photos.
// Source: worker_photos jadvali (HR), filter: worker_id.
// Laravel: WorkerPhoto::query()->where('worker_id', request('worker_id'))->get()
//   - worker_id mavjud: WHERE worker_id = $1
//   - worker_id null/missing: WHERE worker_id IS NULL

import { Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { worker_photos } from '@/db/schema';
import { MinioService } from '@/shared/minio/minio.service';

@Injectable()
export class WorkerPhotoService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly minio: MinioService,
  ) {}

  // Laravel: photos() — flat array (collection), WorkerPhotosResource: {id, photo, current}.
  async list(q: { worker_id?: number | string }) {
    const raw = q.worker_id;
    const workerId =
      raw !== undefined && raw !== null && raw !== '' ? Number(raw) : null;
    const where = and(
      workerId !== null
        ? eq(worker_photos.worker_id, workerId)
        : isNull(worker_photos.worker_id),
      notDeleted(worker_photos),
    );
    const rows = await this.db
      .select({
        id: worker_photos.id,
        photo: worker_photos.photo,
        current: worker_photos.current,
      })
      .from(worker_photos)
      .where(where);
    return Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        photo: await this.minio.fileUrl(r.photo),
        current: r.current,
      })),
    );
  }
}
