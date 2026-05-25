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
  confirmation_workers,
  contract_additional,
  contract_additional_confirmations,
  contracts,
  contract_confirmations,
  departments,
  lms_certificate_confirmations,
  lms_certificates,
  lms_protocol_confirmations,
  organizations,
  positions as positionsTable,
  report_confirmations,
  reports,
  staffing_approve_confirmations,
  staffing_approves,
  time_sheets,
  timesheet_confirmations,
  vacation_schedule_confirmations,
  vacation_schedule_years,
  worker_application_confirmations,
  worker_applications,
  worker_positions,
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
import { WORKER_APPLICATION_TYPE_LABELS } from '@/modules/hr/worker-applications/worker-application.types';
import {
  getFullPosition,
  getShortPosition,
} from '@/modules/hr/_shared/position-helper';

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

  // GET /api/v1/confirmation/vacation-schedule — Laravel: VacationScheduleConfirmationController.
  // VacationScheduleConfirmationResource: {id, schedule: VacationScheduleYearResource,
  //   status:{id,name}, position, confirmation_type:{id,name}, main,
  //   generate: schedule.generate}.
  async vacationSchedule(filters: QueryConfirmationDto) {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;
    const lang = this.ctx.lang;
    // Laravel scopeFilter: worker_id = $user->worker_id.
    const userWorkerId = this.ctx.worker_id;

    const where = and(
      notDeleted(vacation_schedule_confirmations),
      userWorkerId != null
        ? eq(vacation_schedule_confirmations.worker_id, userWorkerId)
        : sql`FALSE`,
      // Laravel: whereHas('schedule', confirmation != SUCCESS).
      sql`${vacation_schedule_confirmations.vacation_schedule_year_id} IN (
        SELECT id FROM ${vacation_schedule_years}
        WHERE confirmation != ${CONFIRMATION_STATUS.SUCCESS}
          AND deleted_at IS NULL
      )`,
      filters.status != null
        ? eq(vacation_schedule_confirmations.status, filters.status)
        : undefined,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(vacation_schedule_confirmations)
        .where(where)
        .orderBy(desc(vacation_schedule_confirmations.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(vacation_schedule_confirmations)
        .where(where),
    ]);

    // Batch: schedules → organization + director/tradeUnion/creator (via
    // confirmation_workers / worker_positions).
    const scheduleIds = [
      ...new Set(
        rows
          .map((r) => r.vacation_schedule_year_id)
          .filter((id): id is number => id != null),
      ),
    ];
    const scheduleRows = scheduleIds.length
      ? await this.db
          .select()
          .from(vacation_schedule_years)
          .where(inArray(vacation_schedule_years.id, scheduleIds))
      : [];
    const scheduleMap = new Map(scheduleRows.map((s) => [s.id, s] as const));

    const orgIds = [
      ...new Set(
        scheduleRows
          .map((s) => s.organization_id)
          .filter((id): id is number => id != null),
      ),
    ];
    const cwIds = [
      ...new Set(
        [
          ...scheduleRows.map((s) => s.director_id),
          ...scheduleRows.map((s) => s.trade_union_id),
        ].filter((id): id is number => id != null),
      ),
    ];
    const creatorIds = [
      ...new Set(
        scheduleRows
          .map((s) => s.creator_id)
          .filter((id): id is number => id != null),
      ),
    ];

    const [orgRowsList, cwRowsList, creatorRowsList] = await Promise.all([
      orgIds.length
        ? this.db
            .select({
              id: organizations.id,
              name: organizations.name,
              name_ru: organizations.name_ru,
              name_en: organizations.name_en,
              group: organizations.group,
            })
            .from(organizations)
            .where(inArray(organizations.id, orgIds))
        : [],
      cwIds.length
        ? this.db
            .select({
              id: confirmation_workers.id,
              position: confirmation_workers.position,
              worker_id: workers.id,
              worker_photo: workers.photo,
              worker_last: workers.last_name,
              worker_first: workers.first_name,
              worker_middle: workers.middle_name,
            })
            .from(confirmation_workers)
            .leftJoin(workers, eq(workers.id, confirmation_workers.worker_id))
            .where(inArray(confirmation_workers.id, cwIds))
        : [],
      creatorIds.length
        ? this.db
            .select({
              id: worker_positions.id,
              worker_id: workers.id,
              worker_photo: workers.photo,
              worker_last: workers.last_name,
              worker_first: workers.first_name,
              worker_middle: workers.middle_name,
              org_full_name: organizations.full_name,
              dept_name: departments.name,
              dept_level: departments.level,
              pos_name: positionsTable.name,
            })
            .from(worker_positions)
            .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
            .leftJoin(
              organizations,
              and(
                eq(organizations.id, worker_positions.organization_id),
                isNull(organizations.deleted_at),
              ),
            )
            .leftJoin(
              departments,
              eq(departments.id, worker_positions.department_id),
            )
            .leftJoin(
              positionsTable,
              eq(positionsTable.id, worker_positions.position_id),
            )
            .where(inArray(worker_positions.id, creatorIds))
        : [],
    ]);
    const orgMap = new Map(orgRowsList.map((o) => [o.id, o] as const));
    const cwMap = new Map(cwRowsList.map((c) => [c.id, c] as const));
    const creatorMap = new Map(creatorRowsList.map((c) => [c.id, c] as const));

    const buildMiniWorker = async (
      w:
        | {
            worker_id: number | null;
            worker_photo: string | null;
            worker_last: string | null;
            worker_first: string | null;
            worker_middle: string | null;
          }
        | undefined,
    ) =>
      w && w.worker_id
        ? {
            id: w.worker_id,
            photo: await this.minio.fileUrl(w.worker_photo),
            last_name: w.worker_last,
            first_name: w.worker_first,
            middle_name: w.worker_middle,
          }
        : null;

    const buildCwMin = async (cw: ReturnType<typeof cwMap.get> | undefined) =>
      cw
        ? {
            id: cw.id,
            worker: await buildMiniWorker(cw),
            position: cw.position,
          }
        : null;

    const buildCreator = async (
      cr: ReturnType<typeof creatorMap.get> | undefined,
    ) =>
      cr
        ? {
            id: cr.id,
            worker: await buildMiniWorker(cr),
            // Laravel PositionHelper::getFullPosition / getShortPosition.
            post_name: getFullPosition({
              position_name: cr.pos_name,
              department_name: cr.dept_name,
              department_level: cr.dept_level,
              organization_full_name: cr.org_full_name,
            }),
            post_short_name: getShortPosition({
              position_name: cr.pos_name,
              department_name: cr.dept_name,
              department_level: cr.dept_level,
              organization_full_name: cr.org_full_name,
            }),
          }
        : null;

    return {
      current_page: page,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => {
          const sched = r.vacation_schedule_year_id
            ? (scheduleMap.get(r.vacation_schedule_year_id) ?? null)
            : null;
          const schedOrg =
            sched && sched.organization_id != null
              ? (orgMap.get(sched.organization_id) ?? null)
              : null;
          const director =
            sched && sched.director_id != null
              ? cwMap.get(sched.director_id)
              : undefined;
          const tradeUnion =
            sched && sched.trade_union_id != null
              ? cwMap.get(sched.trade_union_id)
              : undefined;
          const creator =
            sched && sched.creator_id != null
              ? creatorMap.get(sched.creator_id)
              : undefined;

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
            schedule: sched
              ? {
                  id: sched.id,
                  organization: schedOrg
                    ? {
                        id: schedOrg.id,
                        name: localizedName(schedOrg, lang),
                        group: schedOrg.group ?? false,
                      }
                    : null,
                  year: sched.year,
                  number: sched.number,
                  date: sched.date,
                  director: await buildCwMin(director),
                  tradeUnion: await buildCwMin(tradeUnion),
                  creator: await buildCreator(creator),
                  file: await this.minio.fileUrl(sched.file),
                  confirmation_file: await this.minio.fileUrl(
                    sched.confirmation_file,
                  ),
                  generate: sched.generate,
                  confirmation: {
                    id: sched.confirmation,
                    name: this.enumName(
                      CONFIRMATION_STATUS_LABELS,
                      sched.confirmation,
                      lang,
                    ),
                  },
                }
              : null,
            status: {
              id: r.status,
              name: typeof statusLabel === 'string' ? statusLabel : '',
            },
            position: r.position,
            confirmation_type: {
              id: r.confirmation_type,
              name: typeof typeLabel === 'string' ? typeLabel : '',
            },
            main: r.main,
            generate: sched?.generate ?? null,
          };
        }),
      ),
    };
  }

  // GET /api/v1/confirmation/protocol — LmsProtocol
  async lmsProtocol(filters: QueryConfirmationDto) {
    return this.listConfirmationsBasic(lms_protocol_confirmations, filters);
  }

  // GET /api/v1/confirmation/certificates — Laravel LmsCertificateConfirmationController.
  // LmsCertificateConfirmationResource: {id, certificate: LmsCertificateResource,
  //   status:{id,name}, position, confirmation_type:{id,name}, main,
  //   generate: certificate.generate}.
  async lmsCertificate(filters: QueryConfirmationDto) {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;
    const lang = this.ctx.lang;
    // Laravel scopeFilter: worker_id = $user->worker_id.
    const userWorkerId = this.ctx.worker_id;

    const where = and(
      notDeleted(lms_certificate_confirmations),
      userWorkerId != null
        ? eq(lms_certificate_confirmations.worker_id, userWorkerId)
        : sql`FALSE`,
      filters.status != null
        ? eq(lms_certificate_confirmations.status, filters.status)
        : undefined,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(lms_certificate_confirmations)
        .where(where)
        .orderBy(desc(lms_certificate_confirmations.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(lms_certificate_confirmations)
        .where(where),
    ]);

    // Batch: certificate + worker_position(worker, position, department, organization)
    // + organization.
    const certIds = [
      ...new Set(
        rows
          .map((r) => r.lms_certificate_id)
          .filter((id): id is number => id != null),
      ),
    ];
    const certRows = certIds.length
      ? await this.db
          .select()
          .from(lms_certificates)
          .where(inArray(lms_certificates.id, certIds))
      : [];
    const certMap = new Map(certRows.map((c) => [c.id, c] as const));

    const wpIds = [
      ...new Set(
        certRows
          .map((c) => c.worker_position_id)
          .filter((id): id is number => id != null),
      ),
    ];
    const certOrgIds = [
      ...new Set(
        certRows
          .map((c) => c.organization_id)
          .filter((id): id is number => id != null),
      ),
    ];

    const [wpRowsList, certOrgRows] = await Promise.all([
      wpIds.length
        ? this.db
            .select({
              id: worker_positions.id,
              worker_id: workers.id,
              worker_photo: workers.photo,
              worker_last: workers.last_name,
              worker_first: workers.first_name,
              worker_middle: workers.middle_name,
              org_full_name: organizations.full_name,
              dept_name: departments.name,
              dept_level: departments.level,
              pos_name: positionsTable.name,
            })
            .from(worker_positions)
            .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
            .leftJoin(
              organizations,
              and(
                eq(organizations.id, worker_positions.organization_id),
                isNull(organizations.deleted_at),
              ),
            )
            .leftJoin(
              departments,
              eq(departments.id, worker_positions.department_id),
            )
            .leftJoin(
              positionsTable,
              eq(positionsTable.id, worker_positions.position_id),
            )
            .where(inArray(worker_positions.id, wpIds))
        : [],
      certOrgIds.length
        ? this.db
            .select({
              id: organizations.id,
              name: organizations.name,
              name_ru: organizations.name_ru,
              name_en: organizations.name_en,
              group: organizations.group,
            })
            .from(organizations)
            .where(inArray(organizations.id, certOrgIds))
        : [],
    ]);
    const wpMap = new Map(wpRowsList.map((w) => [w.id, w] as const));
    const certOrgMap = new Map(certOrgRows.map((o) => [o.id, o] as const));

    const buildWpMin = async (wp: ReturnType<typeof wpMap.get> | undefined) =>
      wp
        ? {
            id: wp.id,
            worker: wp.worker_id
              ? {
                  id: wp.worker_id,
                  photo: await this.minio.fileUrl(wp.worker_photo),
                  last_name: wp.worker_last,
                  first_name: wp.worker_first,
                  middle_name: wp.worker_middle,
                }
              : null,
            post_name: getFullPosition({
              position_name: wp.pos_name,
              department_name: wp.dept_name,
              department_level: wp.dept_level,
              organization_full_name: wp.org_full_name,
            }),
            post_short_name: getShortPosition({
              position_name: wp.pos_name,
              department_name: wp.dept_name,
              department_level: wp.dept_level,
              organization_full_name: wp.org_full_name,
            }),
          }
        : null;

    return {
      current_page: page,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => {
          const cert = r.lms_certificate_id
            ? (certMap.get(r.lms_certificate_id) ?? null)
            : null;
          const wp =
            cert && cert.worker_position_id != null
              ? wpMap.get(cert.worker_position_id)
              : undefined;
          const certOrg =
            cert && cert.organization_id != null
              ? (certOrgMap.get(cert.organization_id) ?? null)
              : null;

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
            certificate: cert
              ? {
                  id: cert.id,
                  worker_position: await buildWpMin(wp),
                  organization: certOrg
                    ? {
                        id: certOrg.id,
                        name: localizedName(certOrg, lang),
                        group: certOrg.group ?? false,
                      }
                    : null,
                  cert_from: cert.cert_from,
                  cert_to: cert.cert_to,
                  serial: serialTypeLabel(cert.serial),
                  number: padNumber(cert.number, 6),
                  start_exam_result: cert.start_exam_result,
                  end_exam_result: cert.end_exam_result,
                  confirmation_file: await this.minio.fileUrl(
                    cert.confirmation_file,
                  ),
                  generate: cert.generate,
                  confirmation: {
                    id: cert.confirmation,
                    name: this.enumName(
                      CONFIRMATION_STATUS_LABELS,
                      cert.confirmation,
                      lang,
                    ),
                  },
                }
              : null,
            status: {
              id: r.status,
              name: typeof statusLabel === 'string' ? statusLabel : '',
            },
            position: r.position,
            confirmation_type: {
              id: r.confirmation_type,
              name: typeof typeLabel === 'string' ? typeLabel : '',
            },
            main: r.main,
            generate: cert?.generate ?? null,
          };
        }),
      ),
    };
  }

  // GET /api/v1/confirmation/staffing-approve — Laravel: StaffingApproveConfirmationController.
  // StaffingApproveConfirmationResource: {id, staffing_approve: ApproveIndexResource,
  //   status:{id,name}, position, confirmation_type:{id,name}, main,
  //   generate: staffing_approve.generate}.
  async staffingApprove(filters: QueryConfirmationDto) {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;
    const lang = this.ctx.lang;
    // Laravel scopeFilter: worker_id = $user->worker_id.
    const userWorkerId = this.ctx.worker_id;

    const where = and(
      notDeleted(staffing_approve_confirmations),
      userWorkerId != null
        ? eq(staffing_approve_confirmations.worker_id, userWorkerId)
        : sql`FALSE`,
      // Laravel: whereHas('staffing_approve', confirmation != SUCCESS).
      sql`${staffing_approve_confirmations.staffing_approve_id} IN (
        SELECT id FROM ${staffing_approves}
        WHERE confirmation != ${CONFIRMATION_STATUS.SUCCESS}
          AND deleted_at IS NULL
      )`,
      filters.status != null
        ? eq(staffing_approve_confirmations.status, filters.status)
        : undefined,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(staffing_approve_confirmations)
        .where(where)
        .orderBy(desc(staffing_approve_confirmations.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(staffing_approve_confirmations)
        .where(where),
    ]);

    // Batch: staffing_approves → organization + confirmatory (worker_position
    // minimal: worker + organization + post_name).
    const saIds = [
      ...new Set(
        rows
          .map((r) => r.staffing_approve_id)
          .filter((id): id is number => id != null),
      ),
    ];
    const saRows = saIds.length
      ? await this.db
          .select()
          .from(staffing_approves)
          .where(inArray(staffing_approves.id, saIds))
      : [];
    const saMap = new Map(saRows.map((s) => [s.id, s] as const));

    const saOrgIds = [
      ...new Set(
        saRows
          .map((s) => s.organization_id)
          .filter((id): id is number => id != null),
      ),
    ];
    const confIds = [
      ...new Set(
        saRows
          .map((s) => s.confirmatory_id)
          .filter((id): id is number => id != null),
      ),
    ];

    const [saOrgList, confList] = await Promise.all([
      saOrgIds.length
        ? this.db
            .select({
              id: organizations.id,
              name: organizations.name,
              name_ru: organizations.name_ru,
              name_en: organizations.name_en,
              group: organizations.group,
            })
            .from(organizations)
            .where(inArray(organizations.id, saOrgIds))
        : [],
      confIds.length
        ? this.db
            .select({
              id: worker_positions.id,
              org_id: organizations.id,
              org_name: organizations.name,
              org_name_ru: organizations.name_ru,
              org_name_en: organizations.name_en,
              org_group: organizations.group,
              org_full_name: organizations.full_name,
              worker_id: workers.id,
              worker_photo: workers.photo,
              worker_last: workers.last_name,
              worker_first: workers.first_name,
              worker_middle: workers.middle_name,
              dept_name: departments.name,
              dept_level: departments.level,
              pos_name: positionsTable.name,
            })
            .from(worker_positions)
            .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
            .leftJoin(
              organizations,
              and(
                eq(organizations.id, worker_positions.organization_id),
                isNull(organizations.deleted_at),
              ),
            )
            .leftJoin(
              departments,
              eq(departments.id, worker_positions.department_id),
            )
            .leftJoin(
              positionsTable,
              eq(positionsTable.id, worker_positions.position_id),
            )
            .where(inArray(worker_positions.id, confIds))
        : [],
    ]);
    const saOrgMap = new Map(saOrgList.map((o) => [o.id, o] as const));
    const confMap = new Map(confList.map((c) => [c.id, c] as const));

    // Laravel WorkerPositionMinimalResource: {id, worker, organization, post_name,
    // post_short_name} — Min'dan farqi: organization ham bor.
    const buildConfirmatory = async (
      c: ReturnType<typeof confMap.get> | undefined,
    ) =>
      c
        ? {
            id: c.id,
            worker: c.worker_id
              ? {
                  id: c.worker_id,
                  photo: await this.minio.fileUrl(c.worker_photo),
                  last_name: c.worker_last,
                  first_name: c.worker_first,
                  middle_name: c.worker_middle,
                }
              : null,
            organization: c.org_id
              ? {
                  id: c.org_id,
                  name: localizedName(
                    {
                      name: c.org_name,
                      name_ru: c.org_name_ru,
                      name_en: c.org_name_en,
                    },
                    lang,
                  ),
                  group: c.org_group ?? false,
                }
              : null,
            post_name: getFullPosition({
              position_name: c.pos_name,
              department_name: c.dept_name,
              department_level: c.dept_level,
              organization_full_name: c.org_full_name,
            }),
            post_short_name: getShortPosition({
              position_name: c.pos_name,
              department_name: c.dept_name,
              department_level: c.dept_level,
              organization_full_name: c.org_full_name,
            }),
          }
        : null;

    return {
      current_page: page,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => {
          const sa = r.staffing_approve_id
            ? (saMap.get(r.staffing_approve_id) ?? null)
            : null;
          const saOrg =
            sa && sa.organization_id != null
              ? (saOrgMap.get(sa.organization_id) ?? null)
              : null;
          const confirmatory =
            sa && sa.confirmatory_id != null
              ? confMap.get(sa.confirmatory_id)
              : undefined;

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
            staffing_approve: sa
              ? {
                  id: sa.id,
                  number: sa.number,
                  date: sa.date,
                  organization: saOrg
                    ? {
                        id: saOrg.id,
                        name: localizedName(saOrg, lang),
                        group: saOrg.group ?? false,
                      }
                    : null,
                  generate: sa.generate,
                  confirmatory: await buildConfirmatory(confirmatory),
                  confirmation: {
                    id: sa.confirmation,
                    name: this.enumName(
                      CONFIRMATION_STATUS_LABELS,
                      sa.confirmation,
                      lang,
                    ),
                  },
                }
              : null,
            status: {
              id: r.status,
              name: typeof statusLabel === 'string' ? statusLabel : '',
            },
            position: r.position,
            confirmation_type: {
              id: r.confirmation_type,
              name: typeof typeLabel === 'string' ? typeLabel : '',
            },
            main: r.main,
            generate: sa?.generate ?? null,
          };
        }),
      ),
    };
  }

  // GET /api/v1/confirmation/reports — Laravel: ReportConfirmationController.
  // ReportConfirmationResource: {id, report: ReportIndexResource, status:{id,name},
  //   position, confirmation_type:{id,name}, main, generate: report.generate}.
  async reports(filters: QueryConfirmationDto) {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;
    const lang = this.ctx.lang;
    // Laravel scopeFilter: worker_id = $user->worker_id.
    const userWorkerId = this.ctx.worker_id;

    const where = and(
      notDeleted(report_confirmations),
      userWorkerId != null
        ? eq(report_confirmations.worker_id, userWorkerId)
        : sql`FALSE`,
      // Laravel: whereHas('report') — report mavjud va o'chirilmagan.
      sql`${report_confirmations.report_id} IN (
        SELECT id FROM ${reports} WHERE deleted_at IS NULL
      )`,
      filters.status != null
        ? eq(report_confirmations.status, filters.status)
        : undefined,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(report_confirmations)
        .where(where)
        .orderBy(desc(report_confirmations.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(report_confirmations)
        .where(where),
    ]);

    // Batch: reports → organization.
    const reportIds = [
      ...new Set(
        rows.map((r) => r.report_id).filter((id): id is number => id != null),
      ),
    ];
    const reportRows = reportIds.length
      ? await this.db
          .select()
          .from(reports)
          .where(inArray(reports.id, reportIds))
      : [];
    const reportMap = new Map(reportRows.map((r) => [r.id, r] as const));

    const reportOrgIds = [
      ...new Set(
        reportRows
          .map((r) => r.organization_id)
          .filter((id): id is number => id != null),
      ),
    ];
    const reportOrgRows = reportOrgIds.length
      ? await this.db
          .select({
            id: organizations.id,
            name: organizations.name,
            name_ru: organizations.name_ru,
            name_en: organizations.name_en,
            group: organizations.group,
          })
          .from(organizations)
          .where(inArray(organizations.id, reportOrgIds))
      : [];
    const reportOrgMap = new Map(reportOrgRows.map((o) => [o.id, o] as const));

    return {
      current_page: page,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => {
          const rep = r.report_id ? (reportMap.get(r.report_id) ?? null) : null;
          const repOrg =
            rep && rep.organization_id != null
              ? (reportOrgMap.get(rep.organization_id) ?? null)
              : null;

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
            report: rep
              ? {
                  id: rep.id,
                  uuid: rep.uuid,
                  year: rep.year,
                  month: rep.month,
                  organization: repOrg
                    ? {
                        id: repOrg.id,
                        name: localizedName(repOrg, lang),
                        group: repOrg.group ?? false,
                      }
                    : null,
                  file: await this.minio.fileUrl(rep.file),
                  confirmation_file: await this.minio.fileUrl(
                    rep.confirmation_file,
                  ),
                  confirmation: {
                    id: rep.confirmation,
                    name: this.enumName(
                      CONFIRMATION_STATUS_LABELS,
                      rep.confirmation,
                      lang,
                    ),
                  },
                  generate: rep.generate,
                  created_at: toLaravelTimestamp(rep.created_at),
                  // Laravel: withCount('details') chaqirilmaydi → null (parity).
                  details_count: null as number | null,
                }
              : null,
            status: {
              id: r.status,
              name: typeof statusLabel === 'string' ? statusLabel : '',
            },
            position: r.position,
            confirmation_type: {
              id: r.confirmation_type,
              name: typeof typeLabel === 'string' ? typeLabel : '',
            },
            main: r.main,
            generate: rep?.generate ?? null,
          };
        }),
      ),
    };
  }

  // GET /api/v1/confirmation/applications — Laravel: WorkerApplicationConfirmationController.
  // ApplicationConfirmationResource: {id, worker_application: WorkerApplicationResource,
  //   status: {id,name}, position, confirmation_type: {id,name}, main,
  //   generate: worker_application.generate}.
  async workerApplications(filters: QueryConfirmationDto) {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;
    const lang = this.ctx.lang;
    // Laravel: where('worker_id', $user->worker_id).
    const userWorkerId = this.ctx.worker_id;

    const where = and(
      notDeleted(worker_application_confirmations),
      userWorkerId != null
        ? eq(worker_application_confirmations.worker_id, userWorkerId)
        : sql`FALSE`,
      // Laravel: whereHas('worker_application', confirmation != SUCCESS).
      sql`${worker_application_confirmations.worker_application_id} IN (
        SELECT id FROM ${worker_applications}
        WHERE confirmation != ${CONFIRMATION_STATUS.SUCCESS}
          AND deleted_at IS NULL
      )`,
      filters.status != null
        ? eq(worker_application_confirmations.status, filters.status)
        : undefined,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(worker_application_confirmations)
        .where(where)
        .orderBy(desc(worker_application_confirmations.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(worker_application_confirmations)
        .where(where),
    ]);

    // Batch: worker_applications → worker + organization.
    const appIds = [
      ...new Set(
        rows
          .map((r) => r.worker_application_id)
          .filter((id): id is number => id != null),
      ),
    ];
    const appRows = appIds.length
      ? await this.db
          .select()
          .from(worker_applications)
          .where(inArray(worker_applications.id, appIds))
      : [];
    const appMap = new Map(appRows.map((a) => [a.id, a] as const));

    const appWorkerIds = [
      ...new Set(
        appRows
          .map((a) => a.worker_id)
          .filter((id): id is number => id != null),
      ),
    ];
    const appOrgIds = [
      ...new Set(
        appRows
          .map((a) => a.organization_id)
          .filter((id): id is number => id != null),
      ),
    ];

    const [appWorkerRows, appOrgRows] = await Promise.all([
      appWorkerIds.length
        ? this.db
            .select({
              id: workers.id,
              photo: workers.photo,
              last_name: workers.last_name,
              first_name: workers.first_name,
              middle_name: workers.middle_name,
            })
            .from(workers)
            .where(inArray(workers.id, appWorkerIds))
        : [],
      appOrgIds.length
        ? this.db
            .select({
              id: organizations.id,
              name: organizations.name,
              name_ru: organizations.name_ru,
              name_en: organizations.name_en,
              group: organizations.group,
            })
            .from(organizations)
            .where(inArray(organizations.id, appOrgIds))
        : [],
    ]);
    const appWorkerMap = new Map(appWorkerRows.map((w) => [w.id, w] as const));
    const appOrgMap = new Map(appOrgRows.map((o) => [o.id, o] as const));

    return {
      current_page: page,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => {
          const app = r.worker_application_id
            ? (appMap.get(r.worker_application_id) ?? null)
            : null;
          const appWorker =
            app && app.worker_id != null
              ? (appWorkerMap.get(app.worker_id) ?? null)
              : null;
          const appOrg =
            app && app.organization_id != null
              ? (appOrgMap.get(app.organization_id) ?? null)
              : null;

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
            worker_application: app
              ? {
                  id: app.id,
                  created_at: toLaravelTimestamp(app.created_at),
                  type: {
                    id: app.type,
                    name: this.enumName(
                      WORKER_APPLICATION_TYPE_LABELS,
                      app.type,
                      lang,
                    ),
                  },
                  worker: appWorker
                    ? {
                        id: appWorker.id,
                        photo: await this.minio.fileUrl(appWorker.photo),
                        last_name: appWorker.last_name,
                        first_name: appWorker.first_name,
                        middle_name: appWorker.middle_name,
                      }
                    : null,
                  number: app.number,
                  file: await this.minio.fileUrl(app.file),
                  confirmation_file: await this.minio.fileUrl(
                    app.confirmation_file,
                  ),
                  organization: appOrg
                    ? {
                        id: appOrg.id,
                        name: localizedName(appOrg, lang),
                        group: appOrg.group ?? false,
                      }
                    : null,
                  status: app.status,
                  generate: app.generate,
                  confirmation: {
                    id: app.confirmation,
                    name: this.enumName(
                      CONFIRMATION_STATUS_LABELS,
                      app.confirmation,
                      lang,
                    ),
                  },
                  creator: app.user_id,
                }
              : null,
            status: {
              id: r.status,
              name: typeof statusLabel === 'string' ? statusLabel : '',
            },
            position: r.position,
            confirmation_type: {
              id: r.confirmation_type,
              name: typeof typeLabel === 'string' ? typeLabel : '',
            },
            main: r.main,
            generate: app?.generate ?? null,
          };
        }),
      ),
    };
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
    // Laravel scopeFilter: worker_id = $user->worker_id (user-specific scope).
    const userWorkerId = this.ctx.worker_id;

    const cTable = confirmationTable as any;

    const dTable = docTable as any;

    const where = and(
      notDeleted(cTable),
      userWorkerId != null ? eq(cTable.worker_id, userWorkerId) : sql`FALSE`,
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
    // Laravel scopeFilter: worker_id = $user->worker_id (user-specific scope).
    const userWorkerId = this.ctx.worker_id;

    const t = table as any;

    const where = and(
      notDeleted(t),
      userWorkerId != null ? eq(t.worker_id, userWorkerId) : sql`FALSE`,
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

// Laravel Helper::pad_number — STR_PAD_LEFT '0' bilan to'ldirish.
function padNumber(value: number | null, length: number): string {
  if (value == null) return '';
  return String(value).padStart(length, '0');
}

// Laravel SerialTypeEnum::get — int → label.
function serialTypeLabel(serial: string | null): string {
  const map: Record<string, string> = {
    '1': 'MO-RW',
    '2': 'MO-LM',
    '3': 'MO-SM',
  };
  if (serial == null) return '';
  return map[String(serial)] ?? '';
}
