// Schedule type service. Laravel: TurnstileScheduleTypeController.

import { Injectable } from '@nestjs/common';
import { and, count, eq, inArray, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { OrgScopeService } from '@/common/database/org-scope.service';
import {
  turnstile_schedule_groups,
  turnstile_schedule_types,
  worker_positions,
} from '@/db/schema';
import {
  nextId,
  pageOf,
  scheduleTypeName,
} from '@/modules/turnstile/_shared/helpers';
import type {
  CreateScheduleTypeDto,
  QueryScheduleTypeDto,
  UpdateScheduleTypeDto,
} from '@/modules/turnstile/schedule-types/dto/schedule-type.dto';

@Injectable()
export class ScheduleTypeService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly scope: OrgScopeService,
  ) {}

  // Laravel: index — flat array (no pagination), no Resource (raw map).
  async list() {
    const lang = (this.ctx.lang ?? 'uz').toLowerCase();
    const rows = await this.db
      .select()
      .from(turnstile_schedule_types)
      .where(notDeleted(turnstile_schedule_types))
      .orderBy(turnstile_schedule_types.type);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      type: { id: r.type, name: scheduleTypeName(r.type, lang) },
      days: r.days,
    }));
  }

  // Laravel: indexByWorkers — paginated with workers_count_sum and groups_count.
  // Laravel filter: `groups`'ga $q->filter($user, request()->all())
  // → turnstile_schedule_groups.organization_id ni user org-scope ichida cheklaydi.
  //
  // ScheduleTypeResource: {id, name (locale), type: {id, name}, groups, workers, days}.
  async listByWorkers(q: QueryScheduleTypeDto) {
    const { page, perPage, offset } = pageOf(q);
    const lang = (this.ctx.lang ?? 'uz').toLowerCase();
    const where = notDeleted(turnstile_schedule_types);

    // Org-scope condition (Laravel: $q->filter($user, request()->all())).
    // Admin: all orgs; Leader: subtree; default: own org. Qo'shimcha
    // `organizations` CSV va `organization_id` query parametrlari ham AND qilinadi.
    const orgScopeCond = await this.scope.whereOrg(
      turnstile_schedule_groups.organization_id,
      {
        organizations: q.organizations,
        organization_id: q.organization_id,
      },
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(turnstile_schedule_types)
        .where(where)
        .orderBy(turnstile_schedule_types.type)
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(turnstile_schedule_types)
        .where(where),
    ]);

    // Parse departments CSV filter (extension — Laravel'da yo'q).
    const depIds = q.departments
      ? q.departments
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isInteger(n) && n > 0)
      : [];

    // year+month → active-in-month filter (extension — Laravel'da yo'q):
    //   group active in month if start_date <= monthEnd AND end_date >= monthStart.
    let monthStart: string | null = null;
    let monthEnd: string | null = null;
    if (q.year && q.month && q.month >= 1 && q.month <= 12) {
      const y = Number(q.year);
      const m = Number(q.month);
      monthStart = `${y}-${String(m).padStart(2, '0')}-01`;
      const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
      monthEnd = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }

    // Per-type: groups count + workers count, org-scope (+optional dep) filtered.
    const cMap = new Map<number, { groups: number; workers: number | null }>();
    if (rows.length && orgScopeCond) {
      const typeIds = rows.map((r) => r.id);

      // groups-table active-in-month condition (start_date overlaps month).
      const groupActiveCond =
        monthStart && monthEnd
          ? sql`(${turnstile_schedule_groups.start_date} IS NULL OR ${turnstile_schedule_groups.start_date} <= ${monthEnd}::date)
             AND (${turnstile_schedule_groups.end_date}   IS NULL OR ${turnstile_schedule_groups.end_date}   >= ${monthStart}::date)`
          : undefined;

      if (depIds.length > 0) {
        // ----- departments filter: aggregate FROM worker_positions -----
        const wpOrgScope = await this.scope.whereOrg(
          worker_positions.organization_id,
          {
            organizations: q.organizations,
            organization_id: q.organization_id,
          },
        );
        // For dep+year/month — restrict via EXISTS schedule_group active-in-month.
        const wpActiveCond =
          monthStart && monthEnd
            ? sql`EXISTS (
                SELECT 1 FROM turnstile_schedule_groups sg
                WHERE sg.id = ${worker_positions.turnstile_schedule_group_id}
                  AND sg.deleted_at IS NULL
                  AND (sg.start_date IS NULL OR sg.start_date <= ${monthEnd}::date)
                  AND (sg.end_date   IS NULL OR sg.end_date   >= ${monthStart}::date)
              )`
            : undefined;
        const aggRes = await this.db
          .select({
            type_id: worker_positions.turnstile_schedule_type_id,
            groups: sql<number>`COUNT(DISTINCT ${worker_positions.turnstile_schedule_group_id})::int`,
            workers: sql<number>`COUNT(DISTINCT ${worker_positions.id})::int`,
          })
          .from(worker_positions)
          .where(
            and(
              notDeleted(worker_positions),
              inArray(worker_positions.turnstile_schedule_type_id, typeIds),
              inArray(worker_positions.department_id, depIds),
              wpOrgScope,
              wpActiveCond,
            ),
          )
          .groupBy(worker_positions.turnstile_schedule_type_id);
        for (const a of aggRes) {
          cMap.set(Number(a.type_id), {
            groups: Number(a.groups),
            workers: Number(a.workers),
          });
        }
      } else {
        // ----- default: aggregate FROM turnstile_schedule_groups (Laravel parity) -----
        const aggRes = await this.db
          .select({
            type_id: turnstile_schedule_groups.turnstile_schedule_type_id,
            groups: count(),
            // Laravel withSum — group yo'q/hammasi null bo'lsa null (0 emas).
            workers: sql<number | null>`SUM(${turnstile_schedule_groups.workers_count})::int`,
          })
          .from(turnstile_schedule_groups)
          .where(
            and(
              notDeleted(turnstile_schedule_groups),
              inArray(
                turnstile_schedule_groups.turnstile_schedule_type_id,
                typeIds,
              ),
              orgScopeCond,
              groupActiveCond,
            ),
          )
          .groupBy(turnstile_schedule_groups.turnstile_schedule_type_id);
        for (const a of aggRes) {
          cMap.set(Number(a.type_id), {
            groups: Number(a.groups),
            workers: a.workers == null ? null : Number(a.workers),
          });
        }
      }
    }

    const localeName = (r: (typeof rows)[number]): string => {
      if (lang === 'ru') return r.name_ru ?? r.name;
      if (lang === 'en') return r.name_en ?? r.name;
      return r.name;
    };

    return {
      current_page: page,
      total: Number(total),
      data: rows.map((r) => ({
        id: r.id,
        name: localeName(r),
        type: { id: r.type, name: scheduleTypeName(r.type, lang) },
        groups: cMap.get(r.id)?.groups ?? 0,
        workers: cMap.get(r.id)?.workers ?? null,
        days: r.days,
      })),
    };
  }

  async create(dto: CreateScheduleTypeDto) {
    const id = await nextId(this.db, turnstile_schedule_types);
    await this.db.insert(turnstile_schedule_types).values({
      id,
      name: dto.name,
      type: dto.type,
      days: dto.days,
    });
  }

  async update(id: number, dto: UpdateScheduleTypeDto) {
    await this.db
      .update(turnstile_schedule_types)
      .set({
        name: dto.name,
        type: dto.type,
        days: dto.days,
        updated_at: sql`NOW()`,
      })
      .where(eq(turnstile_schedule_types.id, id));
  }

  async remove(id: number) {
    await this.db
      .update(turnstile_schedule_types)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(turnstile_schedule_types.id, id));
  }
}
