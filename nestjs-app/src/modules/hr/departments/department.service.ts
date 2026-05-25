// Department service. Laravel: DepartmentController + DepartmentService.

import { Injectable } from '@nestjs/common';
import { and, asc, desc, eq, ilike, inArray, isNull, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { departments, organizations, worker_positions } from '@/db/schema';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { BusinessException } from '@/common/exceptions/business.exception';
import { paginate } from '@/common/pagination/paginate.util';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { alias } from 'drizzle-orm/pg-core';
import {
  DepartmentMapper,
  DEPARTMENT_LEVEL_KEYS,
  type DepartmentRow,
  type DepartmentIndexRow,
} from '@/modules/hr/departments/department.mapper';
import {
  QueryDepartmentDto,
  CreateDepartmentDto,
  UpdateDepartmentDto,
  DepartmentListResponseDto,
  DepartmentListMinResponseDto,
  DepartmentShowResponseDto,
  DepartmentTreeNodeDto,
  DepartmentLevelDto,
} from '@/modules/hr/departments/dto/department.dto';

const POSITION_STATUS_ACTIVE = 2; // PositionStatusEnum::ACTIVE

@Injectable()
export class DepartmentService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly scope: OrgScopeService,
  ) {}

  async findAll(
    filters: QueryDepartmentDto,
  ): Promise<DepartmentListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;
    // Laravel Department::filterByOrganization — role + organizations + organization_id.
    const inScope = await this.scope.whereOrg(departments.organization_id, {
      organizations: filters.organizations,
      organization_id: filters.organization_id,
    });

    // Laravel `whereIsRoot()` — nested set roots = parent_id IS NULL.
    const where = and(
      notDeleted(departments),
      isNull(departments.parent_id),
      filters.search
        ? ilike(departments.name, `%${filters.search}%`)
        : undefined,
      inScope,
    );

    const result = await paginate({
      db: this.db,
      countTable: departments,
      countWhere: where,
      query: ({ limit, offset }) => this.fetchIndexRows(where, limit, offset),
      page,
      perPage,
      mapper: (row) => DepartmentMapper.toWithJoinItem(row, this.i18n, lang),
    });

    // Laravel PaginateResource: {current_page, total, data} — `per_page` yo'q.
    const { per_page: _pp, ...rest } = result;
    void _pp;
    return rest as DepartmentListResponseDto;
  }

  // GET /department-list — minimal {id, name, level}, paginated.
  async findList(
    filters: QueryDepartmentDto,
  ): Promise<DepartmentListMinResponseDto> {
    const perPage = filters.per_page ?? 50;
    const page = filters.page ?? 1;

    // Laravel Department::filterByOrganization — role + organizations + organization_id.
    const inScope = await this.scope.whereOrg(departments.organization_id, {
      organizations: filters.organizations,
      organization_id: filters.organization_id,
    });

    const where = and(
      notDeleted(departments),
      filters.search
        ? ilike(departments.name, `%${filters.search}%`)
        : undefined,
      inScope,
    );

    const result = await paginate({
      db: this.db,
      countTable: departments,
      countWhere: where,
      query: ({ limit, offset }) =>
        this.db
          .select({
            id: departments.id,
            name: departments.name,
            level: departments.level,
          })
          .from(departments)
          .where(where)
          .limit(limit)
          .offset(offset),
      page,
      perPage,
      mapper: DepartmentMapper.toListMin,
    });
    // Laravel PaginateResource: `per_page` yo'q.
    const { per_page: _pp, ...rest } = result;
    void _pp;
    return rest as DepartmentListMinResponseDto;
  }

  levels(): DepartmentLevelDto[] {
    const lang = this.ctx.lang;
    return Object.entries(DEPARTMENT_LEVEL_KEYS).map(([id, key]) => {
      const name = this.i18n.t(key, { lang });
      return {
        id: Number(id),
        name: typeof name === 'string' ? name : '',
      };
    });
  }

  async findOne(id: number): Promise<DepartmentShowResponseDto> {
    const dept = await this.fetchOne(id);
    if (!dept) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    const children = await this.fetchChildren(id);
    const lang = this.ctx.lang;

    return {
      department: DepartmentMapper.toItem(dept, this.i18n, lang),
      children: children.map((c) =>
        DepartmentMapper.toItem(c, this.i18n, lang),
      ),
    };
  }

  // GET /departments-tree — Laravel: where('organization_id', (int)(organization_id ?? organizations)).
  // Param berilmasa → (int)null = 0 → hech narsa topilmaydi → bo'sh tree.
  async tree(
    organizationId?: number,
    organizations?: string,
  ): Promise<DepartmentTreeNodeDto[]> {
    const lang = this.ctx.lang;
    // Laravel: (int)(request('organization_id') ?? request('organizations')).
    const orgId = Number(organizationId ?? organizations ?? 0) || 0;

    const flat = await this.db
      .select({
        id: departments.id,
        name: departments.name,
        level: departments.level,
        parent_id: departments.parent_id,
        organization_id: departments.organization_id,
        _lft: departments._lft,
      })
      .from(departments)
      .where(
        and(notDeleted(departments), eq(departments.organization_id, orgId)),
      )
      .orderBy(asc(departments._lft));

    return this.buildTree(flat, lang);
  }

  // CRUD — basic (NestedSet rebalancing Laravel parallel ishlatib turibdi).

  async create(dto: CreateDepartmentDto): Promise<void> {
    // Laravel: organization_id ?? $user->organization_id.
    const organizationId =
      dto.organization_id ?? this.ctx.user_or_fail.organization_id;
    if (organizationId == null) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.organization_not_found'),
      );
    }
    await this.db.insert(departments).values({
      organization_id: organizationId,
      name: dto.name,
      name_ru: dto.name_ru ?? null,
      name_en: dto.name_en ?? null,
      comment: dto.comment ?? null,
      level: dto.level,
      parent_id: dto.parent_id ?? null,
    });
  }

  async update(id: number, dto: UpdateDepartmentDto): Promise<void> {
    await this.assertExists(id);
    // Laravel update: organization_id qabul qilinmaydi — mavjudi saqlanadi.
    await this.db
      .update(departments)
      .set({
        name: dto.name,
        name_ru: dto.name_ru ?? null,
        name_en: dto.name_en ?? null,
        comment: dto.comment ?? null,
        level: dto.level,
        parent_id: dto.parent_id ?? null,
      })
      .where(eq(departments.id, id));
  }

  async remove(id: number): Promise<void> {
    await this.assertExists(id);
    await this.db
      .update(departments)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(departments.id, id));
  }

  // ---- Helpers ----

  private async assertExists(id: number): Promise<void> {
    const [row] = await this.db
      .select({ id: departments.id })
      .from(departments)
      .where(and(eq(departments.id, id), notDeleted(departments)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
  }

  private async fetchOne(id: number): Promise<DepartmentRow | null> {
    const [row] = await this.fetchWithOrg(
      and(eq(departments.id, id), notDeleted(departments)),
      1,
      0,
    );
    return row ?? null;
  }

  private async fetchChildren(parentId: number): Promise<DepartmentRow[]> {
    return this.fetchWithOrg(
      and(eq(departments.parent_id, parentId), notDeleted(departments)),
      100,
      0,
    );
  }

  // Index rows — with worker_rate aggregate, children_exists, parent (DepartmentListResource shape).
  // Laravel ordering: ORDER BY organization_id ASC, departments.id DESC.
  private async fetchIndexRows(
    where: ReturnType<typeof and> | undefined,
    limit: number,
    offset: number,
  ): Promise<DepartmentIndexRow[]> {
    const parent = alias(departments, 'parent_dept');

    const rows = await this.db
      .select({
        id: departments.id,
        organization_id: departments.organization_id,
        name: departments.name,
        name_ru: departments.name_ru,
        name_en: departments.name_en,
        comment: departments.comment,
        level: departments.level,
        parent_id: departments.parent_id,
        _lft: departments._lft,
        _rgt: departments._rgt,
        worker_rate: sql<number>`COALESCE(SUM(CASE WHEN ${worker_positions.status} = ${POSITION_STATUS_ACTIVE} AND ${worker_positions.deleted_at} IS NULL THEN ${worker_positions.rate} ELSE 0 END), 0)`,
        children_exists: sql<boolean>`EXISTS(SELECT 1 FROM ${departments} c WHERE c.parent_id = ${departments.id} AND c.deleted_at IS NULL)`,
        org_id: organizations.id,
        org_name: organizations.name,
        org_name_ru: organizations.name_ru,
        org_name_en: organizations.name_en,
        org_group: organizations.group,
        parent_pk: parent.id,
        parent_name: parent.name,
        parent_level: parent.level,
      })
      .from(departments)
      .leftJoin(
        worker_positions,
        eq(worker_positions.department_id, departments.id),
      )
      .leftJoin(
        organizations,
        eq(departments.organization_id, organizations.id),
      )
      .leftJoin(parent, eq(parent.id, departments.parent_id))
      .where(where)
      .groupBy(
        departments.id,
        organizations.id,
        parent.id,
        parent.name,
        parent.level,
      )
      .orderBy(asc(departments.organization_id), desc(departments.id))
      .limit(limit)
      .offset(offset);

    return rows.map((r) => ({
      id: r.id,
      organization_id: r.organization_id,
      name: r.name,
      name_ru: r.name_ru,
      name_en: r.name_en,
      comment: r.comment,
      level: r.level,
      parent_id: r.parent_id,
      _lft: r._lft,
      _rgt: r._rgt,
      worker_rate: Number(r.worker_rate ?? 0),
      children_exists: !!r.children_exists,
      organization: r.org_id
        ? {
            id: r.org_id,
            name: r.org_name,
            name_ru: r.org_name_ru,
            name_en: r.org_name_en,
            group: r.org_group ?? false,
          }
        : null,
      parent: r.parent_pk
        ? {
            id: r.parent_pk,
            name: r.parent_name ?? '',
            level: r.parent_level ?? 0,
          }
        : null,
    }));
  }

  // Show / children — simple JOIN organizations (no aggregates).
  private async fetchWithOrg(
    where: ReturnType<typeof and> | undefined,
    limit: number,
    offset: number,
  ): Promise<DepartmentRow[]> {
    const rows = await this.db
      .select({
        id: departments.id,
        organization_id: departments.organization_id,
        name: departments.name,
        name_ru: departments.name_ru,
        name_en: departments.name_en,
        comment: departments.comment,
        level: departments.level,
        parent_id: departments.parent_id,
        _lft: departments._lft,
        _rgt: departments._rgt,
        org_id: organizations.id,
        org_name: organizations.name,
        org_name_ru: organizations.name_ru,
        org_name_en: organizations.name_en,
        org_group: organizations.group,
      })
      .from(departments)
      .leftJoin(
        organizations,
        eq(departments.organization_id, organizations.id),
      )
      .where(where)
      .limit(limit)
      .offset(offset);

    return rows.map((r) => ({
      id: r.id,
      organization_id: r.organization_id,
      name: r.name,
      name_ru: r.name_ru,
      name_en: r.name_en,
      comment: r.comment,
      level: r.level,
      parent_id: r.parent_id,
      _lft: r._lft,
      _rgt: r._rgt,
      organization: r.org_id
        ? {
            id: r.org_id,
            name: r.org_name,
            name_ru: r.org_name_ru,
            name_en: r.org_name_en,
            group: r.org_group ?? false,
          }
        : null,
    }));
  }

  // Flat list → recursive tree by parent_id.
  // Laravel DepartmentTreeResource: {id, name, level:{id,name}, parent:{id,name}|null,
  //   children:[...], organization_id}.
  private buildTree(
    flat: {
      id: number;
      name: string;
      level: number;
      parent_id: number | null;
      organization_id: number;
      _lft: number;
    }[],
    lang: string,
  ): DepartmentTreeNodeDto[] {
    const nameById = new Map<number, string>();
    for (const f of flat) nameById.set(f.id, f.name);

    const allNodes = new Map<number, DepartmentTreeNodeDto>();
    for (const f of flat) {
      const key = DEPARTMENT_LEVEL_KEYS[f.level];
      const localized = key ? this.i18n.t(key, { lang }) : '';
      const node: DepartmentTreeNodeDto = {
        id: f.id,
        name: f.name,
        level: {
          id: f.level,
          name: typeof localized === 'string' ? localized : '',
        },
        parent:
          f.parent_id != null
            ? { id: f.parent_id, name: nameById.get(f.parent_id) ?? null }
            : null,
        children: [],
        organization_id: f.organization_id,
      };
      allNodes.set(f.id, node);
    }

    const roots: DepartmentTreeNodeDto[] = [];
    for (const f of flat) {
      const node = allNodes.get(f.id)!;
      if (f.parent_id === null) {
        roots.push(node);
      } else {
        const parent = allNodes.get(f.parent_id);
        if (parent) parent.children.push(node);
        else roots.push(node);
      }
    }
    return roots;
  }
}
