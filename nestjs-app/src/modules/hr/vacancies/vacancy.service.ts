// Vacancy service. Laravel: VacancyPositionController::index() (only).
// whereHas('department_position') + whereHas('department_position.department') —
// dept_position va department mavjudligi shart.

import { Injectable } from '@nestjs/common';
import {
  and,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  sql,
} from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  vacancy_positions,
  vacancy_applications,
  department_positions,
  departments,
  positions as positionsTable,
  organizations,
  cities,
  regions,
} from '@/db/schema';
import { RequestContext } from '@/common/context/request.context';
import { resolveOrgScopeIds } from '@/common/database/org-scope.helper';
import { PermissionService } from '@/shared/permission/permission.service';
import { VacancyMapper } from '@/modules/hr/vacancies/vacancy.mapper';
import {
  QueryVacancyDto,
  VacancyListResponseDto,
} from '@/modules/hr/vacancies/dto/vacancy.dto';

@Injectable()
export class VacancyService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly permissions: PermissionService,
  ) {}

  async findAll(filters: QueryVacancyDto): Promise<VacancyListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;

    const orgIds = filters.organizations
      ? filters.organizations
          .split(',')
          .map((s) => Number(s))
          .filter((n) => !Number.isNaN(n))
      : [];

    // Laravel: VacancyPosition::filter() → QueryHelper::filterByOrganizations —
    // foydalanuvchi ko'ra oladigan tashkilotlar bo'yicha scope (childIds).
    const scopeOrgIds = await resolveOrgScopeIds(
      this.db,
      this.permissions,
      this.ctx.user_or_fail.id,
      this.ctx.user_or_fail.organization_id,
    );

    const where = and(
      isNull(vacancy_positions.deleted_at),
      isNotNull(department_positions.id),
      isNotNull(departments.id),
      scopeOrgIds.length
        ? inArray(vacancy_positions.organization_id, scopeOrgIds)
        : sql`false`,
      filters.organization_id
        ? eq(vacancy_positions.organization_id, filters.organization_id)
        : undefined,
      orgIds.length > 0
        ? inArray(vacancy_positions.organization_id, orgIds)
        : undefined,
    );

    const offset = (page - 1) * perPage;

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: vacancy_positions.id,
          rate: vacancy_positions.rate,
          to: vacancy_positions.to,
          finish: vacancy_positions.finish,
          salary: vacancy_positions.salary,
          salary_status: vacancy_positions.salary_status,
          phd_status: vacancy_positions.phd_status,
          experience: vacancy_positions.experience,
          vacancy_status: vacancy_positions.vacancy_status,
          work_type: vacancy_positions.work_type,
          education: vacancy_positions.education,
          status: vacancy_positions.status,
          pos_id: positionsTable.id,
          pos_name: positionsTable.name,
          pos_name_ru: positionsTable.name_ru,
          pos_name_en: positionsTable.name_en,
          dept_id: departments.id,
          dept_name: departments.name,
          dept_level: departments.level,
          org_id: organizations.id,
          org_name: organizations.name,
          org_name_ru: organizations.name_ru,
          org_name_en: organizations.name_en,
          org_group: organizations.group,
          city_id: cities.id,
          city_name: cities.name,
          city_name_ru: cities.name_ru,
          city_name_en: cities.name_en,
          city_lat: cities.lat,
          city_long: cities.long,
          region_id: regions.id,
          region_name: regions.name,
          applications_count: sql<number>`(SELECT COUNT(*) FROM ${vacancy_applications} WHERE ${vacancy_applications.vacancy_position_id} = ${vacancy_positions.id} AND ${vacancy_applications.deleted_at} IS NULL)`,
        })
        .from(vacancy_positions)
        .leftJoin(
          department_positions,
          and(
            eq(
              department_positions.id,
              vacancy_positions.department_position_id,
            ),
            isNull(department_positions.deleted_at),
          ),
        )
        .leftJoin(
          departments,
          and(
            eq(departments.id, department_positions.department_id),
            isNull(departments.deleted_at),
          ),
        )
        .leftJoin(
          positionsTable,
          eq(positionsTable.id, department_positions.position_id),
        )
        .leftJoin(
          organizations,
          eq(organizations.id, vacancy_positions.organization_id),
        )
        .leftJoin(cities, eq(cities.id, vacancy_positions.city_id))
        .leftJoin(regions, eq(regions.id, cities.region_id))
        .where(where)
        .orderBy(desc(vacancy_positions.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(vacancy_positions)
        .leftJoin(
          department_positions,
          and(
            eq(
              department_positions.id,
              vacancy_positions.department_position_id,
            ),
            isNull(department_positions.deleted_at),
          ),
        )
        .leftJoin(
          departments,
          and(
            eq(departments.id, department_positions.department_id),
            isNull(departments.deleted_at),
          ),
        )
        .where(where),
    ]);

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows.map((r) => VacancyMapper.toItem(r, this.i18n, lang)),
    };
  }
}
