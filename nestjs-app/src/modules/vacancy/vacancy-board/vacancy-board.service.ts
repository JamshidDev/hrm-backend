// Vacancy board service. Laravel: Vacancy/VacancyController.
// Ochiq (public) vakansiyalar bo'limi: ro'yxat, ko'rinish, hududlar, shaharlar.

import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { and, asc, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { cities, organizations, regions, vacancy_positions } from '@/db/schema';
import { pageOf } from '@/modules/vacancy/_shared/helpers';
import type { QueryVacancyBoardDto } from '@/modules/vacancy/vacancy-board/dto/vacancy-board.dto';

@Injectable()
export class VacancyBoardService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
  ) {}

  // GET /v1/vacancies/organizations — faol vakansiyasi bor tashkilotlar.
  // Laravel: VacancyPosition::where('to','>=',now()->subDay())->where('status',true)
  //   ->select('organization_id') → Organization::whereIn('id', $orgIds).
  async organizations() {
    const activeOrgIds = this.db
      .select({ org_id: vacancy_positions.organization_id })
      .from(vacancy_positions)
      .where(
        and(
          notDeleted(vacancy_positions),
          eq(vacancy_positions.status, true),
          sql`${vacancy_positions.to} >= (CURRENT_DATE - INTERVAL '1 day')`,
        ),
      );
    return this.db
      .select({
        id: organizations.id,
        name: organizations.name,
        group: organizations.group,
      })
      .from(organizations)
      .where(
        and(notDeleted(organizations), inArray(organizations.id, activeOrgIds)),
      );
  }

  // GET /v1/vacancies/report — vakansiyalar ro'yxati (paginatsiya + filter).
  async report(filters: QueryVacancyBoardDto) {
    const { page, perPage, offset } = pageOf(filters);

    const where = and(
      notDeleted(vacancy_positions),
      eq(vacancy_positions.status, true),
      // Laravel VacancyController::index — where('to','>=',now()->subDay()->toDateString()).
      sql`${vacancy_positions.to} >= (CURRENT_DATE - INTERVAL '1 day')`,
      filters.organization_id
        ? eq(vacancy_positions.organization_id, filters.organization_id)
        : undefined,
      filters.city_id
        ? eq(vacancy_positions.city_id, filters.city_id)
        : undefined,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(vacancy_positions)
        .where(where)
        .orderBy(desc(vacancy_positions.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(vacancy_positions).where(where),
    ]);

    return {
      current_page: page,
      total: Number(total),
      data: rows,
    };
  }

  // GET /v1/vacancies/report/{id} — bitta vakansiya. Topilmasa 404.
  async reportShow(id: number) {
    const [row] = await this.db
      .select()
      .from(vacancy_positions)
      .where(and(eq(vacancy_positions.id, id), notDeleted(vacancy_positions)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    return row;
  }

  // GET /v1/vacancies/list — faol vakansiyalarning qisqa ro'yxati (oxirgi 50 ta).
  async list() {
    return this.db
      .select({
        id: vacancy_positions.id,
        salary: vacancy_positions.salary,
        salary_status: vacancy_positions.salary_status,
        work_type: vacancy_positions.work_type,
        education: vacancy_positions.education,
        view_count: vacancy_positions.view_count,
      })
      .from(vacancy_positions)
      .where(
        and(notDeleted(vacancy_positions), eq(vacancy_positions.status, true)),
      )
      .orderBy(desc(vacancy_positions.id))
      .limit(50);
  }

  // GET /v1/vacancies/regions — hududlar ro'yxati.
  async regions() {
    return this.db
      .select({ id: regions.id, name: regions.name })
      .from(regions)
      .where(notDeleted(regions))
      .orderBy(asc(regions.id));
  }

  // GET /v1/vacancies/cities — shaharlar ro'yxati.
  async cities() {
    return this.db
      .select({ id: cities.id, name: cities.name, region_id: cities.region_id })
      .from(cities)
      .where(notDeleted(cities))
      .orderBy(asc(cities.id));
  }
}
