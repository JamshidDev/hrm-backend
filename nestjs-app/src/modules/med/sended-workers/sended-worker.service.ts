// Sended worker service. Laravel: Med/MedController (sendToMed, sendedWorkers, destroy).
// Xodimni tibbiy ko'rikka yuborish oqimi.

import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { and, count, desc, eq, ne, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import { sended_workers } from '@/db/schema';
import { pageOf } from '@/modules/med/_shared/helpers';
import type {
  QuerySendedWorkerDto,
  SendToMedDto,
} from '@/modules/med/sended-workers/dto/sended-worker.dto';

@Injectable()
export class SendedWorkerService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly i18n: I18nService,
    private readonly minio: MinioService,
  ) {}

  // POST /api/v1/med/send-to-med — yangi sended_worker yozuvi yaratish.
  // Laravel: xodim allaqachon yuborilgan (confirmation != SUCCESS) bo'lsa xato.
  async sendToMed(dto: SendToMedDto) {
    const userId = this.ctx.user_or_fail.id;
    const organizationId = this.ctx.user_or_fail.organization_id;
    if (!organizationId) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.organization_not_found'),
      );
    }

    // Tasdiqlanmagan (confirmation != 3) yuborilgan yozuv bormi?
    const [pending] = await this.db
      .select({ id: sended_workers.id })
      .from(sended_workers)
      .where(
        and(
          eq(sended_workers.worker_id, dto.worker_id),
          ne(sended_workers.confirmation, 3),
          notDeleted(sended_workers),
        ),
      )
      .limit(1);
    if (pending) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.mew_worker_already_sended'),
      );
    }

    await this.db.insert(sended_workers).values({
      uuid: sql`uuid_generate_v4()`,
      user_id: userId,
      organization_id: organizationId,
      worker_id: dto.worker_id,
      polyclinic_id: dto.polyclinic_id,
      number: Math.floor(Math.random() * 100000),
      start_date: dto.start_date,
    });
  }

  // GET /api/v1/med/sended-workers — yuborilgan xodimlar ro'yxati.
  async list(filters: QuerySendedWorkerDto) {
    const { page, perPage, offset } = pageOf(filters);
    const where = notDeleted(sended_workers);
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(sended_workers)
        .where(where)
        .orderBy(desc(sended_workers.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(sended_workers).where(where),
    ]);
    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => ({ ...r, file: await this.minio.fileUrl(r.file) })),
      ),
    };
  }

  // DELETE /api/v1/med/sended-workers/{id} — soft-delete. Topilmasa 404.
  async remove(id: number) {
    const [row] = await this.db
      .select({ id: sended_workers.id })
      .from(sended_workers)
      .where(and(eq(sended_workers.id, id), notDeleted(sended_workers)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    await this.db
      .update(sended_workers)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(sended_workers.id, id));
  }
}
