// HR Dashboard Views — intizomiy/rag'bat choralari va shartnomalar.
// disciplinary-actions, incentive-actions, contracts.

import { Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  sql,
} from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  contracts,
  departments,
  organization_disciplinaries,
  organization_incentives,
  organizations,
  positions as positionsTable,
  worker_positions,
  workers,
} from '@/db/schema';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { resolveOrgScopeIds } from '@/common/database/org-scope.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import { PermissionService } from '@/shared/permission/permission.service';
import { DashboardViewsMapper } from '@/modules/hr/dashboard-views/dashboard-views.mapper';
import {
  CONFIRMATION_SUCCESS,
  DEFAULT_PER_PAGE,
  FINISHED_POSITION_STATUS,
} from '@/modules/hr/dashboard-views/dashboard-views.constants';
import {
  buildFullPosition,
  buildShortPosition,
  monthBounds,
} from '@/modules/hr/dashboard-views/dashboard-views.helper';
import {
  ContractsQueryDto,
  DashboardYearQueryDto,
} from '@/modules/hr/dashboard-views/dto/dashboard-views.dto';

@Injectable()
export class DashboardActivityService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly minio: MinioService,
    private readonly mapper: DashboardViewsMapper,
    private readonly ctx: RequestContext,
    private readonly permissions: PermissionService,
    private readonly scope: OrgScopeService,
  ) {}

  // GET /api/v1/hr/dashboard/disciplinary-actions
  async disciplinaryActions(filters: DashboardYearQueryDto) {
    const perPage = filters.per_page ?? DEFAULT_PER_PAGE;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;
    const year = filters.year ?? new Date().getFullYear();
    // Laravel OrganizationDisciplinary::filter — role + organizations + organization_id.
    const inScope = await this.scope.whereOrg(
      organization_disciplinaries.organization_id,
      {
        organizations: filters.organizations,
        organization_id: filters.organization_id,
      },
    );

    const where = and(
      notDeleted(organization_disciplinaries),
      inScope,
      filters.type != null
        ? eq(organization_disciplinaries.fine_type, filters.type)
        : undefined,
      sql`EXTRACT(YEAR FROM ${organization_disciplinaries.date})::int = ${year}`,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: organization_disciplinaries.id,
          organization_id: organization_disciplinaries.organization_id,
          worker_position_id: organization_disciplinaries.worker_position_id,
          number: organization_disciplinaries.number,
          reason: organization_disciplinaries.reason,
          fine: organization_disciplinaries.fine,
          fine_type: organization_disciplinaries.fine_type,
          date: organization_disciplinaries.date,
        })
        .from(organization_disciplinaries)
        .where(where)
        // Laravel `paginate()` ORDER BY qo'ymaydi — natural Postgres tartibi.
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(organization_disciplinaries)
        .where(where),
    ]);

    const orgIds = [
      ...new Set(
        rows
          .map((r) => r.organization_id)
          .filter((x): x is number => x != null),
      ),
    ];
    const wpIds = [
      ...new Set(
        rows
          .map((r) => r.worker_position_id)
          .filter((x): x is number => x != null),
      ),
    ];
    const [orgMap, wpMap] = await Promise.all([
      this.bundleOrganizations(orgIds),
      this.bundleWorkerPositionMinimal(wpIds),
    ]);

    const data = rows.map((r) => ({
      id: r.id,
      organization: r.organization_id
        ? (orgMap.get(r.organization_id) ?? null)
        : null,
      worker_position: r.worker_position_id
        ? (wpMap.get(r.worker_position_id) ?? null)
        : null,
      date: r.date,
      fine: r.fine,
      fine_type: r.fine_type,
      reason: r.reason,
      number: r.number,
    }));

    return { current_page: page, total: Number(total), data };
  }

  // GET /api/v1/hr/dashboard/incentive-actions
  async incentiveActions(filters: DashboardYearQueryDto) {
    const perPage = filters.per_page ?? DEFAULT_PER_PAGE;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;
    const year = filters.year ?? new Date().getFullYear();
    // Laravel OrganizationIncentive::filter — role + organizations + organization_id.
    const inScope = await this.scope.whereOrg(
      organization_incentives.organization_id,
      {
        organizations: filters.organizations,
        organization_id: filters.organization_id,
      },
    );

    const where = and(
      notDeleted(organization_incentives),
      inScope,
      filters.type != null
        ? eq(organization_incentives.gift_type, filters.type)
        : undefined,
      sql`EXTRACT(YEAR FROM ${organization_incentives.date})::int = ${year}`,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: organization_incentives.id,
          organization_id: organization_incentives.organization_id,
          worker_position_id: organization_incentives.worker_position_id,
          number: organization_incentives.number,
          reason: organization_incentives.reason,
          by_whom: organization_incentives.by_whom,
          gift: organization_incentives.gift,
          gift_type: organization_incentives.gift_type,
          date: organization_incentives.date,
        })
        .from(organization_incentives)
        .where(where)
        .orderBy(desc(organization_incentives.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(organization_incentives)
        .where(where),
    ]);

    const orgIds = [
      ...new Set(
        rows
          .map((r) => r.organization_id)
          .filter((x): x is number => x != null),
      ),
    ];
    const wpIds = [
      ...new Set(
        rows
          .map((r) => r.worker_position_id)
          .filter((x): x is number => x != null),
      ),
    ];
    const [orgMap, wpMap] = await Promise.all([
      this.bundleOrganizations(orgIds),
      this.bundleWorkerPositionMinimal(wpIds),
    ]);

    const data = rows.map((r) => ({
      id: r.id,
      organization: r.organization_id
        ? (orgMap.get(r.organization_id) ?? null)
        : null,
      worker_position: r.worker_position_id
        ? (wpMap.get(r.worker_position_id) ?? null)
        : null,
      date: r.date,
      by_whom: r.by_whom,
      gift: r.gift,
      gift_type: r.gift_type,
      reason: r.reason,
      number: r.number,
    }));

    return { current_page: page, total: Number(total), data };
  }

  // GET /api/v1/hr/dashboard/contracts (type=created|ended)
  // Laravel: boshqa qiymatda bo'sh `[]` qaytadi.
  async contracts(filters: ContractsQueryDto) {
    if (filters.type === 'created') {
      return this.newContracts(filters);
    }
    if (filters.type === 'ended') {
      return this.endedContracts(filters);
    }
    return [];
  }

  // ---- helpers ----

  private async newContracts(filters: ContractsQueryDto) {
    const perPage = filters.per_page ?? DEFAULT_PER_PAGE;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;
    const year = filters.year ?? new Date().getFullYear();
    const month = filters.month ?? new Date().getMonth() + 1;
    const { from, to } = monthBounds(year, month);

    const where = and(
      notDeleted(contracts),
      eq(contracts.confirmation, CONFIRMATION_SUCCESS),
      isNotNull(contracts.worker_id),
      gte(contracts.contract_date, from),
      lte(contracts.contract_date, to),
      sql`EXISTS (SELECT 1 FROM ${worker_positions} wp WHERE wp.contract_id = ${contracts.id} AND wp.contract_position = true)`,
      await this.orgScope(),
    );

    return this.paginateContracts(where, perPage, page, offset);
  }

  private async endedContracts(filters: ContractsQueryDto) {
    const perPage = filters.per_page ?? DEFAULT_PER_PAGE;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;
    const year = filters.year ?? new Date().getFullYear();
    const month = filters.month ?? new Date().getMonth() + 1;
    const { from, to } = monthBounds(year, month);

    const where = and(
      notDeleted(contracts),
      eq(contracts.confirmation, CONFIRMATION_SUCCESS),
      eq(contracts.status, FINISHED_POSITION_STATUS),
      isNotNull(contracts.worker_id),
      gte(contracts.contract_to_date, from),
      lte(contracts.contract_to_date, to),
      await this.orgScope(),
    );

    return this.paginateContracts(where, perPage, page, offset);
  }

  // Laravel Contract::filter($user) → QueryHelper::filterByOrganizations.
  private async orgScope() {
    const scopeOrgIds = await resolveOrgScopeIds(
      this.db,
      this.permissions,
      this.ctx.user_or_fail.id,
      this.ctx.user_or_fail.organization_id,
    );
    return scopeOrgIds.length
      ? inArray(contracts.organization_id, scopeOrgIds)
      : sql`false`;
  }

  // Laravel ContractViewResource:
  //   {id, worker (Minimal), organization, type (label), from, to, status}.
  private async paginateContracts(
    where: ReturnType<typeof and>,
    perPage: number,
    page: number,
    offset: number,
  ) {
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: contracts.id,
          worker_id: contracts.worker_id,
          organization_id: contracts.organization_id,
          type: contracts.type,
          status: contracts.status,
          contract_date: contracts.contract_date,
          contract_to_date: contracts.contract_to_date,
        })
        .from(contracts)
        .where(where)
        .orderBy(asc(contracts.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(contracts).where(where),
    ]);

    const workerIds = [
      ...new Set(
        rows.map((r) => r.worker_id).filter((id): id is number => id != null),
      ),
    ];
    const orgIds = [
      ...new Set(
        rows
          .map((r) => r.organization_id)
          .filter((id): id is number => id != null),
      ),
    ];
    const [wMap, orgMap] = await Promise.all([
      this.mapper.bundleWorkers(workerIds),
      this.bundleOrganizations(orgIds),
    ]);

    return {
      current_page: page,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => {
          const w = r.worker_id ? wMap.get(r.worker_id) : null;
          return {
            id: r.id,
            // Laravel WorkerMinimalResource — {id, photo, last/first/middle_name}.
            worker: w
              ? {
                  id: w.id,
                  photo: await this.minio.fileUrl(w.photo),
                  last_name: w.last_name,
                  first_name: w.first_name,
                  middle_name: w.middle_name,
                }
              : null,
            organization: r.organization_id
              ? (orgMap.get(r.organization_id) ?? null)
              : null,
            type: this.mapper.contractTypeLabel(r.type),
            from: r.contract_date,
            to: r.contract_to_date,
            status: {
              id: r.status,
              name: this.mapper.positionStatusLabel(r.status),
            },
          };
        }),
      ),
    };
  }

  // Laravel OrganizationListResource: {id, name (lang), group}.
  private async bundleOrganizations(orgIds: number[]) {
    const map = new Map<
      number,
      { id: number; name: string | null; group: boolean }
    >();
    if (orgIds.length === 0) return map;
    const rows = await this.db
      .select({
        id: organizations.id,
        name: organizations.name,
        name_ru: organizations.name_ru,
        name_en: organizations.name_en,
        group: organizations.group,
      })
      .from(organizations)
      .where(inArray(organizations.id, orgIds));
    for (const r of rows) {
      map.set(r.id, {
        id: r.id,
        name: this.mapper.pickLang(r.name, r.name_ru, r.name_en),
        group: r.group ?? false,
      });
    }
    return map;
  }

  // Laravel WorkerPositionMinimalResource:
  //   {id, worker, organization, post_name, post_short_name}.
  private async bundleWorkerPositionMinimal(wpIds: number[]) {
    const map = new Map<
      number,
      {
        id: number;
        worker: {
          id: number;
          photo: string | null;
          last_name: string | null;
          first_name: string | null;
          middle_name: string | null;
        } | null;
        organization: {
          id: number;
          name: string | null;
          group: boolean;
        } | null;
        post_name: string;
        post_short_name: string;
      }
    >();
    if (wpIds.length === 0) return map;

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
      .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
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
      .where(inArray(worker_positions.id, wpIds));

    for (const r of rows) {
      const postName = buildFullPosition(
        r.org_full_name,
        r.dept_name,
        r.dept_level,
        r.pos_name,
      );
      const postShortName = buildShortPosition(
        r.dept_name,
        r.dept_level,
        r.pos_name,
      );
      const workerPhotoUrl = await this.minio.fileUrl(r.worker_photo);
      map.set(r.id, {
        id: r.id,
        worker: r.worker_id
          ? {
              id: r.worker_id,
              photo: workerPhotoUrl,
              last_name: r.worker_last,
              first_name: r.worker_first,
              middle_name: r.worker_middle,
            }
          : null,
        organization: r.org_id
          ? {
              id: r.org_id,
              name: this.mapper.pickLang(
                r.org_name,
                r.org_name_ru,
                r.org_name_en,
              ),
              group: r.org_group ?? false,
            }
          : null,
        post_name: postName,
        post_short_name: postShortName,
      });
    }
    return map;
  }
}
