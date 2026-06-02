// TimeSheetWorker service. Laravel: TimeSheetWorkerController.

import { Injectable } from '@nestjs/common';
import {
  and,
  count,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  or,
  sql,
} from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  time_sheets,
  time_sheet_workers,
  worker_positions,
  workers,
  organizations,
  departments,
  positions as positionsTable,
  holidays,
} from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { MinioService } from '@/shared/minio/minio.service';
import {
  getShortPosition,
  getFullPosition,
} from '@/modules/hr/_shared/position-helper';
import {
  CheckWorkerItemDto,
  DayInMonthResponseDto,
  StoreTimeSheetWorkersDto,
  TimeSheetWorkerItemDto,
  TimeSheetWorkerListResponseDto,
} from '@/modules/timesheet/timesheet-workers/dto/timesheet-worker.dto';

const POSITION_STATUS_ACTIVE = 2;

// TimeSheetTypeEnum keys (1..35, only existing). Mapping id → letter code (Laravel).
const TIMESHEET_TYPE_KEY: Record<number, string> = {
  1: 'K',
  2: 'T',
  3: 'РП',
  5: 'С',
  10: 'К',
  14: 'MT',
  15: 'ОД',
  16: 'У',
  17: 'УВ',
  18: 'УД',
  19: 'Р',
  20: 'ОЧ',
  21: 'ОЖ',
  22: 'ДО',
  24: 'ОЗ',
  25: 'Б',
  26: 'Т',
  27: 'ЛЧ',
  28: 'ВП',
  29: 'Г',
  31: 'ПР',
  32: 'НС',
  33: 'D',
  34: 'ЗБ',
  35: 'НН',
};

@Injectable()
export class TimeSheetWorkerService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly minio: MinioService,
  ) {
    void this.i18n;
  }

  async findAll(
    timesheetId: number,
    perPage: number,
    page: number,
  ): Promise<TimeSheetWorkerListResponseDto> {
    const ts = await this.fetchTimesheet(timesheetId);
    const year = ts.year;
    const month = ts.month;
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

    // 1. Used worker_position_ids — has timesheet entries for this month.
    const usedWpRows = await this.db
      .select({ id: time_sheet_workers.worker_position_id })
      .from(time_sheet_workers)
      .where(
        and(
          eq(time_sheet_workers.time_sheet_id, timesheetId),
          gte(time_sheet_workers.work_date, monthStart),
          lte(time_sheet_workers.work_date, monthEnd),
          isNull(time_sheet_workers.deleted_at),
        ),
      );
    const usedWpIds = [...new Set(usedWpRows.map((r) => r.id))];

    // 2. Filter worker_positions — by dept/work_place OR in used IDs.
    const filterConds: ReturnType<typeof and>[] = [];
    if (ts.department_id) {
      filterConds.push(
        or(
          eq(worker_positions.department_id, ts.department_id),
          usedWpIds.length > 0
            ? inArray(worker_positions.id, usedWpIds)
            : sql`FALSE`,
        ),
      );
    } else if (ts.work_place_id) {
      filterConds.push(
        or(
          eq(worker_positions.organization_id, ts.work_place_id),
          usedWpIds.length > 0
            ? inArray(worker_positions.id, usedWpIds)
            : sql`FALSE`,
        ),
      );
    }

    const where = and(
      eq(worker_positions.status, POSITION_STATUS_ACTIVE),
      isNull(worker_positions.deleted_at),
      ...filterConds,
    );

    const offset = (page - 1) * perPage;

    const [wpRows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: worker_positions.id,
          worker_id: workers.id,
          worker_photo: workers.photo,
          worker_last: workers.last_name,
          worker_first: workers.first_name,
          worker_middle: workers.middle_name,
          position_name: positionsTable.name,
        })
        .from(worker_positions)
        .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
        .leftJoin(
          positionsTable,
          eq(positionsTable.id, worker_positions.position_id),
        )
        .where(where)
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(worker_positions).where(where),
    ]);

    // 3. Batch-load timesheet entries for these worker_positions in this month.
    const wpIds = wpRows.map((r) => r.id);
    const tsRows = wpIds.length
      ? await this.db
          .select({
            worker_position_id: time_sheet_workers.worker_position_id,
            work_date: time_sheet_workers.work_date,
            status: time_sheet_workers.status,
            hours: time_sheet_workers.hours,
          })
          .from(time_sheet_workers)
          .where(
            and(
              eq(time_sheet_workers.time_sheet_id, timesheetId),
              gte(time_sheet_workers.work_date, monthStart),
              lte(time_sheet_workers.work_date, monthEnd),
              inArray(time_sheet_workers.worker_position_id, wpIds),
              isNull(time_sheet_workers.deleted_at),
            ),
          )
      : [];

    // Group by worker_position_id then by work_date.
    const grouped = new Map<
      number,
      Map<string, Array<{ hours: number; status: number }>>
    >();
    for (const row of tsRows) {
      const wpMap = grouped.get(row.worker_position_id) ?? new Map();
      const dayList = wpMap.get(row.work_date) ?? [];
      dayList.push({ hours: row.hours, status: row.status });
      wpMap.set(row.work_date, dayList);
      grouped.set(row.worker_position_id, wpMap);
    }

    const data: TimeSheetWorkerItemDto[] = await Promise.all(
      wpRows.map(async (r) => {
        const wpMap = grouped.get(r.id) ?? new Map();
        const days = Array.from(wpMap.entries()).map(([date, items]) => ({
          day: new Date(date).getUTCDate(),
          details: (items as Array<{ hours: number; status: number }>).map(
            (it) => ({
              hours: it.hours ?? 0,
              status: TIMESHEET_TYPE_KEY[it.status] ?? null,
            }),
          ),
        }));
        const shortName = r.worker_id
          ? `${r.worker_last ?? ''} ${(r.worker_first ?? '').charAt(0)}.${(r.worker_middle ?? '').charAt(0) ? `${(r.worker_middle ?? '').charAt(0)}.` : ''}`.trim()
          : '';
        return {
          id: r.id,
          name: shortName,
          table: null,
          photo: await this.minio.fileUrl(r.worker_photo),
          position: r.position_name,
          days,
        };
      }),
    );

    return {
      current_page: page,
      total: Number(total),
      data,
    };
  }

  async store(
    timesheetId: number,
    dto: StoreTimeSheetWorkersDto,
  ): Promise<void> {
    const ts = await this.fetchTimesheet(timesheetId);
    if (ts.status) {
      throw new BusinessException(
        403,
        this.i18n.t('messages.time_sheet_status_confirmed'),
      );
    }

    const data = (dto.workers ?? []).map((w) => ({
      time_sheet_id: timesheetId,
      worker_position_id: Number(w.id),
      work_date: w.day,
      hours: dto.hours ?? 0,
      status: dto.status ?? 1,
    }));

    if (dto.status) {
      if (data.length > 0) {
        // Upsert on (time_sheet_id, worker_position_id, status, work_date) — update hours.
        await this.db
          .insert(time_sheet_workers)
          .values(data)
          .onConflictDoUpdate({
            target: [
              time_sheet_workers.time_sheet_id,
              time_sheet_workers.worker_position_id,
              time_sheet_workers.status,
              time_sheet_workers.work_date,
            ],
            set: { hours: sql`EXCLUDED.hours` },
          });
      }
    } else {
      // status=false (or 0) → forceDelete matching rows.
      const wpIds = data.map((d) => d.worker_position_id);
      const dates = data.map((d) => d.work_date);
      if (wpIds.length > 0 && dates.length > 0) {
        await this.db
          .delete(time_sheet_workers)
          .where(
            and(
              eq(time_sheet_workers.time_sheet_id, timesheetId),
              inArray(time_sheet_workers.worker_position_id, wpIds),
              inArray(time_sheet_workers.work_date, dates),
            ),
          );
      }
    }
  }

  async dayInMonth(timesheetId: number): Promise<DayInMonthResponseDto> {
    const ts = await this.fetchTimesheet(timesheetId);
    const year = ts.year;
    const month = ts.month;
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`;

    const hRows = await this.db
      .select()
      .from(holidays)
      .where(
        and(
          gte(holidays.holiday_date, monthStart),
          lte(holidays.holiday_date, monthEnd),
          isNull(holidays.deleted_at),
        ),
      );

    const days: DayInMonthResponseDto['days'] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const d = new Date(dateStr);
      const h = hRows.find((x) => x.holiday_date === dateStr);
      days.push({
        day,
        weekDay: d.getUTCDay(),
        is_holiday: !!h,
        comment: h?.name ?? null,
      });
    }

    // Department/work_place name.
    let deptName: string | null = null;
    if (ts.department_id) {
      const [d] = await this.db
        .select({ name: departments.name })
        .from(departments)
        .where(eq(departments.id, ts.department_id))
        .limit(1);
      deptName = d?.name ?? null;
    } else if (ts.work_place_id) {
      const [o] = await this.db
        .select({ name: organizations.name })
        .from(organizations)
        .where(eq(organizations.id, ts.work_place_id))
        .limit(1);
      deptName = o?.name ?? null;
    }

    return { department: deptName, month, year, days };
  }

  // GET /timesheet/check-worker?pin=
  async checkWorker(pin: string): Promise<CheckWorkerItemDto[]> {
    const pinNum = Number(pin);
    if (Number.isNaN(pinNum)) return [];

    const rows = await this.db
      .select({
        id: worker_positions.id,
        worker_id: workers.id,
        worker_photo: workers.photo,
        worker_last: workers.last_name,
        worker_first: workers.first_name,
        worker_middle: workers.middle_name,
        org_id: organizations.id,
        org_name: organizations.name,
        org_name_ru: organizations.name_ru,
        org_name_en: organizations.name_en,
        org_group: organizations.group,
        org_full_name: organizations.full_name,
        dept_name: departments.name,
        dept_level: departments.level,
        pos_name: positionsTable.name,
      })
      .from(worker_positions)
      .innerJoin(
        workers,
        and(
          eq(workers.id, worker_positions.worker_id),
          eq(workers.pin, pinNum),
        ),
      )
      .leftJoin(
        organizations,
        and(
          eq(organizations.id, worker_positions.organization_id),
          isNull(organizations.deleted_at),
        ),
      )
      .leftJoin(departments, eq(departments.id, worker_positions.department_id))
      .leftJoin(
        positionsTable,
        eq(positionsTable.id, worker_positions.position_id),
      )
      .where(
        and(
          eq(worker_positions.status, POSITION_STATUS_ACTIVE),
          isNull(worker_positions.deleted_at),
        ),
      );

    return Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        worker: r.worker_id
          ? {
              id: r.worker_id,
              photo: await this.minio.fileUrl(r.worker_photo),
              last_name: r.worker_last,
              first_name: r.worker_first,
              middle_name: r.worker_middle,
            }
          : null,
        organization: r.org_id
          ? {
              id: r.org_id,
              name: r.org_name,
              group: r.org_group ?? false,
            }
          : null,
        post_name: getFullPosition({
          position_name: r.pos_name,
          department_name: r.dept_name,
          department_level: r.dept_level,
          organization_full_name: r.org_full_name,
        }),
        post_short_name: getShortPosition({
          position_name: r.pos_name,
          department_name: r.dept_name,
          department_level: r.dept_level,
          organization_full_name: r.org_full_name,
        }),
      })),
    );
  }

  // ---- helpers ----

  private async fetchTimesheet(id: number) {
    const [row] = await this.db
      .select()
      .from(time_sheets)
      .where(and(eq(time_sheets.id, id), notDeleted(time_sheets)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    return row;
  }
}
