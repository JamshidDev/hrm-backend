// DepartmentLocation service. Laravel: HR/DepartmentLocationController.

import { Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, isNull, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { department_locations, departments, organizations } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { RequestContext } from '@/common/context/request.context';
import { DEPARTMENT_LEVEL_KEYS } from '@/modules/hr/departments/department.mapper';
import {
  CreateDepartmentLocationDto,
  QueryDepartmentLocationDto,
  UpdateDepartmentLocationDto,
} from '@/modules/hr/department-locations/dto/department-location.dto';

@Injectable()
export class DepartmentLocationService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly scope: OrgScopeService,
    private readonly ctx: RequestContext,
  ) {}

  // GET /api/v1/hr/locations
  async findAll(filters: QueryDepartmentLocationDto) {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;

    const where = and(
      filters.department_id != null
        ? eq(department_locations.department_id, filters.department_id)
        : undefined,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: department_locations.id,
          department_id: department_locations.department_id,
          geo_type: department_locations.geo_type,
          lat: department_locations.lat,
          lng: department_locations.lng,
          radius: department_locations.radius,
          polygon: department_locations.polygon,
          accuracy_limit: department_locations.accuracy_limit,
          dept_name: departments.name,
          dept_org_id: departments.organization_id,
          org_name: organizations.name,
        })
        .from(department_locations)
        .leftJoin(
          departments,
          eq(departments.id, department_locations.department_id),
        )
        .leftJoin(
          organizations,
          and(
            eq(organizations.id, departments.organization_id),
            isNull(organizations.deleted_at),
          ),
        )
        .where(where)
        .orderBy(asc(department_locations.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(department_locations)
        .where(where),
    ]);

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows.map((r) => ({
        id: r.id,
        department: r.department_id
          ? {
              id: r.department_id,
              name: r.dept_name,
              organization_id: r.dept_org_id,
            }
          : null,
        organization: r.dept_org_id
          ? { id: r.dept_org_id, name: r.org_name }
          : null,
        geo_type: r.geo_type,
        lat: r.lat,
        lng: r.lng,
        radius: r.radius,
        polygon: r.polygon,
        accuracy_limit: r.accuracy_limit,
      })),
    };
  }

  // GET /api/v1/hr/list (DepartmentLocationController::list)
  /**
   * GET /api/v1/extra/department/list — Laravel DepartmentLocationController::list.
   * Department: search + whereIsRoot (parent_id null) + org-scope, with organization,
   * withExists(children) + withExists(locations), orderBy org, id desc → paginate.
   * → DepartmentLocationListResource {id, name, level{id,name}, organization, children, location}.
   */
  async list(q?: { page?: number; per_page?: number; search?: string }) {
    const perPage = q?.per_page ? Number(q.per_page) : 10;
    const page = q?.page ? Number(q.page) : 1;
    const offset = (page - 1) * perPage;
    const lang = this.ctx.lang;

    const inScope = await this.scope.whereOrg(departments.organization_id);
    const where = and(
      notDeleted(departments),
      isNull(departments.parent_id), // whereIsRoot (NestedSet root)
      inScope,
      q?.search ? ilike(departments.name, `%${q.search}%`) : undefined,
    );

    // withExists('children') / withExists('locations') — EXISTS subquery.
    const childAlias = departments;
    const childrenExists = sql<boolean>`EXISTS (SELECT 1 FROM ${childAlias} c WHERE c.parent_id = ${departments.id} AND c.deleted_at IS NULL)`;
    const locationsExists = sql<boolean>`EXISTS (SELECT 1 FROM ${department_locations} dl WHERE dl.department_id = ${departments.id})`;

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: departments.id,
          name: departments.name,
          level: departments.level,
          o_id: organizations.id,
          o_name: organizations.name,
          o_group: organizations.group,
          children_exists: childrenExists,
          locations_exists: locationsExists,
        })
        .from(departments)
        .leftJoin(
          organizations,
          eq(organizations.id, departments.organization_id),
        )
        .where(where)
        // Laravel: orderBy('organization_id')->orderByDesc('id').
        .orderBy(asc(departments.organization_id), desc(departments.id))
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
        level: {
          id: r.level,
          name: this.levelName(r.level, lang),
        },
        // Laravel with('organization:id,name,group') — name_ru/name_en yuklanmaydi
        // (OrganizationListResource ru/en → null).
        organization: r.o_id
          ? {
              id: r.o_id,
              name: lang === 'ru' || lang === 'en' ? null : r.o_name,
              group: r.o_group,
            }
          : null,
        children: r.children_exists,
        location: r.locations_exists,
      })),
    };
  }

  // DepartmentLevelEnum::get(level) — topilmasa "" (Laravel `?? ''`).
  private levelName(level: number | null, lang: string): string {
    const key = level != null ? DEPARTMENT_LEVEL_KEYS[level] : undefined;
    if (!key) return '';
    const v = this.i18n.t(key, { lang });
    return typeof v === 'string' ? v : '';
  }

  // GET /api/v1/hr/locations/{id}
  async findOne(id: number) {
    const [row] = await this.db
      .select()
      .from(department_locations)
      .where(eq(department_locations.id, id))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    return row;
  }

  // POST /api/v1/hr/locations
  async create(dto: CreateDepartmentLocationDto): Promise<void> {
    await this.db.insert(department_locations).values({
      department_id: dto.department_id,
      geo_type: dto.geo_type,
      lat: dto.lat,
      lng: dto.lng,
      radius: dto.radius ?? 30,
      polygon: dto.polygon ?? null,
      accuracy_limit: dto.accuracy_limit ?? null,
    });
  }

  // PUT /api/v1/hr/locations/{id}
  async update(id: number, dto: UpdateDepartmentLocationDto): Promise<void> {
    const [row] = await this.db
      .select({ id: department_locations.id })
      .from(department_locations)
      .where(eq(department_locations.id, id))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    const setData: Record<string, unknown> = {};
    if (dto.geo_type !== undefined) setData.geo_type = dto.geo_type;
    if (dto.lat !== undefined) setData.lat = dto.lat;
    if (dto.lng !== undefined) setData.lng = dto.lng;
    if (dto.radius !== undefined) setData.radius = dto.radius;
    if (dto.polygon !== undefined) setData.polygon = dto.polygon;
    if (dto.accuracy_limit !== undefined)
      setData.accuracy_limit = dto.accuracy_limit;
    setData.updated_at = sql`NOW()`;

    await this.db
      .update(department_locations)
      .set(setData)
      .where(eq(department_locations.id, id));
  }

  // DELETE /api/v1/hr/locations/{id}
  async remove(id: number): Promise<void> {
    const [row] = await this.db
      .select({ id: department_locations.id })
      .from(department_locations)
      .where(eq(department_locations.id, id))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    await this.db
      .delete(department_locations)
      .where(eq(department_locations.id, id));
  }
}
