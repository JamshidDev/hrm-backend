// Med worker positions service. Laravel: Med/WorkerController.
// Tibbiy ko'rikka yuborish mumkin bo'lgan xodimlar ro'yxati.

import { Injectable } from '@nestjs/common';
import { count } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import { workers } from '@/db/schema';
import { pageOf, polyclinicOrgIds } from '@/modules/med/_shared/helpers';

@Injectable()
export class MedWorkerPositionService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
  ) {}

  // GET /api/v1/med/worker-positions — joriy poliklinikaga tegishli xodimlar.
  async list(q: { page?: number; per_page?: number; search?: string }) {
    const { page, perPage, offset } = pageOf(q);
    const orgIds = await polyclinicOrgIds(
      this.db,
      this.ctx.user_or_fail.organization_id,
    );
    if (orgIds.length === 0) {
      return { current_page: page, per_page: perPage, total: 0, data: [] };
    }

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: workers.id,
          uuid: workers.uuid,
          last_name: workers.last_name,
          first_name: workers.first_name,
          middle_name: workers.middle_name,
          photo: workers.photo,
          birthday: workers.birthday,
        })
        .from(workers)
        .where(notDeleted(workers))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(workers)
        .where(notDeleted(workers)),
    ]);

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (w) => ({
          ...w,
          photo: await this.minio.fileUrl(w.photo),
        })),
      ),
    };
  }
}
