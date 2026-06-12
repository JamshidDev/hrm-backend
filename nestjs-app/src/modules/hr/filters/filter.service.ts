// Filter service — Laravel: HR/FilterController.
// 3 endpoint: get-department-positions, get-departments-tree, get-departments.

import { Injectable } from '@nestjs/common';
import { and, asc, count, eq, ilike, inArray, isNull, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  contracts,
  department_positions,
  departments,
  organizations,
  positions as positionsTable,
  worker_positions,
  workers,
} from '@/db/schema';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { RequestContext } from '@/common/context/request.context';
import { DEPARTMENT_LEVEL_KEYS } from '@/modules/hr/departments/department.mapper';
import {
  FilterDepartmentsByOrgsQueryDto,
  FilterDepartmentsTreeQueryDto,
  FilterPositionsQueryDto,
  FilterRootDepartmentsQueryDto,
  FilterSearchWorkersQueryDto,
} from '@/modules/hr/filters/dto/filter.dto';

const POSITION_STATUS_ACTIVE = 2;

export interface TreeNode {
  id: number;
  name: string;
  level: { id: number; name: string };
  children: TreeNode[];
}

@Injectable()
export class FilterService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly scope: OrgScopeService,
  ) {}

  // get-department-positions?department_id=
  async departmentPositions(departmentId: number) {
    const lang = this.ctx.lang;
    const rows = await this.db
      .select({
        id: department_positions.id,
        organization_id: department_positions.organization_id,
        pos_id: positionsTable.id,
        pos_name: positionsTable.name,
        pos_name_ru: positionsTable.name_ru,
        pos_name_en: positionsTable.name_en,
      })
      .from(department_positions)
      .leftJoin(
        positionsTable,
        eq(positionsTable.id, department_positions.position_id),
      )
      .where(
        and(
          eq(department_positions.department_id, departmentId),
          isNull(department_positions.deleted_at),
        ),
      )
      .orderBy(asc(department_positions.organization_id));

    return rows.map((r) => ({
      id: r.id,
      position: r.pos_id
        ? {
            id: r.pos_id,
            name:
              lang === 'ru'
                ? (r.pos_name_ru ?? r.pos_name)
                : lang === 'en'
                  ? (r.pos_name_en ?? r.pos_name)
                  : r.pos_name,
          }
        : null,
    }));
  }

  // get-departments-tree?organization_id=
  async departmentTree(filters: FilterDepartmentsTreeQueryDto) {
    const lang = this.ctx.lang;
    const flat = await this.db
      .select({
        id: departments.id,
        name: departments.name,
        level: departments.level,
        parent_id: departments.parent_id,
      })
      .from(departments)
      .where(
        and(
          isNull(departments.deleted_at),
          filters.organization_id
            ? eq(departments.organization_id, filters.organization_id)
            : undefined,
          filters.search
            ? ilike(departments.name, `%${filters.search}%`)
            : undefined,
        ),
      );

    const nodeMap = new Map<number, TreeNode>();
    for (const f of flat) {
      const key = DEPARTMENT_LEVEL_KEYS[f.level];
      const levelName = key ? this.i18n.t(key, { lang }) : '';
      nodeMap.set(f.id, {
        id: f.id,
        name: f.name,
        level: {
          id: f.level,
          name: typeof levelName === 'string' ? levelName : '',
        },
        children: [],
      });
    }
    const roots: TreeNode[] = [];
    for (const f of flat) {
      const node = nodeMap.get(f.id)!;
      if (f.parent_id == null) roots.push(node);
      else {
        const parent = nodeMap.get(f.parent_id);
        if (parent) parent.children.push(node);
        else roots.push(node);
      }
    }
    return roots;
  }

  // get-departments?per_page=&search=&organization_id=
  async departmentsByOrganizations(filters: FilterDepartmentsByOrgsQueryDto) {
    const perPage = filters.per_page ?? 100;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;
    // Laravel Department::filterByOrganizations — role + organizations + organization_id.
    const inScope = await this.scope.whereOrg(departments.organization_id, {
      organizations: filters.organizations,
      organization_id: filters.organization_id,
    });

    const where = and(
      isNull(departments.deleted_at),
      filters.search
        ? ilike(departments.name, `%${filters.search}%`)
        : undefined,
      inScope,
    );

    const offset = (page - 1) * perPage;

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: departments.id,
          name: departments.name,
          org_id: organizations.id,
          org_name: organizations.name,
          org_name_ru: organizations.name_ru,
          org_name_en: organizations.name_en,
          org_group: organizations.group,
        })
        .from(departments)
        .leftJoin(
          organizations,
          and(
            eq(organizations.id, departments.organization_id),
            isNull(organizations.deleted_at),
          ),
        )
        .where(where)
        // Laravel `paginate()` ORDER BY qo'ymaydi — natural Postgres tartibi.
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(departments).where(where),
    ]);

    return {
      current_page: page,
      total: Number(total),
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        organization: r.org_id
          ? {
              id: r.org_id,
              // Laravel OrganizationListResource: ru→name_ru, en→name_en,
              // default→name (fallback YO'Q — name_ru/name_en null bo'lsa null).
              name:
                lang === 'ru'
                  ? r.org_name_ru
                  : lang === 'en'
                    ? r.org_name_en
                    : r.org_name,
              group: r.org_group ?? false,
            }
          : null,
      })),
    };
  }

  // get-department — rootDepartments (parent_id IS NULL) — Laravel `whereIsRoot()`.
  // Permission scope (filterByOrganization) hozircha implement qilinmagan.
  async rootDepartments(filters: FilterRootDepartmentsQueryDto) {
    const perPage = filters.per_page ?? 100;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;

    // Laravel: ->filterByOrganization($user) — childIds (role/org-scope).
    const inScope = await this.scope.whereOrg(departments.organization_id, {
      organizations: (filters as { organizations?: string }).organizations,
    });

    const where = and(
      isNull(departments.deleted_at),
      isNull(departments.parent_id),
      inScope,
      filters.search
        ? ilike(departments.name, `%${filters.search}%`)
        : undefined,
    );

    const offset = (page - 1) * perPage;

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: departments.id,
          name: departments.name,
          level: departments.level,
          name_ru: departments.name_ru,
          name_en: departments.name_en,
          comment: departments.comment,
          org_id: organizations.id,
          org_name: organizations.name,
          org_name_ru: organizations.name_ru,
          org_name_en: organizations.name_en,
          org_group: organizations.group,
        })
        .from(departments)
        .leftJoin(
          organizations,
          and(
            eq(organizations.id, departments.organization_id),
            isNull(organizations.deleted_at),
          ),
        )
        // Laravel: whereIsRoot()->filterByOrganization()->paginate() — orderBy YO'Q.
        .where(where)
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(departments).where(where),
    ]);

    return {
      current_page: page,
      total: Number(total),
      // Laravel Department\DepartmentResource: id, name, level:{id,name},
      // name_ru, name_en, comment, organization.
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        level: {
          id: r.level,
          name:
            r.level != null
              ? this.i18n.t(DEPARTMENT_LEVEL_KEYS[r.level] ?? '', { lang })
              : '',
        },
        name_ru: r.name_ru,
        name_en: r.name_en,
        comment: r.comment,
        organization: r.org_id
          ? {
              id: r.org_id,
              // Laravel OrganizationListResource: ru→name_ru, en→name_en,
              // default→name (fallback YO'Q — name_ru/name_en null bo'lsa null).
              name:
                lang === 'ru'
                  ? r.org_name_ru
                  : lang === 'en'
                    ? r.org_name_en
                    : r.org_name,
              group: r.org_group ?? false,
            }
          : null,
      })),
    };
  }

  // get-positions — distinct active positions for given org/department filters.
  async positions(filters: FilterPositionsQueryDto) {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;

    const orgIds = filters.organizations
      ? filters.organizations
          .split(',')
          .map((s) => Number(s))
          .filter((n) => !Number.isNaN(n))
      : [];
    const deptIds = filters.departments
      ? filters.departments
          .split(',')
          .map((s) => Number(s))
          .filter((n) => !Number.isNaN(n))
      : [];

    // Sub-query: distinct position_id from worker_positions WHERE status=ACTIVE + org/dept filters.
    const wpWhere = and(
      eq(worker_positions.status, POSITION_STATUS_ACTIVE),
      notDeleted(worker_positions),
      orgIds.length > 0
        ? inArray(worker_positions.organization_id, orgIds)
        : undefined,
      deptIds.length > 0
        ? inArray(worker_positions.department_id, deptIds)
        : undefined,
    );

    const wpRows = await this.db
      .select({ position_id: worker_positions.position_id })
      .from(worker_positions)
      .where(wpWhere);
    const positionIds = [
      ...new Set(
        wpRows
          .map((r) => r.position_id)
          .filter((id): id is number => id != null),
      ),
    ];

    if (positionIds.length === 0) {
      return { current_page: page, total: 0, data: [] };
    }

    const posWhere = and(
      inArray(positionsTable.id, positionIds),
      notDeleted(positionsTable),
      filters.search
        ? ilike(positionsTable.name, `%${filters.search}%`)
        : undefined,
    );

    const offset = (page - 1) * perPage;
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: positionsTable.id,
          name: positionsTable.name,
          name_ru: positionsTable.name_ru,
          name_en: positionsTable.name_en,
        })
        // Laravel: Position::query()->search()->whereIn(...)->paginate() — orderBy YO'Q.
        .from(positionsTable)
        .where(posWhere)
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(positionsTable).where(posWhere),
    ]);

    return {
      current_page: page,
      total: Number(total),
      data: rows.map((r) => ({
        id: r.id,
        name:
          lang === 'ru'
            ? (r.name_ru ?? r.name)
            : lang === 'en'
              ? (r.name_en ?? r.name)
              : r.name,
      })),
    };
  }

  // search-workers — workers in a single organization, paginated, with name filters.
  // WorkerPositionSearchResource: id, contract.type, position.name, worker {last/first/middle}.
  async searchWorkers(filters: FilterSearchWorkersQueryDto) {
    const perPage = filters.per_page ?? 100;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;

    const where = and(
      eq(worker_positions.organization_id, filters.organization_id),
      eq(worker_positions.status, POSITION_STATUS_ACTIVE),
      notDeleted(worker_positions),
      filters.search
        ? ilike(
            sql<string>`COALESCE(${workers.last_name}, '') || ' ' || COALESCE(${workers.first_name}, '') || ' ' || COALESCE(${workers.middle_name}, '')`,
            `%${filters.search}%`,
          )
        : undefined,
      filters.last_name
        ? ilike(workers.last_name, `%${filters.last_name}%`)
        : undefined,
      filters.first_name
        ? ilike(workers.first_name, `%${filters.first_name}%`)
        : undefined,
      filters.middle_name
        ? ilike(workers.middle_name, `%${filters.middle_name}%`)
        : undefined,
    );

    const offset = (page - 1) * perPage;
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: worker_positions.id,
          contract_id: contracts.id,
          contract_type: contracts.type,
          pos_id: positionsTable.id,
          pos_name: positionsTable.name,
          pos_name_ru: positionsTable.name_ru,
          pos_name_en: positionsTable.name_en,
          worker_id: workers.id,
          worker_last: workers.last_name,
          worker_first: workers.first_name,
          worker_middle: workers.middle_name,
        })
        .from(worker_positions)
        .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
        .leftJoin(
          positionsTable,
          eq(positionsTable.id, worker_positions.position_id),
        )
        .leftJoin(contracts, eq(contracts.id, worker_positions.contract_id))
        .where(where)
        .orderBy(
          asc(worker_positions.organization_id),
          asc(worker_positions.department_id),
          asc(worker_positions.department_position_id),
        )
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(worker_positions)
        .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
        .where(where),
    ]);

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows.map((r) => ({
        id: r.id,
        contract: r.contract_id
          ? { id: r.contract_id, type: r.contract_type }
          : null,
        position: r.pos_id
          ? {
              id: r.pos_id,
              name:
                lang === 'ru'
                  ? (r.pos_name_ru ?? r.pos_name)
                  : lang === 'en'
                    ? (r.pos_name_en ?? r.pos_name)
                    : r.pos_name,
            }
          : null,
        worker: r.worker_id
          ? {
              id: r.worker_id,
              last_name: r.worker_last,
              first_name: r.worker_first,
              middle_name: r.worker_middle,
            }
          : null,
      })),
    };
  }
}
