// Sended worker service. Laravel: Med/MedController (sendToMed, sendedWorkers, destroy).
// Xodimni tibbiy ko'rikka yuborish oqimi.

import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { and, count, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { resolveOrgScopeIds } from '@/common/database/org-scope.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import { PermissionService } from '@/shared/permission/permission.service';
import { ConvertService } from '@/shared/convert/convert.service';
import { getShortPosition } from '@/modules/hr/_shared/position-helper';
import { MED_STATUS_LABELS } from '@/modules/hr/meds/med.types';
import { CONFIRMATION_STATUS_LABELS } from '@/modules/hr/worker-applications/worker-application.types';
import { MedReplaceService } from '@/modules/med/sended-workers/med-replace.service';
import {
  sended_workers,
  sended_worker_confirmations,
  workers,
  worker_positions,
  departments,
  positions as positionsTable,
  organizations,
} from '@/db/schema';
import { pageOf } from '@/modules/med/_shared/helpers';
import type {
  QuerySendedWorkerDto,
  SendToMedDto,
} from '@/modules/med/sended-workers/dto/sended-worker.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class SendedWorkerService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly i18n: I18nService,
    private readonly minio: MinioService,
    private readonly permissions: PermissionService,
    private readonly medReplace: MedReplaceService,
    private readonly convert: ConvertService,
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

    const uuid = randomUUID();
    // Laravel SendedWorker boot('creating') — file yo'llari.
    const docxKey = `med/${uuid}.docx`;
    const pdfKey = `documents/med/${uuid}.pdf`;
    const hrWorkerId = this.ctx.user_or_fail.worker_id;
    const hrPosition = await this.medReplace.resolveHrShortPosition(userId);

    // sended_worker + HR imzo tasdig'i — bitta transaction ichida.
    const [sended] = await this.db.transaction(async (tx) => {
      const created = await tx
        .insert(sended_workers)
        .values({
          uuid,
          user_id: userId,
          organization_id: organizationId,
          worker_id: dto.worker_id,
          worker_position_id: dto.worker_position_id ?? null,
          polyclinic_id: dto.polyclinic_id,
          start_date: dto.start_date,
          file: docxKey,
          confirmation_file: pdfKey,
          created_at: sql`NOW()`,
          updated_at: sql`NOW()`,
        })
        .returning({ id: sended_workers.id });

      // Laravel: SendedWorkerConfirmation — HR (type='s', status=SUCCESS).
      if (hrWorkerId) {
        await tx.insert(sended_worker_confirmations).values({
          sended_worker_id: created[0].id,
          worker_id: hrWorkerId,
          position: hrPosition,
          type: 's',
          status: 3,
          created_at: sql`NOW()`,
          updated_at: sql`NOW()`,
        });
      }
      return created;
    });

    // Hujjat tartib raqami — Laravel: SendedWorker::withTrashed()->count() + 1.
    const [{ total }] = await this.db
      .select({ total: count() })
      .from(sended_workers);

    // DOCX'ni sinxron hosil qilamiz (fayl darhol mavjud bo'lsin), PDF — fonda.
    try {
      const docx = await this.medReplace.buildDocx({
        uuid,
        workerId: dto.worker_id,
        workerPositionId: dto.worker_position_id ?? null,
        departmentPositionId: dto.department_position_id ?? null,
        hrUserId: userId,
        hrPosition,
        number: Number(total) + 1,
      });
      await this.minio.putObject(
        docxKey,
        docx,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
      void this.generateMedPdf(sended.id, docx, pdfKey);
    } catch {
      await this.db
        .update(sended_workers)
        .set({ generate: 4 })
        .where(eq(sended_workers.id, sended.id));
    }
  }

  // DOCX→PDF konvertatsiya (fon) — Laravel DocxToPdfJob. generate: 3=tayyor, 4=xato.
  private async generateMedPdf(
    sendedId: number,
    docx: Buffer,
    pdfKey: string,
  ): Promise<void> {
    try {
      const pdf = await this.convert.docxToPdf(docx);
      await this.minio.putObject(pdfKey, pdf, 'application/pdf');
      await this.db
        .update(sended_workers)
        .set({ generate: 3 })
        .where(eq(sended_workers.id, sendedId));
    } catch {
      await this.db
        .update(sended_workers)
        .set({ generate: 4 })
        .where(eq(sended_workers.id, sendedId));
    }
  }

  // GET /api/v1/med/sended-workers — Laravel: MedController::sendedWorkers.
  // SendedWorkerResource: {id, uuid, worker_position_id, worker, polyclinic,
  // position, confirmation_file, commission_leader_id, status, start_date,
  // confirmation, generate}.
  async list(filters: QuerySendedWorkerDto) {
    const { page, perPage, offset } = pageOf(filters);
    const lang = this.ctx.lang;

    // Laravel SendedWorker::scopeFilter → filterByOrganizations (org scope).
    const scopeOrgIds = await resolveOrgScopeIds(
      this.db,
      this.permissions,
      this.ctx.user_or_fail.id,
      this.ctx.user_or_fail.organization_id,
    );
    const where = and(
      notDeleted(sended_workers),
      scopeOrgIds.length
        ? inArray(sended_workers.organization_id, scopeOrgIds)
        : sql`false`,
    );

    // organizations ikki marta join bo'ladi — worker_position org va polyclinic.
    const orgWp = alias(organizations, 'org_wp');
    const orgPoly = alias(organizations, 'org_poly');

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: sended_workers.id,
          uuid: sended_workers.uuid,
          worker_position_id: sended_workers.worker_position_id,
          commission_leader_id: sended_workers.commission_leader_id,
          confirmation_file: sended_workers.confirmation_file,
          start_date: sended_workers.start_date,
          confirmation: sended_workers.confirmation,
          generate: sended_workers.generate,
          status: sended_workers.status,
          worker_id: workers.id,
          worker_last: workers.last_name,
          worker_first: workers.first_name,
          worker_middle: workers.middle_name,
          worker_photo: workers.photo,
          worker_birthday: workers.birthday,
          dept_name: departments.name,
          dept_level: departments.level,
          pos_name: positionsTable.name,
          wp_org_full: orgWp.full_name,
          poly_id: orgPoly.id,
          poly_name: orgPoly.name,
          poly_name_ru: orgPoly.name_ru,
          poly_name_en: orgPoly.name_en,
          poly_group: orgPoly.group,
        })
        .from(sended_workers)
        .leftJoin(workers, eq(workers.id, sended_workers.worker_id))
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
        .leftJoin(orgWp, eq(orgWp.id, worker_positions.organization_id))
        .leftJoin(orgPoly, eq(orgPoly.id, sended_workers.polyclinic_id))
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
          worker: r.worker_id
            ? {
                id: r.worker_id,
                // Laravel `with('worker:id,...')` uuid/pin tanlamaydi → null.
                uuid: null,
                photo: await this.minio.fileUrl(r.worker_photo),
                last_name: r.worker_last,
                first_name: r.worker_first,
                middle_name: r.worker_middle,
                birthday: r.worker_birthday,
                pin: null,
              }
            : null,
          polyclinic: r.poly_id
            ? {
                id: r.poly_id,
                name:
                  lang === 'ru'
                    ? (r.poly_name_ru ?? r.poly_name)
                    : lang === 'en'
                      ? (r.poly_name_en ?? r.poly_name)
                      : r.poly_name,
                group: r.poly_group ?? false,
              }
            : null,
          position: getShortPosition({
            position_name: r.pos_name,
            department_name: r.dept_name,
            department_level: r.dept_level,
            organization_full_name: r.wp_org_full,
          }),
          confirmation_file: await this.minio.fileUrl(r.confirmation_file),
          commission_leader_id: r.commission_leader_id,
          status: {
            id: r.status,
            name: this.label(
              r.status != null ? MED_STATUS_LABELS[r.status] : undefined,
              lang,
            ),
          },
          start_date: r.start_date,
          confirmation: {
            id: r.confirmation,
            name: this.label(
              r.confirmation != null
                ? CONFIRMATION_STATUS_LABELS[r.confirmation]
                : undefined,
              lang,
            ),
          },
          generate: r.generate,
        })),
      ),
    };
  }

  // i18n kalitini matnga aylantirish (topilmasa bo'sh satr).
  private label(key: string | undefined, lang: string): string {
    if (!key) return '';
    const v = this.i18n.t(key, { lang });
    return typeof v === 'string' ? v : '';
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
