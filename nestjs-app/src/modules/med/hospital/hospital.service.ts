// Hospital service. Laravel: Med/SendedWorkerController.
// Shifoxona tomonidagi chiptalar (sended_workers) va komissiyalar bilan ishlash.

import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { MinioService } from '@/shared/minio/minio.service';
import { sended_worker_commissions, sended_workers } from '@/db/schema';
import { pageOf } from '@/modules/med/_shared/helpers';
import type {
  AttachCommissionDto,
  ConfirmDocumentDto,
  QueryHospitalTicketsDto,
} from '@/modules/med/hospital/dto/hospital.dto';

@Injectable()
export class HospitalService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly minio: MinioService,
  ) {}

  // GET /api/v1/med/hospital/tickets — yuborilgan xodimlar (chiptalar) ro'yxati.
  async tickets(filters: QueryHospitalTicketsDto) {
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

  // GET /api/v1/med/hospital/tickets/{id}/commissions — chiptaga biriktirilgan komissiyalar.
  async commissions(ticketId: number) {
    return this.db
      .select()
      .from(sended_worker_commissions)
      .where(
        and(
          eq(sended_worker_commissions.sended_worker_id, ticketId),
          notDeleted(sended_worker_commissions),
        ),
      );
  }

  // POST /api/v1/med/hospital/tickets-attach — komissiyani chiptaga biriktirish.
  async attachCommission(dto: AttachCommissionDto) {
    await this.db.insert(sended_worker_commissions).values({
      sended_worker_id: dto.sended_worker_id,
      commission_id: dto.commission_id,
    });
  }

  // DELETE /api/v1/med/hospital/tickets-attach/{id} — komissiyani ajratish (soft-delete).
  async detachCommission(id: number) {
    const [row] = await this.db
      .select({ id: sended_worker_commissions.id })
      .from(sended_worker_commissions)
      .where(
        and(
          eq(sended_worker_commissions.id, id),
          notDeleted(sended_worker_commissions),
        ),
      )
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    await this.db
      .update(sended_worker_commissions)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(sended_worker_commissions.id, id));
  }

  // POST /api/v1/med/hospital/tickets/{id}/confirm — chiptani tasdiqlash (confirmation=3).
  async confirm(id: number, _dto: ConfirmDocumentDto) {
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
      .set({ confirmation: 3, updated_at: sql`NOW()` })
      .where(eq(sended_workers.id, id));
  }
}
