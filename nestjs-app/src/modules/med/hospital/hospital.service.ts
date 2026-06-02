// Hospital service. Laravel: Med/SendedWorkerController.
// Shifoxona tomonidagi chiptalar (sended_workers) va komissiyalar bilan ishlash.

import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import {
  sended_worker_commissions,
  sended_workers,
  workers,
  worker_positions,
  departments,
  positions as positionsTable,
  organizations,
} from '@/db/schema';
import { getShortPosition } from '@/modules/hr/_shared/position-helper';
import { CONFIRMATION_STATUS_LABELS } from '@/modules/confirmation/confirmations/confirmations.types';
import { pageOf } from '@/modules/med/_shared/helpers';
import type {
  AttachCommissionDto,
  ConfirmDocumentDto,
  QueryHospitalTicketsDto,
} from '@/modules/med/hospital/dto/hospital.dto';

// Laravel Modules\HR\Enums\MedStatusEnum::get — 1=one, 2=two, else "".
const MED_STATUS_LABELS: Record<number, string> = {
  1: 'messages.worker.med.one',
  2: 'messages.worker.med.two',
};

@Injectable()
export class HospitalService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
  ) {}

  /**
   * GET /api/v1/med/hospital/tickets — Laravel `SendedWorkerController::index`.
   * SendedWorker::where('polyclinic_id', user.organization_id)->with([...])
   *   ->orderByDesc('id')->paginate → PaginateResource(SendedWorkerResource).
   * Org-scope: polyclinic_id = AUTH user org (role childIds YO'Q — bu poliklinika oqimi).
   */
  async tickets(filters: QueryHospitalTicketsDto) {
    const { page, perPage, offset } = pageOf(filters);
    const lang = this.ctx.lang;
    const userOrgId = this.ctx.user_or_fail.organization_id;

    // Laravel where('polyclinic_id', $user->organization_id) — org bo'lmasa bo'sh.
    if (userOrgId == null) {
      return { current_page: page, total: 0, data: [] };
    }

    const where = and(
      notDeleted(sended_workers),
      eq(sended_workers.polyclinic_id, userOrgId),
    );

    const poly = alias(organizations, 'poly_org');

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: sended_workers.id,
          uuid: sended_workers.uuid,
          worker_position_id: sended_workers.worker_position_id,
          commission_leader_id: sended_workers.commission_leader_id,
          status: sended_workers.status,
          start_date: sended_workers.start_date,
          confirmation: sended_workers.confirmation,
          generate: sended_workers.generate,
          confirmation_file: sended_workers.confirmation_file,
          w_id: workers.id,
          w_uuid: workers.uuid,
          w_photo: workers.photo,
          w_last: workers.last_name,
          w_first: workers.first_name,
          w_middle: workers.middle_name,
          w_birthday: workers.birthday,
          w_pin: workers.pin,
          p_id: poly.id,
          p_name: poly.name,
          p_name_ru: poly.name_ru,
          p_name_en: poly.name_en,
          p_group: poly.group,
          wp_dept_name: departments.name,
          wp_dept_level: departments.level,
          wp_pos_name: positionsTable.name,
        })
        .from(sended_workers)
        .leftJoin(workers, eq(workers.id, sended_workers.worker_id))
        .leftJoin(poly, eq(poly.id, sended_workers.polyclinic_id))
        .leftJoin(
          worker_positions,
          eq(worker_positions.id, sended_workers.worker_position_id),
        )
        .leftJoin(
          departments,
          eq(departments.id, worker_positions.department_id),
        )
        .leftJoin(
          positionsTable,
          eq(positionsTable.id, worker_positions.position_id),
        )
        .where(where)
        .orderBy(desc(sended_workers.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(sended_workers).where(where),
    ]);

    return {
      current_page: page,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => ({
          id: r.id,
          uuid: r.uuid,
          worker_position_id: r.worker_position_id,
          worker: r.w_id
            ? {
                id: r.w_id,
                uuid: r.w_uuid,
                photo: await this.minio.fileUrl(r.w_photo),
                last_name: r.w_last,
                first_name: r.w_first,
                middle_name: r.w_middle,
                birthday: r.w_birthday,
                pin: r.w_pin,
              }
            : null,
          polyclinic: r.p_id
            ? { id: r.p_id, name: this.polyName(r, lang), group: r.p_group }
            : null,
          position: getShortPosition({
            position_name: r.wp_pos_name,
            department_name: r.wp_dept_name,
            department_level: r.wp_dept_level,
            organization_full_name: null,
          }),
          confirmation_file: await this.minio.fileUrl(r.confirmation_file),
          commission_leader_id: r.commission_leader_id,
          status: { id: r.status, name: this.medStatusName(r.status, lang) },
          start_date: r.start_date,
          confirmation: {
            id: r.confirmation,
            name: this.confStatusName(r.confirmation, lang),
          },
          generate: r.generate,
        })),
      ),
    };
  }

  // Laravel OrganizationListResource — ru→name_ru, en→name_en, default→name.
  private polyName(
    o: {
      p_name: string | null;
      p_name_ru: string | null;
      p_name_en: string | null;
    },
    lang: string,
  ): string | null {
    if (lang === 'ru') return o.p_name_ru;
    if (lang === 'en') return o.p_name_en;
    return o.p_name;
  }

  // Laravel MedStatusEnum::get — id => tarjima (topilmasa "").
  private medStatusName(id: number | null, lang: string): string {
    const key = id != null ? MED_STATUS_LABELS[id] : undefined;
    if (!key) return '';
    const v = this.i18n.t(key, { lang });
    return typeof v === 'string' ? v : '';
  }

  // Laravel ConfirmationStatusEnum::get — id => label (topilmasa "").
  private confStatusName(id: number | null, lang: string): string {
    const key = id != null ? CONFIRMATION_STATUS_LABELS[id] : undefined;
    if (!key) return '';
    const v = this.i18n.t(key, { lang });
    return typeof v === 'string' ? v : '';
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
