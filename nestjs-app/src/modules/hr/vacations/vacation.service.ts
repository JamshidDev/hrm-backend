// Vacation service. Laravel: VacationController::list() (only).
// Filter: to >= today.

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, gte, inArray, isNull } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  vacations,
  worker_positions,
  organizations,
  workers,
  departments,
  positions as positionsTable,
  contracts,
  commands,
} from '@/db/schema';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { buildWorkerSearchCond } from '@/modules/hr/_shared/worker-search.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import { ExcelService } from '@/shared/excel/excel.service';
import { ExportTaskRunner } from '@/shared/export-task/export-task-runner.service';
import { VacationMapper } from '@/modules/hr/vacations/vacation.mapper';
import {
  QueryVacationDto,
  VacationCalculateDto,
  VacationCreateDto,
  VacationListResponseDto,
} from '@/modules/hr/vacations/dto/vacation.dto';

// VacationTypeEnum::get($commandType, $locale) — Command type id → vacation type id.
const COMMAND_TO_VACATION_TYPE: Record<number, number> = {
  41: 1,
  42: 1,
  43: 1,
  44: 1,
  46: 1,
  45: 3,
  49: 3,
  48: 2,
  51: 5,
  52: 4,
  53: 7,
  55: 6,
};

const VACATION_TYPE_LABELS: Record<number, string> = {
  1: 'messages.vacations.types.one',
  2: 'messages.vacations.types.two',
  3: 'messages.vacations.types.three',
  4: 'messages.vacations.types.four',
  5: 'messages.vacations.types.five',
  6: 'messages.vacations.types.six',
  7: 'messages.vacations.types.seven',
  8: 'messages.vacations.types.eight',
};

// VacationTypeEnum::get default → 8 (otherwise).
function commandTypeToVacationType(commandType: number): number {
  return COMMAND_TO_VACATION_TYPE[commandType] ?? 8;
}

@Injectable()
export class VacationService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
    private readonly excel: ExcelService,
    private readonly exportRunner: ExportTaskRunner,
  ) {}

  async findAll(filters: QueryVacationDto): Promise<VacationListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;

    const orgIds = filters.organizations
      ? filters.organizations
          .split(',')
          .map((s) => Number(s))
          .filter((n) => !Number.isNaN(n))
      : [];

    // Laravel scopeSearchByFullName parity.
    const searchCond = buildWorkerSearchCond(filters.search);

    const today = new Date().toISOString().split('T')[0];

    const where = and(
      isNull(vacations.deleted_at),
      gte(vacations.to, today),
      filters.organization_id
        ? eq(vacations.organization_id, filters.organization_id)
        : undefined,
      orgIds.length > 0
        ? inArray(vacations.organization_id, orgIds)
        : undefined,
      searchCond,
    );

    const offset = (page - 1) * perPage;

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: vacations.id,
          type: vacations.type,
          from: vacations.from,
          to: vacations.to,
          work_day: vacations.work_day,
          rest_day: vacations.rest_day,
          main_day: vacations.main_day,
          second_day: vacations.second_day,
          wp_id: worker_positions.id,
          worker_id: workers.id,
          worker_photo: workers.photo,
          worker_last: workers.last_name,
          worker_first: workers.first_name,
          worker_middle: workers.middle_name,
          worker_birthday: workers.birthday,
          dept_name: departments.name,
          dept_level: departments.level,
          pos_name: positionsTable.name,
          org_id: organizations.id,
          org_name: organizations.name,
          org_name_ru: organizations.name_ru,
          org_name_en: organizations.name_en,
          org_group: organizations.group,
          org_full_name: organizations.full_name,
        })
        .from(vacations)
        .leftJoin(
          worker_positions,
          eq(worker_positions.id, vacations.worker_position_id),
        )
        .leftJoin(workers, eq(workers.id, vacations.worker_id))
        .leftJoin(
          departments,
          eq(departments.id, worker_positions.department_id),
        )
        .leftJoin(
          positionsTable,
          eq(positionsTable.id, worker_positions.position_id),
        )
        .leftJoin(
          organizations,
          eq(organizations.id, vacations.organization_id),
        )
        .where(where)
        .orderBy(desc(vacations.to))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(vacations)
        .leftJoin(workers, eq(workers.id, vacations.worker_id))
        .where(where),
    ]);

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: await Promise.all(
        rows.map((r) =>
          VacationMapper.toItem(r, today, this.i18n, lang, this.minio),
        ),
      ),
    };
  }

  // GET /api/v1/hr/vacations?download=true — Laravel: UserExportTask +
  // VacationWorkersExportJob. Umumiy ExportTaskRunner orqali.
  async exportToTask(filters: QueryVacationDto): Promise<void> {
    // lang so'rov kontekstida olinadi (build fonda ishlaydi).
    const lang = this.ctx.lang;
    await this.exportRunner.run({
      type: 26, // ExportTaskEnum.VACATION_WORKERS
      folder: 'vacations',
      build: () => this.buildVacationExcel(filters, lang),
    });
  }

  // Vacation ma'lumotlarini Excel buffer'iga aylantiradi (ExportTaskRunner uchun).
  private async buildVacationExcel(
    filters: QueryVacationDto,
    lang: string,
  ): Promise<Buffer> {
    const orgIds = filters.organizations
      ? filters.organizations
          .split(',')
          .map((s) => Number(s))
          .filter((n) => !Number.isNaN(n))
      : [];
    const searchCond = buildWorkerSearchCond(filters.search);
    const today = new Date().toISOString().split('T')[0];

    const where = and(
      isNull(vacations.deleted_at),
      gte(vacations.to, today),
      filters.organization_id
        ? eq(vacations.organization_id, filters.organization_id)
        : undefined,
      orgIds.length > 0
        ? inArray(vacations.organization_id, orgIds)
        : undefined,
      searchCond,
    );

    const rows = await this.db
      .select({
        type: vacations.type,
        period_from: vacations.period_from,
        period_to: vacations.period_to,
        from: vacations.from,
        to: vacations.to,
        worker_last: workers.last_name,
        worker_first: workers.first_name,
        worker_middle: workers.middle_name,
        dept_name: departments.name,
        pos_name: positionsTable.name,
        command_number: commands.command_number,
        command_date: commands.command_date,
      })
      .from(vacations)
      .leftJoin(
        worker_positions,
        eq(worker_positions.id, vacations.worker_position_id),
      )
      .leftJoin(workers, eq(workers.id, vacations.worker_id))
      .leftJoin(departments, eq(departments.id, worker_positions.department_id))
      .leftJoin(
        positionsTable,
        eq(positionsTable.id, worker_positions.position_id),
      )
      .leftJoin(commands, eq(commands.id, vacations.command_id))
      .where(where)
      .orderBy(desc(vacations.id));

    const excelRows = rows.map((r) => ({
      last_name: r.worker_last ?? '',
      first_name: r.worker_first ?? '',
      middle_name: r.worker_middle ?? '',
      position: [r.dept_name, r.pos_name].filter(Boolean).join(' '),
      command_number: r.command_number ?? '',
      command_date: r.command_date ?? '',
      type: this.vacationTypeLabel(r.type, lang),
      period_from: r.period_from ?? '',
      period_to: r.period_to ?? '',
      from: r.from ?? '',
      to: r.to ?? '',
    }));

    return this.excel.build({
      creator: 'HRM',
      sheets: [
        {
          name: 'Vacations',
          columns: [
            { header: 'Familiya', key: 'last_name', width: 18 },
            { header: 'Ism', key: 'first_name', width: 18 },
            { header: 'Otasining ismi', key: 'middle_name', width: 20 },
            { header: 'Lavozim', key: 'position', width: 34 },
            { header: 'Buyruq raqami', key: 'command_number', width: 16 },
            { header: 'Buyruq sanasi', key: 'command_date', width: 16 },
            { header: 'Turi', key: 'type', width: 24 },
            { header: 'Davr boshi', key: 'period_from', width: 14 },
            { header: 'Davr oxiri', key: 'period_to', width: 14 },
            { header: 'Boshlanishi', key: 'from', width: 14 },
            { header: 'Tugashi', key: 'to', width: 14 },
          ],
          rows: excelRows,
        },
      ],
    });
  }

  private vacationTypeLabel(type: number, lang: string): string {
    const key = VACATION_TYPE_LABELS[type];
    if (!key) return '';
    const val = this.i18n.t(key, { lang });
    return typeof val === 'string' ? val : '';
  }

  // POST /vacations/create — getLastVacations: latest vacation per worker_position_id
  // for workers whose worker_position_id is in input.
  async create(dto: VacationCreateDto) {
    const lang = this.ctx.lang;
    if (!dto.worker_positions || dto.worker_positions.length === 0) return [];

    // 1. Get worker_ids from input worker_position_ids.
    const wpRows = await this.db
      .select({
        id: worker_positions.id,
        worker_id: worker_positions.worker_id,
      })
      .from(worker_positions)
      .where(inArray(worker_positions.id, dto.worker_positions));
    const workerIds = [
      ...new Set(
        wpRows.map((r) => r.worker_id).filter((id): id is number => id != null),
      ),
    ];
    if (workerIds.length === 0) return [];

    // 2. Get all vacations for these workers, then group by worker_position_id and keep latest (highest id).
    const vRows = await this.db
      .select({
        id: vacations.id,
        type: vacations.type,
        all_day: vacations.all_day,
        worker_position_id: vacations.worker_position_id,
        period_from: vacations.period_from,
        period_to: vacations.period_to,
        from: vacations.from,
        to: vacations.to,
        rest_day: vacations.rest_day,
      })
      .from(vacations)
      .where(
        and(inArray(vacations.worker_id, workerIds), notDeleted(vacations)),
      );

    // Group by worker_position_id keep highest id (latest).
    const latest = new Map<number, (typeof vRows)[number]>();
    for (const v of vRows) {
      const cur = latest.get(v.worker_position_id);
      if (!cur || v.id > cur.id) latest.set(v.worker_position_id, v);
    }

    return Array.from(latest.values()).map((v) => {
      const vacationTypeId = commandTypeToVacationType(v.type);
      const labelKey = VACATION_TYPE_LABELS[vacationTypeId];
      const name = labelKey ? this.i18n.t(labelKey, { lang }) : '';
      return {
        all_day: v.all_day,
        type: {
          id: v.type,
          name: typeof name === 'string' ? name : '',
        },
        worker_position_id: v.worker_position_id,
        period_from: v.period_from,
        period_to: v.period_to,
        from: v.from,
        to: v.to,
        rest_day: v.rest_day,
      };
    });
  }

  // POST /vacations/calculate — per WorkerPosition: compute period_from/to + final dates.
  async calculate(dto: VacationCalculateDto) {
    if (!dto.worker_positions || dto.worker_positions.length === 0) return [];
    const inputIds = dto.worker_positions.map((p) => p.id);

    // Eager-load worker_position + worker + contract + vacations.
    const [wpRows, workerRows, contractRows, vacationRows] = await Promise.all([
      this.db
        .select({
          id: worker_positions.id,
          worker_id: worker_positions.worker_id,
          contract_id: worker_positions.contract_id,
        })
        .from(worker_positions)
        .where(inArray(worker_positions.id, inputIds)),
      this.db
        .select({
          id: workers.id,
          experience_date: workers.experience_date,
        })
        .from(workers),
      this.db
        .select({ id: contracts.id, contract_date: contracts.contract_date })
        .from(contracts),
      this.db
        .select({
          worker_position_id: vacations.worker_position_id,
          period_to: vacations.period_to,
          rest_day: vacations.rest_day,
          to: vacations.to,
        })
        .from(vacations)
        .where(
          and(
            inArray(vacations.worker_position_id, inputIds),
            notDeleted(vacations),
          ),
        ),
    ]);

    const wpMap = new Map(wpRows.map((r) => [r.id, r]));
    const workerMap = new Map(workerRows.map((r) => [r.id, r]));
    const contractMap = new Map(contractRows.map((r) => [r.id, r]));

    // Group vacations by worker_position_id, pick max(to) record.
    const vacLatest = new Map<number, (typeof vacationRows)[number]>();
    for (const v of vacationRows) {
      const cur = vacLatest.get(v.worker_position_id);
      if (!cur) vacLatest.set(v.worker_position_id, v);
      else if (
        v.to &&
        cur.to &&
        new Date(v.to).getTime() > new Date(cur.to).getTime()
      ) {
        vacLatest.set(v.worker_position_id, v);
      }
    }

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    return dto.worker_positions.map((row) => {
      const wp = wpMap.get(row.id);
      const worker = wp?.worker_id ? workerMap.get(wp.worker_id) : null;
      const contract = wp?.contract_id ? contractMap.get(wp.contract_id) : null;
      const lastVac = vacLatest.get(row.id);

      const restDay = lastVac?.rest_day ?? 0;
      const periodFrom =
        lastVac?.period_to ?? contract?.contract_date ?? todayStr;

      const pfDate = new Date(periodFrom);
      const periodToDate = new Date(pfDate);
      periodToDate.setFullYear(periodToDate.getFullYear() + 1);
      const periodTo = `${periodToDate.getFullYear()}-${String(periodToDate.getMonth() + 1).padStart(2, '0')}-${String(periodToDate.getDate()).padStart(2, '0')}`;

      // Experience = years between worker.experience_date and now.
      let experience = 0;
      if (worker?.experience_date) {
        const ed = new Date(worker.experience_date);
        const diffMs = today.getTime() - ed.getTime();
        experience = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
      }

      const otherDay = (row.additional ?? []).reduce(
        (sum, a) => sum + (a.value ?? 0),
        0,
      );
      const allDay = row.main_day + row.second_day + otherDay + restDay;

      const fromDate = new Date(row.from);
      const toDate = new Date(fromDate);
      toDate.setDate(toDate.getDate() + allDay);

      // workDay — adjust for weekends.
      const workDay = new Date(toDate);
      const dow = workDay.getUTCDay();
      if (dow === 6) {
        workDay.setDate(workDay.getDate() + 2); // Saturday → +2
      } else if (dow === 0) {
        workDay.setDate(workDay.getDate() + 1); // Sunday → +1
      }

      const fmt = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      return {
        id: row.id,
        period_from: periodFrom,
        period_to: periodTo,
        to: fmt(toDate),
        work_day: fmt(workDay),
        all_day: allDay,
        second_day: row.second_day,
        experience,
      };
    });
  }
}
