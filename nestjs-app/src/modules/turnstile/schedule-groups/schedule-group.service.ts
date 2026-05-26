// Schedule group service. Laravel: TurnstileScheduleGroupController.

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import { BusinessException } from '@/common/exceptions/business.exception';
import { I18nService } from 'nestjs-i18n';
import {
  turnstile_schedule_groups,
  turnstile_schedule_types,
  worker_positions,
  workers,
} from '@/db/schema';
import { pageOf, scheduleTypeName } from '@/modules/turnstile/_shared/helpers';
import type {
  QueryScheduleGroupDto,
  QueryScheduleGroupWorkersDto,
  UpdateScheduleGroupDto,
} from '@/modules/turnstile/schedule-groups/dto/schedule-group.dto';

@Injectable()
export class ScheduleGroupService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly scope: OrgScopeService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
    private readonly i18n: I18nService,
  ) {}

  // Laravel: TurnstileScheduleGroupService::index — orderByDesc(id), with schedule_type.
  // Filterlar: schedule_type (id), search, organizations.
  // ScheduleGroupResource:
  //   { id, name (' (start_date**end_date)'),
  //     workers_count, start_date, end_date,
  //     schedule_type: {id, name (locale), type: {id, name}},
  //     created_at (d-m-Y H:i:s) }
  async list(q: QueryScheduleGroupDto) {
    const { page, perPage, offset } = pageOf(q);
    const lang = (this.ctx.lang ?? 'uz').toLowerCase();

    // Org-scope filter.
    const scopeIds = await this.scope.ids();
    if (scopeIds.length === 0) {
      return { current_page: page, total: 0, data: [] };
    }

    const conds: any[] = [
      notDeleted(turnstile_schedule_groups),
      inArray(turnstile_schedule_groups.organization_id, scopeIds),
    ];
    // schedule_type filter.
    if (q.schedule_type) {
      conds.push(
        eq(
          turnstile_schedule_groups.turnstile_schedule_type_id,
          Number(q.schedule_type),
        ),
      );
    }
    // organizations CSV filter (intersect with scope).
    if (q.organizations) {
      const orgIds = q.organizations
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0);
      if (orgIds.length) {
        conds.push(inArray(turnstile_schedule_groups.organization_id, orgIds));
      }
    }
    // search: by group.name ILIKE
    if (q.search?.trim()) {
      conds.push(sql`${turnstile_schedule_groups.name} ILIKE ${`%${q.search.trim()}%`}`);
    }
    const where = and(...conds);

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: turnstile_schedule_groups.id,
          name: turnstile_schedule_groups.name,
          workers_count: turnstile_schedule_groups.workers_count,
          start_date: turnstile_schedule_groups.start_date,
          end_date: turnstile_schedule_groups.end_date,
          turnstile_schedule_type_id:
            turnstile_schedule_groups.turnstile_schedule_type_id,
          created_at: turnstile_schedule_groups.created_at,
        })
        .from(turnstile_schedule_groups)
        .where(where)
        .orderBy(desc(turnstile_schedule_groups.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(turnstile_schedule_groups)
        .where(where),
    ]);

    if (!rows.length) {
      return { current_page: page, total: Number(total), data: [] };
    }

    // Batch eager-load schedule_types.
    const stIds = [
      ...new Set(
        rows
          .map((r) => Number(r.turnstile_schedule_type_id))
          .filter(Boolean),
      ),
    ];
    const stRows = stIds.length
      ? await this.db
          .select({
            id: turnstile_schedule_types.id,
            name: turnstile_schedule_types.name,
            name_ru: turnstile_schedule_types.name_ru,
            name_en: turnstile_schedule_types.name_en,
            type: turnstile_schedule_types.type,
          })
          .from(turnstile_schedule_types)
          .where(inArray(turnstile_schedule_types.id, stIds))
      : [];
    const stMap = new Map(stRows.map((s) => [Number(s.id), s] as const));

    const localizedSt = (s: (typeof stRows)[number]): string => {
      if (lang === 'ru') return s.name_ru ?? s.name;
      if (lang === 'en') return s.name_en ?? s.name;
      return s.name;
    };

    return {
      current_page: page,
      total: Number(total),
      data: rows.map((r) => {
        const st = r.turnstile_schedule_type_id
          ? stMap.get(Number(r.turnstile_schedule_type_id))
          : null;
        return {
          id: Number(r.id),
          // Laravel quirk: name = ' (start_date**end_date)'.
          name: ` (${r.start_date ?? ''}**${r.end_date ?? ''})`,
          workers_count: r.workers_count ?? 0,
          start_date: r.start_date,
          end_date: r.end_date,
          schedule_type: st
            ? {
                id: Number(st.id),
                name: localizedSt(st),
                type: { id: st.type, name: scheduleTypeName(st.type) },
              }
            : null,
          created_at: formatLaravelTs(r.created_at),
        };
      }),
    };
  }

  // Laravel: TurnstileScheduleGroupService::destroy.
  //   1) worker_positions WHERE turnstile_schedule_group_id = $id →
  //      set turnstile_schedule_group_id=NULL, turnstile_schedule_type_id=NULL
  //   2) turnstile_worker_schedules WHERE turnstile_schedule_group_id = $id → force-delete
  //   3) turnstile_schedule_groups → soft-delete (?->delete())
  async remove(groupId: number) {
    await this.db.transaction(async (tx) => {
      // 1) Detach worker_positions from this group/type.
      await tx
        .update(worker_positions)
        .set({
          turnstile_schedule_group_id: null,
          turnstile_schedule_type_id: null,
          updated_at: sql`NOW()`,
        } as any)
        .where(eq(worker_positions.turnstile_schedule_group_id, groupId));

      // 2) Force-delete all schedule rows for this group (raw SQL — partition table).
      await tx.execute(sql`
        DELETE FROM turnstile_worker_schedules
        WHERE turnstile_schedule_group_id = ${groupId}
      `);

      // 3) Soft-delete the group itself.
      await tx
        .update(turnstile_schedule_groups)
        .set({ deleted_at: sql`NOW()` })
        .where(eq(turnstile_schedule_groups.id, groupId));
    });
  }

  // Laravel: TurnstileScheduleGroupService::update.
  //
  // Payload (TurnstileScheduleGroupUpdateRequest):
  //   { name?: string, end_date?: 'Y-m-d' }
  //
  // Logika (`end_date` berilgan bo'lsa):
  //   1) Group topiladi (yo'q bo'lsa 404).
  //   2) Agar `data.end_date > group.end_date` → 400 end_date_must_be_greater
  //      (faqat KISKARTIRISH ruxsat, kengaytirish emas).
  //   3) Agar yangi `end_date`'dan keyin allaqachon ish vaqti qayd qilingan
  //      (`fact_daily_minutes NOT NULL`) schedule rows bo'lsa → 400 group_has_workers.
  //   4) `date >= new_end_date` bo'lgan schedule rows force-delete.
  //   5) group.end_date = new_end_date.
  //
  // `name` faqat berilgan bo'lsa update qilinadi (alohida path — end_date logic'iga
  // tegmaydi).
  async update(groupId: number, dto: UpdateScheduleGroupDto) {
    // ---- end_date branch (Laravel'ning to'liq logikasi) ----
    if (dto.end_date) {
      // Validate format Y-m-d.
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dto.end_date)) {
        throw new BusinessException(
          422,
          'end_date must be in Y-m-d format',
        );
      }
      const newEndDate = dto.end_date;

      await this.db.transaction(async (tx) => {
        // 1) Find group.
        const [group] = await tx
          .select({
            id: turnstile_schedule_groups.id,
            end_date: turnstile_schedule_groups.end_date,
          })
          .from(turnstile_schedule_groups)
          .where(eq(turnstile_schedule_groups.id, groupId))
          .limit(1);
        if (!group) {
          throw new BusinessException(
            404,
            this.i18n.t('messages.not_found'),
          );
        }

        // 2) New end_date must NOT exceed current end_date.
        const currentEnd = String(group.end_date ?? '');
        if (currentEnd && newEndDate > currentEnd) {
          throw new BusinessException(
            400,
            this.i18n.t('messages.turnstile.end_date_must_be_greater'),
          );
        }

        // 3) Check for already-logged work after new end_date.
        const checkRes = await tx.execute(sql`
          SELECT COUNT(*)::int AS c
          FROM turnstile_worker_schedules
          WHERE turnstile_schedule_group_id = ${groupId}
            AND date >= ${newEndDate}::date
            AND fact_daily_minutes IS NOT NULL
        `);
        const [{ c }] = (((checkRes as any).rows ?? checkRes) as Array<{
          c: number;
        }>);
        if (Number(c) > 0) {
          throw new BusinessException(
            400,
            this.i18n.t('messages.turnstile.group_has_workers'),
          );
        }

        // 4) Force-delete schedule rows from new end_date onward (partition table → raw SQL).
        await tx.execute(sql`
          DELETE FROM turnstile_worker_schedules
          WHERE turnstile_schedule_group_id = ${groupId}
            AND date >= ${newEndDate}::date
        `);

        // 5) Update group end_date.
        const setPatch: Record<string, unknown> = {
          end_date: newEndDate,
          updated_at: sql`NOW()`,
        };
        if (dto.name !== undefined) setPatch.name = dto.name;
        await tx
          .update(turnstile_schedule_groups)
          .set(setPatch as any)
          .where(eq(turnstile_schedule_groups.id, groupId));
      });
      return;
    }

    // ---- name/order branch (no end_date) ----
    const data: Record<string, unknown> = { updated_at: sql`NOW()` };
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.order !== undefined) data.order = dto.order;
    if (Object.keys(data).length === 1) return; // only updated_at — no-op
    await this.db
      .update(turnstile_schedule_groups)
      .set(data)
      .where(eq(turnstile_schedule_groups.id, groupId));
  }

  // Laravel: TurnstileScheduleGroupService::groupWorkers.
  //
  // Params: group, year (default current), month (default current).
  // Pagination per_page default 30 (Laravel `paginate(30)`).
  //
  // Workers query JOINs: workers, worker_positions, organizations, departments,
  // positions. Filter: wp.status=ACTIVE, s.turnstile_schedule_group_id=group,
  // s.date BETWEEN month start..end, GROUP BY worker uniqueness fields.
  //
  // Response (GroupScheduleShowResource):
  //   { worker_id, last_name, first_name, middle_name, photo (file_url),
  //     worker_position_id, position_name, department_name, organization_name,
  //     days: [{ id, worker_id, date, work_status, start_time, end_time,
  //              daily_minutes, fact_daily_minutes }, ... full month days ] }
  async groupWorkers(q: QueryScheduleGroupWorkersDto) {
    const groupId = q.group ?? q.group_id;
    if (!groupId) {
      return { current_page: Number(q.page ?? 1), total: 0, data: [] };
    }
    // pageOf defaults per_page=10, but Laravel defaults 30 here.
    const page = Number(q.page ?? 1);
    const perPage = Number(q.per_page ?? 30);
    const offset = (page - 1) * perPage;

    const now = new Date();
    const year = Number(q.year ?? now.getFullYear());
    const month = Number(q.month ?? now.getMonth() + 1);
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 0));
    const startStr = monthStart.toISOString().slice(0, 10);
    const endStr = monthEnd.toISOString().slice(0, 10);
    const daysInMonth = monthEnd.getUTCDate();
    const allDates: string[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      allDates.push(
        new Date(Date.UTC(year, month - 1, d)).toISOString().slice(0, 10),
      );
    }

    // 1) Workers list — IKKI MANBADAN:
    //   A) worker_positions.turnstile_schedule_group_id = group (active) — bu group'ga
    //      biriktirilgan workerlar, schedule generate qilinmagan ham bo'lishi mumkin.
    //   B) turnstile_worker_schedules.turnstile_schedule_group_id = group — schedule
    //      generatsiyasi vaqtida group'ga kiritilgan workerlar (eski).
    // UNION qilib, page'lash bo'yicha qaytaramiz.
    const listRes = await this.db.execute(sql`
      WITH combined AS (
        SELECT DISTINCT wp.worker_id, wp.id AS worker_position_id
        FROM worker_positions wp
        WHERE wp.turnstile_schedule_group_id = ${groupId}
          AND wp.status = 2
          AND wp.deleted_at IS NULL
        UNION
        SELECT DISTINCT s.worker_id, s.worker_position_id
        FROM turnstile_worker_schedules s
        LEFT JOIN worker_positions wp2 ON wp2.id = s.worker_position_id
        WHERE s.turnstile_schedule_group_id = ${groupId}
          AND wp2.status = 2
          AND s.date BETWEEN ${startStr}::date AND ${endStr}::date
      )
      SELECT
        c.worker_id,
        w.first_name, w.last_name, w.middle_name, w.photo,
        c.worker_position_id,
        p.name AS position_name,
        d.name AS department_name,
        o.name AS organization_name
      FROM combined c
      JOIN workers w ON w.id = c.worker_id
      LEFT JOIN worker_positions wp ON wp.id = c.worker_position_id
      LEFT JOIN organizations o ON o.id = wp.organization_id
      LEFT JOIN departments d ON d.id = wp.department_id
      LEFT JOIN positions p ON p.id = wp.position_id
      ORDER BY c.worker_id
      LIMIT ${perPage} OFFSET ${offset}
    `);
    const totalRes = await this.db.execute(sql`
      SELECT COUNT(*)::int AS total FROM (
        SELECT DISTINCT wp.worker_id, wp.id AS worker_position_id
        FROM worker_positions wp
        WHERE wp.turnstile_schedule_group_id = ${groupId}
          AND wp.status = 2
          AND wp.deleted_at IS NULL
        UNION
        SELECT DISTINCT s.worker_id, s.worker_position_id
        FROM turnstile_worker_schedules s
        LEFT JOIN worker_positions wp2 ON wp2.id = s.worker_position_id
        WHERE s.turnstile_schedule_group_id = ${groupId}
          AND wp2.status = 2
          AND s.date BETWEEN ${startStr}::date AND ${endStr}::date
      ) t
    `);
    const workersRows = ((listRes as any).rows ?? listRes) as Array<{
      worker_id: number | string;
      first_name: string | null;
      last_name: string | null;
      middle_name: string | null;
      photo: string | null;
      worker_position_id: number | string | null;
      position_name: string | null;
      department_name: string | null;
      organization_name: string | null;
    }>;
    const total = Number(
      (((totalRes as any).rows ?? totalRes)[0] as any)?.total ?? 0,
    );
    if (workersRows.length === 0) {
      return { current_page: page, total, data: [] };
    }

    const workerIdList = [...new Set(workersRows.map((r) => Number(r.worker_id)))];

    // 2) Schedule days for these workers within the month.
    const daysRes = await this.db.execute(sql`
      SELECT id, worker_id, date::text AS date, work_status,
             to_char(start_time, 'HH24:MI') AS start_time,
             to_char(end_time, 'HH24:MI') AS end_time,
             daily_minutes, fact_daily_minutes
      FROM turnstile_worker_schedules
      WHERE worker_id IN (${sql.join(workerIdList.map((n) => sql`${n}`), sql`, `)})
        AND date BETWEEN ${startStr}::date AND ${endStr}::date
        AND turnstile_schedule_group_id = ${groupId}
      ORDER BY worker_id, date
    `);
    const daysByWorker = new Map<number, Map<string, any>>();
    for (const d of ((daysRes as any).rows ?? daysRes) as Array<any>) {
      const wid = Number(d.worker_id);
      let byDate = daysByWorker.get(wid);
      if (!byDate) {
        byDate = new Map();
        daysByWorker.set(wid, byDate);
      }
      byDate.set(d.date.slice(0, 10), d);
    }

    // 3) Photo URLs (batch).
    const photoUrls = await Promise.all(
      workersRows.map((w) => this.minio.fileUrl(w.photo)),
    );

    return {
      current_page: page,
      total,
      data: workersRows.map((w, idx) => {
        const wid = Number(w.worker_id);
        const byDate = daysByWorker.get(wid) ?? new Map();
        const days = allDates.map((d) => {
          const ex = byDate.get(d);
          return ex
            ? {
                id: Number(ex.id),
                worker_id: Number(ex.worker_id),
                date: d,
                work_status: ex.work_status,
                start_time: ex.start_time,
                end_time: ex.end_time,
                daily_minutes: ex.daily_minutes,
                fact_daily_minutes: ex.fact_daily_minutes,
              }
            : {
                id: null,
                worker_id: null,
                date: d,
                work_status: false,
                start_time: null,
                end_time: null,
                daily_minutes: 0,
                fact_daily_minutes: 0,
              };
        });
        return {
          worker_id: wid,
          last_name: w.last_name,
          first_name: w.first_name,
          middle_name: w.middle_name,
          photo: photoUrls[idx],
          worker_position_id: w.worker_position_id
            ? Number(w.worker_position_id)
            : null,
          position_name: w.position_name,
          department_name: w.department_name,
          organization_name: w.organization_name,
          days,
        };
      }),
    };
  }
}

// Laravel `Carbon::format('d-m-Y H:i:s')` parity for created_at.
function formatLaravelTs(v: unknown): string | null {
  if (v == null) return null;
  const s =
    v instanceof Date
      ? v.toISOString().replace('T', ' ').slice(0, 19)
      : String(v).replace('T', ' ').slice(0, 19);
  // 2026-05-26 12:34:56 → 26-05-2026 12:34:56
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2}) (.+)$/);
  if (!m) return s;
  return `${m[3]}-${m[2]}-${m[1]} ${m[4]}`;
}
