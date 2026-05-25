// Timesheet confirmations service. Laravel: TimeSheetController::{attachConfirmations,getConfirmations,reattach}.

import { Injectable } from '@nestjs/common';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  timesheet_confirmations,
  confirmation_workers,
  workers,
  time_sheets,
} from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import {
  AttachConfirmationsDto,
  GetConfirmationsResponse,
  TimesheetConfirmationItem,
} from '@/modules/timesheet/timesheet-confirmations/dto/timesheet-confirmation.dto';
import {
  CONFIRMATION_STATUS_KEY,
  CONFIRMATION_TYPE_KEY,
} from '@/modules/timesheet/timesheet-confirmations/timesheet-confirmation.types';

@Injectable()
export class TimesheetConfirmationService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
  ) {}

  // POST /api/v1/timesheet/{timesheetId}/confirmations
  async attach(
    timesheetId: number,
    dto: AttachConfirmationsDto,
  ): Promise<void> {
    await this.assertTimesheetExists(timesheetId);

    const ids = dto.confirmations.map((c) => c.id);
    if (ids.length === 0) return;

    const confirmRows = await this.db
      .select({
        id: confirmation_workers.id,
        worker_id: confirmation_workers.worker_id,
        position: confirmation_workers.position,
      })
      .from(confirmation_workers)
      .where(
        and(
          inArray(confirmation_workers.id, ids),
          isNull(confirmation_workers.deleted_at),
        ),
      );

    const confirmMap = new Map<number, (typeof confirmRows)[number]>();
    for (const c of confirmRows) confirmMap.set(c.id, c);

    // Upsert each — match Laravel updateOrCreate by (time_sheet_id, worker_id).
    for (const item of dto.confirmations) {
      const cw = confirmMap.get(item.id);
      if (!cw) continue;

      const [existing] = await this.db
        .select({ id: timesheet_confirmations.id })
        .from(timesheet_confirmations)
        .where(
          and(
            eq(timesheet_confirmations.time_sheet_id, timesheetId),
            eq(timesheet_confirmations.worker_id, cw.worker_id),
            isNull(timesheet_confirmations.deleted_at),
          ),
        )
        .limit(1);

      const values = {
        main: item.main,
        order: item.order,
        position: cw.position,
        type: 's',
      };

      if (existing) {
        await this.db
          .update(timesheet_confirmations)
          .set({ ...values, updated_at: sql`NOW()` })
          .where(eq(timesheet_confirmations.id, existing.id));
      } else {
        await this.db.insert(timesheet_confirmations).values({
          time_sheet_id: timesheetId,
          worker_id: cw.worker_id,
          ...values,
        });
      }
    }
  }

  // GET /api/v1/timesheet/{timesheetId}/confirmations
  async list(timesheetId: number): Promise<GetConfirmationsResponse> {
    const lang = this.ctx.lang;

    const rows = await this.db
      .select({
        id: timesheet_confirmations.id,
        status: timesheet_confirmations.status,
        order: timesheet_confirmations.order,
        position: timesheet_confirmations.position,
        confirmation_type: timesheet_confirmations.confirmation_type,
        main: timesheet_confirmations.main,
        worker_id: timesheet_confirmations.worker_id,
      })
      .from(timesheet_confirmations)
      .where(
        and(
          eq(timesheet_confirmations.time_sheet_id, timesheetId),
          isNull(timesheet_confirmations.deleted_at),
        ),
      );

    const workerIds = [
      ...new Set(
        rows.map((r) => r.worker_id).filter((id): id is number => id !== null),
      ),
    ];

    const workerRows = workerIds.length
      ? await this.db
          .select({
            id: workers.id,
            uuid: workers.uuid,
            photo: workers.photo,
            last_name: workers.last_name,
            first_name: workers.first_name,
            middle_name: workers.middle_name,
            birthday: workers.birthday,
            pin: workers.pin,
          })
          .from(workers)
          .where(
            and(inArray(workers.id, workerIds), isNull(workers.deleted_at)),
          )
      : [];

    const workerMap = new Map<number, (typeof workerRows)[number]>();
    for (const w of workerRows) workerMap.set(w.id, w);

    const confirmations: TimesheetConfirmationItem[] = await Promise.all(
      rows.map(async (r) => {
        const w = r.worker_id ? workerMap.get(r.worker_id) : undefined;
        const statusLabel = this.i18n.t(
          CONFIRMATION_STATUS_KEY[r.status] ?? '',
          { lang },
        );
        const typeLabel = this.i18n.t(
          CONFIRMATION_TYPE_KEY[r.confirmation_type] ?? '',
          { lang },
        );
        return {
          id: r.id,
          status: {
            id: r.status,
            name: typeof statusLabel === 'string' ? statusLabel : '',
          },
          order: r.order,
          worker: w
            ? {
                id: w.id,
                uuid: w.uuid,
                photo: await this.minio.fileUrl(w.photo),
                last_name: w.last_name,
                first_name: w.first_name,
                middle_name: w.middle_name,
                birthday: w.birthday,
                pin: w.pin,
              }
            : null,
          position: r.position,
          confirmation_type: {
            id: r.confirmation_type,
            name: typeof typeLabel === 'string' ? typeLabel : '',
          },
          main: r.main,
        };
      }),
    );

    return { confirmations };
  }

  // DELETE /api/v1/timesheet/{timesheetId}/confirmations/{confirmationId}
  async detach(_timesheetId: number, confirmationId: number): Promise<void> {
    const [row] = await this.db
      .select({ id: timesheet_confirmations.id })
      .from(timesheet_confirmations)
      .where(
        and(
          eq(timesheet_confirmations.id, confirmationId),
          notDeleted(timesheet_confirmations),
        ),
      )
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    await this.db
      .update(timesheet_confirmations)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(timesheet_confirmations.id, confirmationId));
  }

  // ---- helpers ----

  private async assertTimesheetExists(id: number): Promise<void> {
    const [row] = await this.db
      .select({ id: time_sheets.id })
      .from(time_sheets)
      .where(and(eq(time_sheets.id, id), notDeleted(time_sheets)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
  }
}
