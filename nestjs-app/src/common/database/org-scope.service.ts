// Per-request org-scope service. Laravel: QueryHelper::filterByOrganizations +
// childIds. Bir requestda har joyda inject qilinadi, IDlar CLS'ga cache.
//
// Yo'naltirilgan helper'lar:
//   - ids()                  → childIds (cached)
//   - whereOrg(col, f?)      → SQL WHERE: col IN (childIds) AND col IN (csv) AND col = id
//   - activeWorkerExists(...)→ EXISTS subquery: ishchining scope ichida faol lavozimi bor
//   - whereContractsByMonth  → (kelajakda kerak bo'lsa) contracts uchun ham
//
// Foydalanish:
//   constructor(private scope: OrgScopeService) {}
//   const cond = and(notDeleted(t), await this.scope.whereOrg(t.organization_id, filters));
//
// Filters (DTO'dan):
//   { organizations?: string;     // "1,2,3" — vergulli ID'lar
//     organization_id?: number;   // bitta ID }
//
// `childIds` bo'sh array bo'lsa (user role'i bo'yicha hech qaysi org'ga ruxsat
// yo'q) — qaytariladigan condition `FALSE`, ya'ni hech narsa qaytmaydi.

import { Inject, Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { and, eq, inArray, sql, type AnyColumn, type SQL } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { RequestContext } from '@/common/context/request.context';
import { CLS_KEYS } from '@/common/context/cls.types';
import { resolveOrgScopeIds } from '@/common/database/org-scope.helper';
import { PermissionService } from '@/shared/permission/permission.service';

export interface OrgScopeFilters {
  organizations?: string;
  organization_id?: number;
}

@Injectable()
export class OrgScopeService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    @Inject(RequestContext) private readonly ctx: RequestContext,
    @Inject(PermissionService) private readonly perms: PermissionService,
    @Inject(ClsService) private readonly cls: ClsService,
  ) {}

  /**
   * Request davomidagi childIds. Birinchi chaqiruvda hisoblanadi va CLS'ga
   * cache qilinadi, keyingilari shu cache'dan oladi.
   */
  async ids(): Promise<number[]> {
    const cached = this.cls.get<number[] | undefined>(CLS_KEYS.ORG_SCOPE_IDS);
    if (cached) return cached;
    const user = this.ctx.user_or_fail;
    const ids = await resolveOrgScopeIds(
      this.db,
      this.perms,
      user.id,
      user.organization_id,
    );
    this.cls.set(CLS_KEYS.ORG_SCOPE_IDS, ids);
    return ids;
  }

  /**
   * Laravel `QueryHelper::filterByOrganizations` ekvivalenti.
   * Drizzle column + ixtiyoriy `organizations` (csv) va `organization_id`
   * filtrlarini AND qilib bitta SQL condition qaytaradi.
   *
   * childIds bo'sh bo'lsa — `FALSE` qaytaradi (hech narsa).
   */
  async whereOrg(
    col: AnyColumn,
    filters?: OrgScopeFilters,
  ): Promise<SQL | undefined> {
    const ids = await this.ids();
    if (ids.length === 0) return sql`FALSE`;
    const parts: SQL[] = [inArray(col, ids)];

    const csv = filters?.organizations;
    if (csv) {
      const extra = csv
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0);
      if (extra.length > 0) parts.push(inArray(col, extra));
    }

    const single = filters?.organization_id;
    if (single != null) parts.push(eq(col, single));

    return parts.length === 1 ? parts[0] : and(...parts);
  }

  /**
   * Laravel `Worker::whereHas('positions', filter)` ekvivalenti — ishchining
   * scope ichida status=ACTIVE va deleted_at IS NULL lavozimi bor-yo'qligi.
   *
   * `workerCol` — workers.id ga teng deb solishtiriladigan ifoda (column yoki
   * sql fragment, masalan: `workers.id` yoki `sql\`wr.worker_id\``).
   */
  async activeWorkerExists(
    workerCol: AnyColumn | SQL,
    filters?: OrgScopeFilters,
  ): Promise<SQL> {
    const ids = await this.ids();
    if (ids.length === 0) return sql`FALSE`;
    const orgList = sqlIdList(ids);

    // Qo'shimcha organizations / organization_id filtrlari ham qo'llanadi
    // (Laravel `filter`'da qo'shilgani uchun).
    let extraOrgs: number[] | null = null;
    if (filters?.organizations) {
      extraOrgs = filters.organizations
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0);
    }
    const extraCond1 =
      extraOrgs && extraOrgs.length > 0
        ? sql` AND wp.organization_id IN (${sqlIdList(extraOrgs)})`
        : sql``;
    const extraCond2 =
      filters?.organization_id != null
        ? sql` AND wp.organization_id = ${filters.organization_id}`
        : sql``;

    return sql`EXISTS (
      SELECT 1 FROM worker_positions wp
      WHERE wp.worker_id = ${workerCol}
        AND wp.status = 2
        AND wp.deleted_at IS NULL
        AND wp.organization_id IN (${orgList})${extraCond1}${extraCond2}
    )`;
  }

  /**
   * Laravel `whereHas('workerPosition', filter)` ekvivalenti — bu spesifik
   * `worker_positions.id` faol va scope ichida.
   */
  async activePositionByIdExists(
    positionIdRef: AnyColumn | SQL,
    filters?: OrgScopeFilters,
  ): Promise<SQL> {
    const ids = await this.ids();
    if (ids.length === 0) return sql`FALSE`;
    let extraOrgs: number[] | null = null;
    if (filters?.organizations) {
      extraOrgs = filters.organizations
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0);
    }
    const extraCond1 =
      extraOrgs && extraOrgs.length > 0
        ? sql` AND wp.organization_id IN (${sqlIdList(extraOrgs)})`
        : sql``;
    const extraCond2 =
      filters?.organization_id != null
        ? sql` AND wp.organization_id = ${filters.organization_id}`
        : sql``;
    return sql`EXISTS (
      SELECT 1 FROM worker_positions wp
      WHERE wp.id = ${positionIdRef}
        AND wp.status = 2
        AND wp.deleted_at IS NULL
        AND wp.organization_id IN (${sqlIdList(ids)})${extraCond1}${extraCond2}
    )`;
  }
}

// number[] → SQL "1, 2, 3" fragmenti.
function sqlIdList(ids: number[]): ReturnType<typeof sql.join> {
  return sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  );
}
