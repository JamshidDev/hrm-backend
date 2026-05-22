// Confirmation lists service.
// Laravel: Confirmation/{Contract,Command,ContractAdditional,Timesheet,VacationSchedule,
//   WorkerApplication,LmsProtocol,LmsCertificate,StaffingApprove,Report}ConfirmationController.
//
// Har bir endpoint o'z confirmation table'idan paginated list qaytaradi. Asosiy
// document (contract/command/...) status != SUCCESS bo'lganlarini ko'rsatadi.

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
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
import { toLaravelTimestamp } from '@/common/utils/datetime.util';
import { QueryConfirmationDto } from '@/modules/confirmation/confirmations/dto/confirmation.dto';
import {
  CONFIRMATION_STATUS,
  CONFIRMATION_STATUS_LABELS,
  CONFIRMATION_TYPE_LABELS,
  CONTRACT_TYPE_LABELS,
  CONTRACT_COMMAND_STATUS_LABELS,
  POSITION_STATUS_LABELS,
  COMMAND_TYPE_LABELS,
} from '@/modules/confirmation/confirmations/confirmations.types';

@Injectable()
export class ConfirmationsService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
  ) {}

  // GET /api/v1/confirmation/contracts — Laravel: ContractConfirmationController::index.
  // ContractConfirmationResource: {id, contract: ContractResource, status, position,
  //   confirmation_type, main, generate}.
  async contracts(filters: QueryConfirmationDto) {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;
    const lang = this.ctx.lang;

    // Laravel scopeFilter — faqat joriy foydalanuvchi (worker) tasdiqlari.
    const workerId = this.ctx.worker_id;
    // Faqat contract'i SUCCESS bo'lmagan (hali jarayondagi) confirmation'lar.
    const where = and(
      notDeleted(contract_confirmations),
      workerId != null
        ? eq(contract_confirmations.worker_id, workerId)
        : isNull(contract_confirmations.worker_id),
      sql`${contract_confirmations.contract_id} IN (SELECT id FROM ${contracts} WHERE confirmation != ${CONFIRMATION_STATUS.SUCCESS} AND deleted_at IS NULL)`,
      filters.status != null
        ? eq(contract_confirmations.status, filters.status)
        : undefined,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(contract_confirmations)
        .where(where)
        .orderBy(desc(contract_confirmations.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(contract_confirmations)
        .where(where),
    ]);

    // Batch: contracts → workers + organizations.
    const contractIds = [
      ...new Set(
        rows.map((r) => r.contract_id).filter((id): id is number => id != null),
      ),
    ];
    const contractRows = contractIds.length
      ? await this.db
          .select()
          .from(contracts)
          .where(inArray(contracts.id, contractIds))
      : [];
    const contractMap = new Map(contractRows.map((c) => [c.id, c] as const));

    const workerIds = [
      ...new Set(
        contractRows
          .map((c) => c.worker_id)
          .filter((id): id is number => id != null),
      ),
    ];
    const orgIds = [
      ...new Set(
        contractRows
          .map((c) => c.organization_id)
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
            birthday: workers.birthday,
            education: workers.education,
          })
          .from(workers)
          .where(inArray(workers.id, workerIds))
      : [];
    const orgRows = orgIds.length
      ? await this.db
          .select({
            id: organizations.id,
            name: organizations.name,
            name_ru: organizations.name_ru,
            name_en: organizations.name_en,
            group: organizations.group,
          })
          .from(organizations)
          .where(inArray(organizations.id, orgIds))
      : [];
    const workerMap = new Map(workerRows.map((w) => [w.id, w] as const));
    const orgMap = new Map(orgRows.map((o) => [o.id, o] as const));

    // Laravel HR\Transformers\Contract\ContractResource.
    const buildContract = async (c: typeof contracts.$inferSelect) => {
      const w = c.worker_id != null ? workerMap.get(c.worker_id) : undefined;
      const o =
        c.organization_id != null ? orgMap.get(c.organization_id) : undefined;
      return {
        id: c.id,
        number: c.number,
        worker: w
          ? {
              id: w.id,
              uuid: w.uuid,
              photo: await this.minio.fileUrl(w.photo),
              last_name: w.last_name,
              first_name: w.first_name,
              middle_name: w.middle_name,
              birthday: w.birthday,
              education: w.education,
              age: computeAge(w.birthday),
            }
          : null,
        organization: o
          ? { id: o.id, name: localizedName(o, lang), group: o.group ?? false }
          : null,
        file: await this.minio.fileUrl(c.file),
        confirmation_file: await this.minio.fileUrl(c.confirmation_file),
        contract_date: c.contract_date,
        type: {
          id: c.type,
          name: this.enumName(CONTRACT_TYPE_LABELS, c.type, lang),
        },
        command_status: {
          id: c.command_status,
          name: this.enumName(
            CONTRACT_COMMAND_STATUS_LABELS,
            c.command_status,
            lang,
          ),
        },
        status: {
          id: c.status,
          name: this.enumName(POSITION_STATUS_LABELS, c.status, lang),
        },
        confirmation: {
          id: c.confirmation,
          name: this.enumName(CONFIRMATION_STATUS_LABELS, c.confirmation, lang),
        },
        generate: c.generate,
        created_at: toLaravelTimestamp(c.created_at),
        creator: c.user_id,
      };
    };

    const data = await Promise.all(
      rows.map(async (r) => {
        const c =
          r.contract_id != null ? contractMap.get(r.contract_id) : undefined;
        return {
          id: r.id,
          contract: c ? await buildContract(c) : null,
          status: {
            id: r.status,
            name: this.enumName(CONFIRMATION_STATUS_LABELS, r.status, lang),
          },
          position: r.position,
          confirmation_type: {
            id: r.confirmation_type,
            name: this.enumName(
              CONFIRMATION_TYPE_LABELS,
              r.confirmation_type,
              lang,
            ),
          },
          main: r.main,
          generate: c?.generate ?? null,
        };
      }),
    );

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data,
    };
  }

  // i18n enum label — id => map kaliti => tarjima.
  private enumName(
    map: Record<number, string>,
    id: number | null | undefined,
    lang: string,
  ): string {
    const key = id != null ? map[id] : undefined;
    if (!key) return '';
    const v = this.i18n.t(key, { lang });
    return typeof v === 'string' ? v : '';
  }

  // GET /api/v1/confirmation/commands — Laravel: CommandConfirmationController::index.
  // CommandConfirmationResource: {id, command: CommandInfoResource, status, position,
  //   confirmation_type, main, generate}.
  async commands(filters: QueryConfirmationDto) {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;
    const lang = this.ctx.lang;

    // Laravel scopeFilter — faqat joriy foydalanuvchi (worker) tasdiqlari.
    const workerId = this.ctx.worker_id;
    // Faqat command'i SUCCESS bo'lmagan (hali jarayondagi) confirmation'lar.
    const where = and(
      notDeleted(command_confirmations),
      workerId != null
        ? eq(command_confirmations.worker_id, workerId)
        : isNull(command_confirmations.worker_id),
      sql`${command_confirmations.command_id} IN (SELECT id FROM ${commands} WHERE confirmation != ${CONFIRMATION_STATUS.SUCCESS} AND deleted_at IS NULL)`,
      filters.status != null
        ? eq(command_confirmations.status, filters.status)
        : undefined,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(command_confirmations)
        .where(where)
        .orderBy(desc(command_confirmations.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(command_confirmations)
        .where(where),
    ]);

    // Batch: commands → organizations.
    const commandIds = [
      ...new Set(
        rows.map((r) => r.command_id).filter((id): id is number => id != null),
      ),
    ];
    const commandRows = commandIds.length
      ? await this.db
          .select()
          .from(commands)
          .where(inArray(commands.id, commandIds))
      : [];
    const commandMap = new Map(commandRows.map((c) => [c.id, c] as const));

    const orgIds = [
      ...new Set(
        commandRows
          .map((c) => c.organization_id)
          .filter((id): id is number => id != null),
      ),
    ];
    const orgRows = orgIds.length
      ? await this.db
          .select({
            id: organizations.id,
            name: organizations.name,
            name_ru: organizations.name_ru,
            name_en: organizations.name_en,
            group: organizations.group,
          })
          .from(organizations)
          .where(inArray(organizations.id, orgIds))
      : [];
    const orgMap = new Map(orgRows.map((o) => [o.id, o] as const));

    // Laravel HR\Transformers\Command\CommandInfoResource.
    const buildCommand = async (c: typeof commands.$inferSelect) => {
      const o =
        c.organization_id != null ? orgMap.get(c.organization_id) : undefined;
      return {
        id: c.id,
        command_number: c.command_number,
        command_date: c.command_date,
        confirmation_file: await this.minio.fileUrl(c.confirmation_file),
        organization: o
          ? { id: o.id, name: localizedName(o, lang), group: o.group ?? false }
          : null,
        type: {
          id: c.type,
          name: this.enumName(COMMAND_TYPE_LABELS, c.type, lang),
        },
        confirmation: {
          id: c.confirmation,
          name: this.enumName(CONFIRMATION_STATUS_LABELS, c.confirmation, lang),
        },
        creator: c.user_id,
      };
    };

    const data = await Promise.all(
      rows.map(async (r) => {
        const c =
          r.command_id != null ? commandMap.get(r.command_id) : undefined;
        return {
          id: r.id,
          command: c ? await buildCommand(c) : null,
          status: {
            id: r.status,
            name: this.enumName(CONFIRMATION_STATUS_LABELS, r.status, lang),
          },
          position: r.position,
          confirmation_type: {
            id: r.confirmation_type,
            name: this.enumName(
              CONFIRMATION_TYPE_LABELS,
              r.confirmation_type,
              lang,
            ),
          },
          main: r.main,
          generate: c?.generate ?? null,
        };
      }),
    );

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data,
    };
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

    const cTable = confirmationTable as any;

    const dTable = docTable as any;

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
        ? this.db.select().from(dTable).where(inArray(dTable.id, docIds))
        : [],
    ]);

    const workerMap = new Map<number, (typeof workerRows)[number]>(
      workerRows.map((w) => [w.id, w] as const),
    );

    const docMap = new Map<number, any>(
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

// Worker yoshi — Laravel WorkerInfoResource: (int)abs(now diffInYears birthday).
function computeAge(birthday: string | null): number {
  if (!birthday) return 0;
  const b = new Date(birthday);
  if (Number.isNaN(b.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age -= 1;
  return Math.abs(age);
}

// Tashkilot nomi — til bo'yicha (Laravel OrganizationListResource).
function localizedName(
  o: { name: string | null; name_ru: string | null; name_en: string | null },
  lang: string,
): string | null {
  if (lang === 'ru') return o.name_ru ?? o.name;
  if (lang === 'en') return o.name_en ?? o.name;
  return o.name;
}
