// Integration workers service. Laravel: IntegrationController.workers, WorkerController.workers,
// IntegrationController.workerByPin, showWorker, showWorkerTurnstileEventsByMonth/ByDay.

import { Injectable } from '@nestjs/common';
import {
  aliasedTable,
  and,
  asc,
  count,
  eq,
  inArray,
  sql,
  type AnyColumn,
  type SQL,
} from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import { getFullPosition } from '@/modules/hr/_shared/position-helper';
import {
  cities,
  countries,
  department_positions,
  departments,
  organizations,
  positions,
  regions,
  worker_phones,
  worker_positions,
  workers,
} from '@/db/schema';
import type {
  IntegrationWorkersQueryDto,
  WorkerByPinQueryDto,
  WorkersByPinsDto,
} from '@/modules/integration/workers/dto/worker.dto';

interface DayEvent {
  event_date_and_time: string;
  direction: boolean;
}

const POSITION_STATUS_ACTIVE = 2;
// Laravel order param → worker_<col> (withAggregate). Ruxsat etilgan ustunlar.
const WORKER_ORDER_COLUMNS: Record<string, AnyColumn> = {
  last_name: workers.last_name,
  first_name: workers.first_name,
  middle_name: workers.middle_name,
  birthday: workers.birthday,
  pin: workers.pin,
};

@Injectable()
export class IntegrationWorkerService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly scope: OrgScopeService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
  ) {}

  /**
   * GET /integration/workers — Laravel IntegrationService::workers.
   * WorkerPosition query: filtrlar + (ids → whereIn, else status=ACTIVE + scope) +
   * pin/search (whereHas worker) + order. Resource: {id, department{id,name}, position{id,name}}.
   */
  async list(q: IntegrationWorkersQueryDto) {
    const page = Math.max(1, Number(q.page) || 1);
    const perPage = Math.max(1, Number(q.per_page) || 10);
    const offset = (page - 1) * perPage;
    const lang = this.ctx.lang;

    const csv = (s: string) =>
      s
        .split(',')
        .map((x) => Number(x.trim()))
        .filter((n) => Number.isInteger(n));

    const idsList = q.ids ? csv(q.ids) : null;
    // ids berilsa scope YO'Q; aks holda status=ACTIVE + org scope (filter).
    const scopeOrIds =
      idsList && idsList.length
        ? inArray(worker_positions.id, idsList)
        : and(
            eq(worker_positions.status, POSITION_STATUS_ACTIVE),
            await this.scope.whereOrg(worker_positions.organization_id, {
              organizations: q.organizations,
              organization_id: q.organization_id,
            }),
          );

    const where = and(
      notDeleted(worker_positions),
      q.organization_id != null
        ? eq(worker_positions.organization_id, q.organization_id)
        : undefined,
      q.department_id != null
        ? eq(worker_positions.department_id, q.department_id)
        : undefined,
      q.department_position_id != null
        ? eq(worker_positions.department_position_id, q.department_position_id)
        : undefined,
      q.departments
        ? inArray(worker_positions.department_id, csv(q.departments))
        : undefined,
      q.positions
        ? inArray(worker_positions.position_id, csv(q.positions))
        : undefined,
      scopeOrIds,
      q.pin
        ? this.workerExists(sql`${workers.pin}::text = ${q.pin}`)
        : undefined,
      q.search ? this.workerExists(this.searchByFullName(q.search)) : undefined,
    );

    // Order: `order` → worker_<col> <direction>; else organization_id, department_id, dpid, id.
    const orderBy: SQL[] = [];
    if (q.order) {
      const dir = q.direction === 'asc' ? 'asc' : 'desc';
      for (const col of q.order.split(',').map((c) => c.trim())) {
        const wcol = WORKER_ORDER_COLUMNS[col];
        if (wcol) orderBy.push(dir === 'asc' ? asc(wcol) : sql`${wcol} DESC`);
      }
    }
    if (orderBy.length === 0) {
      orderBy.push(
        asc(worker_positions.organization_id),
        asc(worker_positions.department_id),
        asc(worker_positions.department_position_id),
        asc(worker_positions.id),
      );
    }

    // wp.position (post_name uchun) va department_position.position — alohida aliaslar.
    const wpPos = aliasedTable(positions, 'wp_pos');
    const dpPos = aliasedTable(positions, 'dp_pos');

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: worker_positions.id,
          position_date: worker_positions.position_date,
          status: worker_positions.status,
          org_id: organizations.id,
          org_name: organizations.name,
          org_name_ru: organizations.name_ru,
          org_name_en: organizations.name_en,
          org_group: organizations.group,
          org_full_name: organizations.full_name,
          dept_id: departments.id,
          dept_name: departments.name,
          dept_level: departments.level,
          dp_id: department_positions.id,
          dp_pos_id: dpPos.id,
          dp_pos_name: dpPos.name,
          dp_pos_name_ru: dpPos.name_ru,
          dp_pos_name_en: dpPos.name_en,
          wp_pos_name: wpPos.name,
          w_id: workers.id,
          w_uuid: workers.uuid,
          w_last: workers.last_name,
          w_first: workers.first_name,
          w_middle: workers.middle_name,
          w_card: workers.card,
          w_photo: workers.photo,
          w_pin: workers.pin,
          w_birthday: workers.birthday,
          w_sex: workers.sex,
          c_id: countries.id,
          c_name: countries.name,
          r_id: regions.id,
          r_name: regions.name,
          city_id: cities.id,
          city_name: cities.name,
        })
        .from(worker_positions)
        .leftJoin(
          organizations,
          eq(organizations.id, worker_positions.organization_id),
        )
        .leftJoin(
          departments,
          eq(departments.id, worker_positions.department_id),
        )
        .leftJoin(
          department_positions,
          eq(department_positions.id, worker_positions.department_position_id),
        )
        .leftJoin(dpPos, eq(dpPos.id, department_positions.position_id))
        .leftJoin(wpPos, eq(wpPos.id, worker_positions.position_id))
        .leftJoin(
          workers,
          and(eq(workers.id, worker_positions.worker_id), notDeleted(workers)),
        )
        .leftJoin(countries, eq(countries.id, workers.country_id))
        .leftJoin(regions, eq(regions.id, workers.region_id))
        .leftJoin(cities, eq(cities.id, workers.city_id))
        .where(where)
        .orderBy(...orderBy)
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(worker_positions).where(where),
    ]);

    // worker.phones — batch.
    const workerIds = [
      ...new Set(rows.map((r) => r.w_id).filter((x): x is number => x != null)),
    ];
    const phoneRows = workerIds.length
      ? await this.db
          .select({
            worker_id: worker_phones.worker_id,
            phone: worker_phones.phone,
          })
          .from(worker_phones)
          .where(inArray(worker_phones.worker_id, workerIds))
      : [];
    const phonesByWorker = new Map<number, number[]>();
    for (const p of phoneRows) {
      const arr = phonesByWorker.get(p.worker_id) ?? [];
      if (p.phone != null) arr.push(p.phone);
      phonesByWorker.set(p.worker_id, arr);
    }

    const orgName = (n: string | null, ru: string | null, en: string | null) =>
      lang === 'ru' ? ru : lang === 'en' ? en : n;

    const data = await Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        organization: r.org_id
          ? {
              id: r.org_id,
              name: orgName(r.org_name, r.org_name_ru, r.org_name_en),
              group: r.org_group ?? false,
            }
          : null,
        department: r.dept_id
          ? { id: r.dept_id, name: r.dept_name, level: r.dept_level }
          : null,
        department_position: r.dp_id
          ? {
              id: r.dp_id,
              position: r.dp_pos_id
                ? {
                    id: r.dp_pos_id,
                    name: orgName(
                      r.dp_pos_name,
                      r.dp_pos_name_ru,
                      r.dp_pos_name_en,
                    ),
                  }
                : null,
            }
          : null,
        post_name: getFullPosition({
          position_name: r.wp_pos_name,
          department_name: r.dept_name,
          department_level: r.dept_level,
          organization_full_name: r.org_full_name,
        }),
        worker: r.w_id
          ? {
              id: r.w_id,
              uuid: r.w_uuid,
              last_name: r.w_last,
              first_name: r.w_first,
              middle_name: r.w_middle,
              card: `UTY-${r.w_card ?? ''}`,
              photo: await this.minio.fileUrl(r.w_photo),
              pin: r.w_pin,
              phones: phonesByWorker.get(r.w_id) ?? [],
              birthday: r.w_birthday,
              sex: r.w_sex,
              country: r.c_id ? { id: r.c_id, name: r.c_name } : null,
              region: r.r_id ? { id: r.r_id, name: r.r_name } : null,
              city: r.city_id ? { id: r.city_id, name: r.city_name } : null,
            }
          : null,
        position_date: r.position_date,
        status: r.status,
      })),
    );

    return { current_page: page, total: Number(total), data };
  }

  // whereHas('worker', cond) — EXISTS subquery (worker many-to-one).
  private workerExists(cond: SQL): SQL {
    return sql`EXISTS (SELECT 1 FROM ${workers} WHERE ${workers.id} = ${worker_positions.worker_id} AND ${notDeleted(workers)} AND ${cond})`;
  }

  // Laravel Worker::scopeSearchByFullName — escapeLike + termlar AND, har biri last/first/middle ILIKE.
  private searchByFullName(search: string): SQL {
    const esc = search
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');
    const groups = esc
      .trim()
      .split(' ')
      .filter(Boolean)
      .map(
        (t) =>
          sql`(${workers.last_name} ILIKE ${`%${t}%`} OR ${workers.first_name} ILIKE ${`%${t}%`} OR ${workers.middle_name} ILIKE ${`%${t}%`})`,
      );
    return groups.length ? sql.join(groups, sql` AND `) : sql`TRUE`;
  }

  /** POST /integration/workers/by-pins — pin'lar ro'yxati bo'yicha workerlar. */
  async byPins(dto: WorkersByPinsDto) {
    if (!dto.pins.length) return [];
    return this.db
      .select()
      .from(workers)
      .where(and(inArray(workers.pin, dto.pins), notDeleted(workers)));
  }

  /** GET /integration/worker-by-pin?pin=<n>. */
  async byPin(q: WorkerByPinQueryDto) {
    const [row] = await this.db
      .select()
      .from(workers)
      .where(and(eq(workers.pin, q.pin), notDeleted(workers)))
      .limit(1);
    return row ?? null;
  }

  /** GET /integration/worker/show/:workerUuid — Laravel findOrFail → 404. */
  async showByUuid(workerUuid: string) {
    const [row] = await this.db
      .select()
      .from(workers)
      .where(eq(workers.uuid, workerUuid))
      .limit(1);
    if (!row) throw new BusinessException(404, 'not_found');
    return row;
  }

  // Laravel: Worker::whereUuid($uuid)->value('id') yo'q bo'lsa not_found (404).
  private async resolveWorkerId(uuid: string): Promise<number> {
    const [w] = await this.db
      .select({ id: workers.id })
      .from(workers)
      .where(and(eq(workers.uuid, uuid), notDeleted(workers)))
      .limit(1);
    if (!w) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    return w.id;
  }

  /**
   * GET /integration/worker/turnstile-events-month/:workerUuid — Laravel
   * EventController::showWorkerDurations. Oydagi terminal_events'lar kun bo'yicha
   * guruhlanib, har kun uchun ishlangan daqiqalar (calcWorkDuration).
   */
  async turnstileEventsByMonth(
    workerUuid: string,
    year: number,
    month: number,
  ) {
    const workerId = await this.resolveWorkerId(workerUuid);
    const mm = String(month).padStart(2, '0');
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const start = `${year}-${mm}-01 00:00:00`;
    const end = `${year}-${mm}-${String(lastDay).padStart(2, '0')} 23:59:59.999999`;

    // terminal_events — partitsiyalangan parent (drizzle schema'da yo'q) → raw SQL.
    const res = await this.db.execute(sql`
      SELECT event_date_and_time::text AS event_date_and_time, direction
      FROM terminal_events
      WHERE worker_id = ${workerId}
        AND event_date_and_time BETWEEN ${start} AND ${end}
      ORDER BY event_date_and_time
    `);
    const events = rowsOf(res) as unknown as DayEvent[];

    // groupBy(Y-m-d) — saralangani uchun kunlar xronologik tartibda.
    const byDay = new Map<string, DayEvent[]>();
    for (const e of events) {
      const day = e.event_date_and_time.slice(0, 10);
      const arr = byDay.get(day);
      if (arr) arr.push(e);
      else byDay.set(day, [e]);
    }

    const result: {
      worker_id: number;
      event_date: string;
      daily_minutes: number;
    }[] = [];
    for (const [day, dayEvents] of byDay) {
      result.push({
        worker_id: workerId,
        event_date: day,
        daily_minutes: this.calcWorkDuration(dayEvents, day),
      });
    }
    return result;
  }

  // Laravel TurnStileHelper::calcWorkDuration — kunlik ishlangan daqiqalar.
  private calcWorkDuration(events: DayEvent[], cDate: string): number {
    const todayStr = new Date().toISOString().slice(0, 10); // now()->toDateString() (UTC)
    const isToday = cDate === todayStr;
    const ms = (s: string) => Date.parse(`${s.replace(' ', 'T')}Z`);
    const startOfDay = ms(`${cDate} 00:00:00`);
    const endOfDay = isToday ? Date.now() : ms(`${cDate} 23:59:59.999`);

    // Ketma-ket bir xil direction → oxirgisini saqlash (Laravel reduce).
    const sorted = [...events].sort(
      (a, b) => ms(a.event_date_and_time) - ms(b.event_date_and_time),
    );
    const deduped: DayEvent[] = [];
    for (const e of sorted) {
      if (
        deduped.length &&
        deduped[deduped.length - 1].direction === e.direction
      ) {
        deduped.pop();
      }
      deduped.push(e);
    }

    let totalMin = 0;
    let lastEventTime = startOfDay;
    let inFlag = false;
    for (const e of deduped) {
      if (!e.direction) {
        // Chiqish
        totalMin += Math.abs(ms(e.event_date_and_time) - lastEventTime) / 60000;
        inFlag = false;
      }
      if (e.direction) {
        // Kirish
        inFlag = true;
        lastEventTime = ms(e.event_date_and_time);
      }
    }
    if (inFlag) {
      totalMin += Math.abs(endOfDay - lastEventTime) / 60000;
    }
    return Math.round(totalMin);
  }

  /**
   * GET /integration/worker/turnstile-events-day/:workerUuid — Laravel
   * EventController::showWorkerEventsInDay. Kun bo'yicha terminal_events'lar.
   */
  async turnstileEventsByDay(workerUuid: string, date: string) {
    const workerId = await this.resolveWorkerId(workerUuid);
    const res = await this.db.execute(sql`
      SELECT id, event_date_and_time::text AS event_date_and_time,
             device_name AS device, direction, mask_status, temperature
      FROM terminal_events
      WHERE worker_id = ${workerId}
        AND DATE(event_date_and_time) = ${date}
      ORDER BY event_date_and_time
    `);
    return rowsOf(res).map((r) => ({
      id: Number(r.id),
      event_date_and_time: r.event_date_and_time as string,
      device: r.device as string | null,
      direction: r.direction as boolean,
      mask_status: r.mask_status as number,
      temperature: r.temperature as number,
    }));
  }
}

function rowsOf(result: unknown): Record<string, unknown>[] {
  const r = result as { rows?: unknown[] };
  return (Array.isArray(r.rows) ? r.rows : result) as Record<string, unknown>[];
}
