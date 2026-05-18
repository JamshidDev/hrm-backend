// Confirmation lists service.
// Laravel: Confirmation/{Contract,Command,ContractAdditional,Timesheet,VacationSchedule,
//   WorkerApplication,LmsProtocol,LmsCertificate,StaffingApprove,Report}ConfirmationController.
//
// Har bir endpoint o'z confirmation table'idan paginated list qaytaradi. Asosiy
// document (contract/command/...) status != SUCCESS bo'lganlarini ko'rsatadi.

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray, isNull, ne, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  commands,
  command_confirmations,
  contract_additional,
  contract_additional_confirmations,
  contracts,
  contract_confirmations,
  lms_certificate_confirmations,
  lms_protocol_confirmations,
  organizations,
  report_confirmations,
  staffing_approve_confirmations,
  time_sheets,
  timesheet_confirmations,
  vacation_schedule_confirmations,
  vacation_schedule_years,
  worker_application_confirmations,
  worker_applications,
  workers,
} from '@/db/schema';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import { QueryConfirmationDto } from '@/modules/confirmation/confirmations/dto/confirmation.dto';
import {
  CONFIRMATION_STATUS,
  CONFIRMATION_STATUS_LABELS,
  CONFIRMATION_TYPE_LABELS,
} from '@/modules/confirmation/confirmations/confirmations.types';

@Injectable()
export class ConfirmationsService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
  ) {}

  // GET /api/v1/confirmation/contracts
  async contracts(filters: QueryConfirmationDto) {
    return this.listGeneric({
      filters,
      confirmationTable: contract_confirmations,
      docTable: contracts,
      docIdField: 'contract_id',
    });
  }

  // GET /api/v1/confirmation/commands
  async commands(filters: QueryConfirmationDto) {
    return this.listGeneric({
      filters,
      confirmationTable: command_confirmations,
      docTable: commands,
      docIdField: 'command_id',
    });
  }

  // GET /api/v1/confirmation/contract-additional
  async contractAdditional(filters: QueryConfirmationDto) {
    return this.listGeneric({
      filters,
      confirmationTable: contract_additional_confirmations,
      docTable: contract_additional,
      docIdField: 'contract_additional_id',
    });
  }

  // GET /api/v1/confirmation/timesheet
  async timesheet(filters: QueryConfirmationDto) {
    return this.listGeneric({
      filters,
      confirmationTable: timesheet_confirmations,
      docTable: time_sheets,
      docIdField: 'time_sheet_id',
    });
  }

  // GET /api/v1/confirmation/vacation-schedule
  async vacationSchedule(filters: QueryConfirmationDto) {
    return this.listGeneric({
      filters,
      confirmationTable: vacation_schedule_confirmations,
      docTable: vacation_schedule_years,
      docIdField: 'vacation_schedule_year_id',
    });
  }

  // GET /api/v1/confirmation/protocol — LmsProtocol
  async lmsProtocol(filters: QueryConfirmationDto) {
    return this.listConfirmationsBasic(lms_protocol_confirmations, filters);
  }

  // GET /api/v1/confirmation/certificates
  async lmsCertificate(filters: QueryConfirmationDto) {
    return this.listConfirmationsBasic(lms_certificate_confirmations, filters);
  }

  // GET /api/v1/confirmation/staffing-approve
  async staffingApprove(filters: QueryConfirmationDto) {
    return this.listConfirmationsBasic(staffing_approve_confirmations, filters);
  }

  // GET /api/v1/confirmation/reports
  async reports(filters: QueryConfirmationDto) {
    return this.listConfirmationsBasic(report_confirmations, filters);
  }

  // GET /api/v1/confirmation/applications — apiResource for worker-application confirmations.
  async workerApplications(filters: QueryConfirmationDto) {
    return this.listGeneric({
      filters,
      confirmationTable: worker_application_confirmations,
      docTable: worker_applications,
      docIdField: 'worker_application_id',
    });
  }

  // ---- helpers ----

  private async listGeneric(args: {
    filters: QueryConfirmationDto;
    confirmationTable: unknown;
    docTable: unknown;
    docIdField: string;
  }) {
    const { filters, confirmationTable, docTable, docIdField } = args;
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;
    const lang = this.ctx.lang;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cTable = confirmationTable as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dTable = docTable as any;

    // Document IDs which are NOT in SUCCESS confirmation status (still pending).
    const docWhere = and(
      notDeleted(dTable),
      ne(dTable.confirmation, CONFIRMATION_STATUS.SUCCESS),
    );

    const where = and(
      notDeleted(cTable),
      sql`${cTable[docIdField]} IN (SELECT id FROM ${dTable} WHERE confirmation != ${CONFIRMATION_STATUS.SUCCESS} AND deleted_at IS NULL)`,
      filters.status != null ? eq(cTable.status, filters.status) : undefined,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(cTable)
        .where(where)
        .orderBy(desc(cTable.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(cTable).where(where),
    ]);

    // Batch-load workers + document data.
    const workerIds = [
      ...new Set(
        rows
          .map((r) => r.worker_id as number | null)
          .filter((id): id is number => id != null),
      ),
    ];
    const docIds = [
      ...new Set(
        rows
          .map((r) => r[docIdField] as number | null)
          .filter((id): id is number => id != null),
      ),
    ];

    const [workerRows, docRows] = await Promise.all([
      workerIds.length
        ? this.db
            .select({
              id: workers.id,
              uuid: workers.uuid,
              photo: workers.photo,
              last_name: workers.last_name,
              first_name: workers.first_name,
              middle_name: workers.middle_name,
            })
            .from(workers)
            .where(inArray(workers.id, workerIds))
        : [],
      docIds.length
        ? this.db
            .select()
            .from(dTable)
            .where(inArray(dTable.id, docIds))
        : [],
    ]);

    const workerMap = new Map<number, (typeof workerRows)[number]>(
      workerRows.map((w) => [w.id, w] as const),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const docMap = new Map<number, any>(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (docRows as any[]).map((d) => [Number(d.id), d] as const),
    );

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => {
          const worker = r.worker_id ? workerMap.get(r.worker_id) : null;
          const doc = r[docIdField] ? docMap.get(r[docIdField]) : null;
          const statusLabel = this.i18n.t(
            CONFIRMATION_STATUS_LABELS[r.status] ?? '',
            { lang },
          );
          const typeLabel = this.i18n.t(
            CONFIRMATION_TYPE_LABELS[r.confirmation_type] ?? '',
            { lang },
          );
          return {
            id: r.id,
            position: r.position,
            order: r.order,
            main: r.main,
            type: r.type,
            status: {
              id: r.status,
              name: typeof statusLabel === 'string' ? statusLabel : '',
            },
            confirmation_type: {
              id: r.confirmation_type,
              name: typeof typeLabel === 'string' ? typeLabel : '',
            },
            worker: worker
              ? {
                  id: worker.id,
                  uuid: worker.uuid,
                  photo: await this.minio.fileUrl(worker.photo),
                  last_name: worker.last_name,
                  first_name: worker.first_name,
                  middle_name: worker.middle_name,
                }
              : null,
            document: doc,
          };
        }),
      ),
    };
  }

  private async listConfirmationsBasic(
    table: unknown,
    filters: QueryConfirmationDto,
  ) {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;
    const lang = this.ctx.lang;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t = table as any;

    const where = and(
      notDeleted(t),
      filters.status != null ? eq(t.status, filters.status) : undefined,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(t)
        .where(where)
        .orderBy(desc(t.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(t).where(where),
    ]);

    const workerIds = [
      ...new Set(
        rows
          .map((r) => r.worker_id as number | null)
          .filter((id): id is number => id != null),
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
          })
          .from(workers)
          .where(inArray(workers.id, workerIds))
      : [];
    const workerMap = new Map(workerRows.map((w) => [w.id, w]));

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => {
          const worker = r.worker_id ? workerMap.get(r.worker_id) : null;
          const statusLabel = this.i18n.t(
            CONFIRMATION_STATUS_LABELS[r.status] ?? '',
            { lang },
          );
          return {
            id: r.id,
            position: r.position,
            order: r.order,
            main: r.main,
            type: r.type,
            status: {
              id: r.status,
              name: typeof statusLabel === 'string' ? statusLabel : '',
            },
            worker: worker
              ? {
                  id: worker.id,
                  uuid: worker.uuid,
                  photo: await this.minio.fileUrl(worker.photo),
                  last_name: worker.last_name,
                  first_name: worker.first_name,
                  middle_name: worker.middle_name,
                }
              : null,
          };
        }),
      ),
    };
  }
}
