// VacancyPosition service. Laravel: HR/VacancyPositionController + VacancyApplication*.
//
// QAYDLAR: Vacancy domeni juda katta — bu yerda asosiy CRUD + actions taqdim etiladi.
// Bazi sub-endpointlar (file upload, zoom meeting, exam attach) Laravel'da ham
// integratsiya talab qiladi — bu yerda minimal implementatsiya.

import { Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  ne,
  sql,
} from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  cities,
  countries,
  department_positions,
  departments,
  nationalities,
  organizations,
  positions as positionsTable,
  regions,
  vacancy_application_files,
  vacancy_application_statuses,
  vacancy_applications,
  vacancy_approve_organizations,
  vacancy_positions,
  vacancy_user_careers,
  vacancy_user_education,
  vacancy_users,
  worker_positions,
} from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import {
  eduIdName,
  levelIdName,
  mapApplicationListItem,
  mapCity,
  mapShowApplication,
  mapUserFull,
  mapVacancyDetailBase,
  type ApplicationFileRow,
  type ApplicationRow,
  type ApplicationStatusRow,
  type CareerRow,
  type EducationRow,
  type IdName,
  type VacancyDetailRow,
  type VacancyUserFull,
  type VacancyUserRow,
} from '@/modules/hr/vacancy-positions/vacancy-position.mapper';
import {
  CreateVacancyPositionDto,
  QueryVacancyPositionDto,
  UpdateApplicationStatusDto,
  UpdateVacancyPositionDto,
} from '@/modules/hr/vacancy-positions/dto/vacancy-position.dto';

@Injectable()
export class VacancyPositionService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
  ) {}

  // GET /api/v1/hr/vacancy
  async findAll(filters: QueryVacancyPositionDto) {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;

    const where = and(
      notDeleted(vacancy_positions),
      filters.organization_id
        ? eq(vacancy_positions.organization_id, filters.organization_id)
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
      per_page: perPage,
      total: Number(total),
      data: rows,
    };
  }

  // GET /api/v1/hr/vacancy/positions — vakansiya yaratish formasi uchun
  // bo'sh stavkali department_positions ro'yxati. Laravel: VacancyPositionController::vacancies.
  // Pagination YO'Q — barcha mos qatorlar qaytadi.
  async positionsForVacancy(_filters: QueryVacancyPositionDto) {
    const orgId = this.ctx.user_or_fail.organization_id;
    const lang = this.ctx.lang;

    // worker_positions.rate yig'indisi (status=2, o'chirilmagan) — subquery.
    const workerRateSql = sql<number>`COALESCE((SELECT SUM(${worker_positions.rate}) FROM ${worker_positions} WHERE ${worker_positions.department_position_id} = ${department_positions.id} AND ${worker_positions.status} = 2 AND ${worker_positions.deleted_at} IS NULL), 0)`;

    // Laravel: rate > worker_positions stavkalari yig'indisi.
    const rows = orgId
      ? await this.db
          .select({
            id: department_positions.id,
            rate: department_positions.rate,
            worker_rate: workerRateSql,
            salary: department_positions.salary,
            education: department_positions.education,
            experience: department_positions.experience,
            dept_name: departments.name,
            pos_name: positionsTable.name,
          })
          .from(department_positions)
          .leftJoin(
            departments,
            eq(departments.id, department_positions.department_id),
          )
          .leftJoin(
            positionsTable,
            eq(positionsTable.id, department_positions.position_id),
          )
          .where(
            and(
              eq(department_positions.organization_id, orgId),
              // DepartmentPosition SoftDeletes — o'chirilganlar chiqmaydi.
              notDeleted(department_positions),
              sql`COALESCE(${department_positions.rate}, 0) > ${workerRateSql}`,
            ),
          )
      : [];

    // Laravel: $user->organization->city — joriy foydalanuvchi tashkilotining shahri.
    let cityRow: {
      city_id: number | null;
      city_name: string | null;
      city_name_ru: string | null;
      city_name_en: string | null;
      city_lat: string | null;
      city_long: string | null;
      region_id: number | null;
      region_name: string | null;
    } | null = null;
    if (orgId) {
      const [found] = await this.db
        .select({
          city_id: cities.id,
          city_name: cities.name,
          city_name_ru: cities.name_ru,
          city_name_en: cities.name_en,
          city_lat: cities.lat,
          city_long: cities.long,
          region_id: regions.id,
          region_name: regions.name,
        })
        .from(organizations)
        .leftJoin(cities, eq(cities.id, organizations.city_id))
        .leftJoin(regions, eq(regions.id, cities.region_id))
        .where(eq(organizations.id, orgId))
        .limit(1);
      cityRow = found ?? null;
    }

    return {
      positions: rows.map((r) => ({
        id: r.id,
        // Laravel DepartmentPosition `rate` Attribute: get → qiymat / 100.
        rate: r.rate / 100,
        // Laravel: ((int)$worker_rate) / 100.
        worker_rate: Math.trunc(Number(r.worker_rate ?? 0)) / 100,
        department: r.dept_name ?? null,
        position: r.pos_name ?? null,
        salary: r.salary,
        education: eduIdName(this.i18n, r.education, lang),
        // Laravel: (int)($experience / 12) — oylardan yillarga.
        experience: Math.trunc(Number(r.experience ?? 0) / 12),
      })),
      city: mapCity(cityRow),
    };
  }

  // Vakansiya mavjudligini tekshiruvchi xususiy helper (mutatsiya metodlari uchun).
  private async ensureExists(id: number): Promise<void> {
    const [row] = await this.db
      .select({ id: vacancy_positions.id })
      .from(vacancy_positions)
      .where(and(eq(vacancy_positions.id, id), notDeleted(vacancy_positions)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
  }

  // Vakansiyani barcha join'lar bilan olib keluvchi xususiy helper.
  // department_position, department, position, organization, city, region join'lari.
  private async loadDetailRow(
    id: number,
  ): Promise<VacancyDetailRow | undefined> {
    const [row] = await this.db
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
        address: vacancy_positions.address,
        position_obligations: vacancy_positions.position_obligations,
        qualification_requirements:
          vacancy_positions.qualification_requirements,
        working_conditions: vacancy_positions.working_conditions,
        specialties: vacancy_positions.specialties,
        status: vacancy_positions.status,
        department_position_id: department_positions.id,
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
      })
      .from(vacancy_positions)
      // Soft-delete'larni join ichida filtrlash (referensiya pattern).
      .leftJoin(
        department_positions,
        and(
          eq(department_positions.id, vacancy_positions.department_position_id),
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
      .where(and(eq(vacancy_positions.id, id), notDeleted(vacancy_positions)))
      .limit(1);
    return row;
  }

  // GET /api/v1/hr/vacancy/{id} — Laravel: VacancyPositionController::show.
  // whereHas('department_position.department') + whereHas('department_position.position')
  // — dept_position/department/position yo'q yoki o'chirilgan bo'lsa 404.
  async findOne(id: number) {
    const row = await this.loadDetailRow(id);
    if (
      !row ||
      row.department_position_id == null ||
      row.dept_id == null ||
      row.pos_id == null
    ) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    const lang = this.ctx.lang;
    const base = mapVacancyDetailBase(row, this.i18n, lang);

    // Laravel: 'applications' (+ user, statuses, files) eager-load.
    // VacancyApplication SoftDeletes — o'chirilgan arizalar chiqmaydi.
    const apps = await this.db
      .select({
        id: vacancy_applications.id,
        status: vacancy_applications.status,
        created_at: vacancy_applications.created_at,
        vacancy_user_id: vacancy_applications.vacancy_user_id,
      })
      .from(vacancy_applications)
      .where(
        and(
          eq(vacancy_applications.vacancy_position_id, id),
          notDeleted(vacancy_applications),
        ),
      );

    const applications = await this.buildShowApplications(apps, lang);

    return {
      ...base,
      finish: row.finish,
      vacancy_status: levelIdName(this.i18n, row.vacancy_status, lang),
      applications,
    };
  }

  // GET /api/v1/hr/vacancy/{id}/edit — Laravel: VacancyPositionController::edit.
  // Plain findOrFail (whereHas YO'Q), `finish`/`vacancy_status`/`applications` qaytmaydi.
  async edit(id: number) {
    const row = await this.loadDetailRow(id);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    return mapVacancyDetailBase(row, this.i18n, this.ctx.lang);
  }

  // POST /api/v1/hr/vacancy/positions — create (Laravel: store).
  async create(dto: CreateVacancyPositionDto): Promise<void> {
    const userId = this.ctx.user_or_fail.id;
    const organizationId = this.ctx.user_or_fail.organization_id ?? 0;
    await this.db.insert(vacancy_positions).values({
      organization_id: organizationId,
      user_id: userId,
      department_position_id: dto.department_position_id,
      rate: dto.rate,
      city_id: dto.city_id,
      experience: dto.experience,
      salary: dto.salary,
      work_type: dto.work_type,
      education: dto.education,
      address: dto.address ?? null,
      to: dto.to ?? null,
      position_obligations: dto.position_obligations ?? null,
      qualification_requirements: dto.qualification_requirements ?? null,
      working_conditions: dto.working_conditions ?? null,
      specialties: dto.specialties ?? null,
      salary_status: dto.salary_status ?? true,
      phd_status: dto.phd_status ?? false,
    });
  }

  // PUT /api/v1/hr/vacancy/{id} — Laravel: VacancyPositionController::update.
  // Partial yangilash — faqat berilgan maydonlar (Laravel `validated()` kabi).
  async update(id: number, dto: UpdateVacancyPositionDto): Promise<void> {
    const [vacancy] = await this.db
      .select({
        id: vacancy_positions.id,
        organization_id: vacancy_positions.organization_id,
      })
      .from(vacancy_positions)
      .where(and(eq(vacancy_positions.id, id), notDeleted(vacancy_positions)))
      .limit(1);
    if (!vacancy) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    // Laravel: status=true bo'lsa — vacancy_approve_organizations tekshiruvi.
    // Tashkilot tasdiqlovchiga ega bo'lsa, faqat tasdiqlovchi (from_organization)
    // vakansiyani faollashtira oladi.
    if (dto.status) {
      const [approve] = await this.db
        .select({
          from_organization_id:
            vacancy_approve_organizations.from_organization_id,
        })
        .from(vacancy_approve_organizations)
        .where(
          eq(
            vacancy_approve_organizations.to_organization_id,
            vacancy.organization_id,
          ),
        )
        .limit(1);
      if (
        approve &&
        this.ctx.user_or_fail.organization_id !== approve.from_organization_id
      ) {
        throw new BusinessException(
          403,
          this.i18n.t('messages.errors.has_application_not_checked'),
        );
      }
    }

    // Drizzle `.set()` `undefined` qiymatlarni o'tkazib yuboradi → partial update.
    await this.db
      .update(vacancy_positions)
      .set({
        department_position_id: dto.department_position_id,
        rate: dto.rate,
        city_id: dto.city_id,
        experience: dto.experience,
        salary: dto.salary,
        work_type: dto.work_type,
        education: dto.education,
        address: dto.address,
        to: dto.to,
        position_obligations: dto.position_obligations,
        qualification_requirements: dto.qualification_requirements,
        working_conditions: dto.working_conditions,
        specialties: dto.specialties,
        salary_status: dto.salary_status,
        phd_status: dto.phd_status,
        status: dto.status,
        updated_at: sql`NOW()`,
      })
      .where(eq(vacancy_positions.id, id));
  }

  // PUT /api/v1/hr/vacancy/{id}/change-status — Laravel: changeStatus.
  // Body OLMAYDI — vakansiya `vacancy_status` bosqichini keyingisiga oshiradi.
  // Har bir ariza joriy bosqich uchun tekshirilgan bo'lishi shart.
  async changeStatus(id: number): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [vacancy] = await tx
        .select({
          id: vacancy_positions.id,
          vacancy_status: vacancy_positions.vacancy_status,
        })
        .from(vacancy_positions)
        .where(and(eq(vacancy_positions.id, id), notDeleted(vacancy_positions)))
        .limit(1);
      if (!vacancy) {
        throw new BusinessException(404, this.i18n.t('messages.not_found'));
      }
      const currentStatus = vacancy.vacancy_status;

      // Vakansiya arizalari (o'chirilmagan).
      const apps = await tx
        .select({ id: vacancy_applications.id })
        .from(vacancy_applications)
        .where(
          and(
            eq(vacancy_applications.vacancy_position_id, id),
            notDeleted(vacancy_applications),
          ),
        );
      const appIds = apps.map((a) => a.id);

      // Joriy bosqich uchun tekshirilmagan ariza bo'lsa — xatolik.
      // Har bir arizada type=currentStatus bo'lgan status bo'lishi shart.
      if (appIds.length) {
        const checked = await tx
          .select({
            vacancy_application_id:
              vacancy_application_statuses.vacancy_application_id,
          })
          .from(vacancy_application_statuses)
          .where(
            and(
              inArray(
                vacancy_application_statuses.vacancy_application_id,
                appIds,
              ),
              eq(vacancy_application_statuses.type, currentStatus),
              notDeleted(vacancy_application_statuses),
            ),
          );
        const checkedIds = new Set(
          checked.map((s) => s.vacancy_application_id),
        );
        if (appIds.some((aid) => !checkedIds.has(aid))) {
          throw new BusinessException(
            400,
            this.i18n.t('messages.errors.has_application_not_checked'),
          );
        }
      }

      // Keyingi bosqich (Laravel nextStatus — amalda doim +1).
      await tx
        .update(vacancy_positions)
        .set({ vacancy_status: currentStatus + 1, updated_at: sql`NOW()` })
        .where(eq(vacancy_positions.id, id));

      // Har bir arizaning joriy bosqich statusini (type=currentStatus, status!=3)
      // "qabul qilindi" (2) holatiga o'tkazish — ariza bo'yicha bittadan.
      if (appIds.length) {
        const rows = await tx
          .select({
            id: vacancy_application_statuses.id,
            vacancy_application_id:
              vacancy_application_statuses.vacancy_application_id,
          })
          .from(vacancy_application_statuses)
          .where(
            and(
              inArray(
                vacancy_application_statuses.vacancy_application_id,
                appIds,
              ),
              eq(vacancy_application_statuses.type, currentStatus),
              ne(vacancy_application_statuses.status, 3),
              notDeleted(vacancy_application_statuses),
            ),
          )
          .orderBy(asc(vacancy_application_statuses.id));
        const seen = new Set<number>();
        const targetIds: number[] = [];
        for (const r of rows) {
          if (!seen.has(r.vacancy_application_id)) {
            seen.add(r.vacancy_application_id);
            targetIds.push(r.id);
          }
        }
        if (targetIds.length) {
          await tx
            .update(vacancy_application_statuses)
            .set({ status: 2, updated_at: sql`NOW()` })
            .where(inArray(vacancy_application_statuses.id, targetIds));
        }
      }
    });
  }

  // PUT /api/v1/hr/vacancy/{id}/finish
  async finish(id: number): Promise<void> {
    await this.ensureExists(id);
    await this.db
      .update(vacancy_positions)
      .set({ finish: 2, updated_at: sql`NOW()` })
      .where(eq(vacancy_positions.id, id));
  }

  // DELETE /api/v1/hr/vacancy/{id}
  async remove(id: number): Promise<void> {
    await this.ensureExists(id);
    await this.db
      .update(vacancy_positions)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(vacancy_positions.id, id));
  }

  // GET /api/v1/hr/vacancy/{id}/applications — Laravel: VacancySendController::index.
  // Sahifalangan, VacancyApplicationResource. Laravel vakansiya mavjudligini
  // tekshirmaydi (noto'g'ri id → bo'sh ro'yxat). VacancyApplication SoftDeletes.
  // ORDER BY yo'q → desc(id).
  async applications(vacancyId: number, perPage = 10, page = 1) {
    const lang = this.ctx.lang;
    const offset = (page - 1) * perPage;
    const where = and(
      eq(vacancy_applications.vacancy_position_id, vacancyId),
      notDeleted(vacancy_applications),
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: vacancy_applications.id,
          status: vacancy_applications.status,
          created_at: vacancy_applications.created_at,
          vacancy_user_id: vacancy_applications.vacancy_user_id,
        })
        .from(vacancy_applications)
        .where(where)
        .orderBy(desc(vacancy_applications.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(vacancy_applications)
        .where(where),
    ]);

    // VacancyUserResource'lar uchun foydalanuvchilarni batch yuklab olish.
    const userMap = await this.loadVacancyUsersFull(
      rows.map((r) => r.vacancy_user_id),
    );

    const data = rows.map((app) =>
      mapApplicationListItem(
        app,
        userMap.get(app.vacancy_user_id) ?? null,
        this.i18n,
        lang,
      ),
    );

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data,
    };
  }

  // PUT /api/v1/hr/vacancy/{id}/applications/{aid}
  async updateApplicationStatus(
    vacancyId: number,
    applicationId: number,
    dto: UpdateApplicationStatusDto,
  ): Promise<void> {
    const [row] = await this.db
      .select({ id: vacancy_applications.id })
      .from(vacancy_applications)
      .where(
        and(
          eq(vacancy_applications.id, applicationId),
          eq(vacancy_applications.vacancy_position_id, vacancyId),
        ),
      )
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    await this.db
      .update(vacancy_applications)
      .set({ status: dto.status, updated_at: sql`NOW()` })
      .where(eq(vacancy_applications.id, applicationId));
  }

  // DELETE /api/v1/hr/vacancy/{id}/applications/{aid}
  async removeApplication(
    vacancyId: number,
    applicationId: number,
  ): Promise<void> {
    const [row] = await this.db
      .select({ id: vacancy_applications.id })
      .from(vacancy_applications)
      .where(
        and(
          eq(vacancy_applications.id, applicationId),
          eq(vacancy_applications.vacancy_position_id, vacancyId),
        ),
      )
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    await this.db
      .update(vacancy_applications)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(vacancy_applications.id, applicationId));
  }

  // GET /api/v1/hr/vacancy/{id}/applications/{aid}/show-user
  // Laravel: VacancyApplicationStatusController::showVacancyUser → VacancyUserResource.
  // Arizani topib (yo'q bo'lsa 404), uning vacancy_user'ini map qiladi.
  async showVacancyUser(_vacancyId: number, applicationId: number) {
    const [app] = await this.db
      .select({ vacancy_user_id: vacancy_applications.vacancy_user_id })
      .from(vacancy_applications)
      .where(
        and(
          eq(vacancy_applications.id, applicationId),
          notDeleted(vacancy_applications),
        ),
      )
      .limit(1);
    if (!app) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    const userMap = await this.loadVacancyUsersFull([app.vacancy_user_id]);
    return userMap.get(app.vacancy_user_id) ?? null;
  }

  // --- xususiy yordamchi metodlar ---

  // show endpoint'i uchun `applications` massivini quradi.
  // Foydalanuvchi (minimal), statuslar va fayllarni batch yuklab oladi (N+1 yo'q).
  private async buildShowApplications(
    apps: ApplicationRow[],
    lang: string,
  ): Promise<unknown[]> {
    if (apps.length === 0) return [];

    const appIds = apps.map((a) => a.id);
    const userIds = [
      ...new Set(apps.map((a) => a.vacancy_user_id).filter(Boolean)),
    ];

    // Statuslar, fayllar va foydalanuvchilar — parallel batch yuklash.
    const [statusRows, fileRows, userRows] = await Promise.all([
      this.db
        .select({
          id: vacancy_application_statuses.id,
          vacancy_application_id:
            vacancy_application_statuses.vacancy_application_id,
          type: vacancy_application_statuses.type,
          status: vacancy_application_statuses.status,
          details: vacancy_application_statuses.details,
          message: vacancy_application_statuses.message,
        })
        .from(vacancy_application_statuses)
        .where(
          inArray(vacancy_application_statuses.vacancy_application_id, appIds),
        ),
      this.db
        .select({
          id: vacancy_application_files.id,
          vacancy_application_id:
            vacancy_application_files.vacancy_application_id,
          file_type: vacancy_application_files.file_type,
          file: vacancy_application_files.file,
        })
        .from(vacancy_application_files)
        .where(
          inArray(vacancy_application_files.vacancy_application_id, appIds),
        ),
      userIds.length
        ? this.db
            .select({
              id: vacancy_users.id,
              uuid: vacancy_users.uuid,
              last_name: vacancy_users.last_name,
              first_name: vacancy_users.first_name,
              middle_name: vacancy_users.middle_name,
              birthday: vacancy_users.birthday,
              pin: vacancy_users.pin,
              sex: vacancy_users.sex,
              education: vacancy_users.education,
              address: vacancy_users.address,
              photo: vacancy_users.photo,
              nationality_id: vacancy_users.nationality_id,
              country_id: vacancy_users.country_id,
              region_id: vacancy_users.region_id,
              city_id: vacancy_users.city_id,
              current_region_id: vacancy_users.current_region_id,
              current_city_id: vacancy_users.current_city_id,
            })
            .from(vacancy_users)
            .where(inArray(vacancy_users.id, userIds))
        : [],
    ]);

    // Map'lar.
    const statusMap = new Map<number, ApplicationStatusRow[]>();
    for (const s of statusRows) {
      const list = statusMap.get(s.vacancy_application_id) ?? [];
      list.push(s);
      statusMap.set(s.vacancy_application_id, list);
    }
    const fileMap = new Map<number, ApplicationFileRow[]>();
    for (const f of fileRows) {
      const list = fileMap.get(f.vacancy_application_id) ?? [];
      list.push(f);
      fileMap.set(f.vacancy_application_id, list);
    }
    const userMap = new Map<number, VacancyUserRow>();
    for (const u of userRows) userMap.set(u.id, u);

    return Promise.all(
      apps.map((app) =>
        mapShowApplication(
          app,
          userMap.get(app.vacancy_user_id) ?? null,
          statusMap.get(app.id) ?? [],
          fileMap.get(app.id) ?? [],
          this.i18n,
          lang,
          this.minio,
        ),
      ),
    );
  }

  // VacancyUserResource shaklidagi foydalanuvchilarni batch yuklab,
  // id → mapped user ko'rinishidagi Map qaytaradi (N+1 yo'q).
  private async loadVacancyUsersFull(
    ids: number[],
  ): Promise<Map<number, VacancyUserFull>> {
    const result = new Map<number, VacancyUserFull>();
    const userIds = [...new Set(ids.filter(Boolean))];
    if (userIds.length === 0) return result;

    const users = await this.db
      .select({
        id: vacancy_users.id,
        uuid: vacancy_users.uuid,
        last_name: vacancy_users.last_name,
        first_name: vacancy_users.first_name,
        middle_name: vacancy_users.middle_name,
        birthday: vacancy_users.birthday,
        pin: vacancy_users.pin,
        sex: vacancy_users.sex,
        education: vacancy_users.education,
        address: vacancy_users.address,
        photo: vacancy_users.photo,
        nationality_id: vacancy_users.nationality_id,
        country_id: vacancy_users.country_id,
        region_id: vacancy_users.region_id,
        city_id: vacancy_users.city_id,
        current_region_id: vacancy_users.current_region_id,
        current_city_id: vacancy_users.current_city_id,
      })
      .from(vacancy_users)
      .where(inArray(vacancy_users.id, userIds));
    if (users.length === 0) return result;

    // Bog'liq id larni yig'ish.
    const natIds = [
      ...new Set(
        users
          .map((u) => u.nationality_id)
          .filter((v): v is number => v != null),
      ),
    ];
    const countryIds = [
      ...new Set(
        users.map((u) => u.country_id).filter((v): v is number => v != null),
      ),
    ];
    const regionIds = [
      ...new Set(
        users
          .flatMap((u) => [u.region_id, u.current_region_id])
          .filter((v): v is number => v != null),
      ),
    ];
    const cityIds = [
      ...new Set(
        users
          .flatMap((u) => [u.city_id, u.current_city_id])
          .filter((v): v is number => v != null),
      ),
    ];

    // Bog'liq jadvallarni parallel batch yuklash.
    const [natRows, countryRows, regionRows, cityRows, careerRows, eduRows] =
      await Promise.all([
        natIds.length
          ? this.db
              .select({ id: nationalities.id, name: nationalities.name })
              .from(nationalities)
              .where(inArray(nationalities.id, natIds))
          : [],
        countryIds.length
          ? this.db
              .select({ id: countries.id, name: countries.name })
              .from(countries)
              .where(inArray(countries.id, countryIds))
          : [],
        regionIds.length
          ? this.db
              .select({ id: regions.id, name: regions.name })
              .from(regions)
              .where(inArray(regions.id, regionIds))
          : [],
        cityIds.length
          ? this.db
              .select({ id: cities.id, name: cities.name })
              .from(cities)
              .where(inArray(cities.id, cityIds))
          : [],
        this.db
          .select({
            id: vacancy_user_careers.id,
            vacancy_user_id: vacancy_user_careers.vacancy_user_id,
            from: vacancy_user_careers.from,
            to: vacancy_user_careers.to,
            position: vacancy_user_careers.position,
          })
          .from(vacancy_user_careers)
          .where(
            and(
              inArray(vacancy_user_careers.vacancy_user_id, userIds),
              notDeleted(vacancy_user_careers),
            ),
          ),
        this.db
          .select({
            id: vacancy_user_education.id,
            vacancy_user_id: vacancy_user_education.vacancy_user_id,
            from: vacancy_user_education.from,
            to: vacancy_user_education.to,
            university: vacancy_user_education.university,
          })
          .from(vacancy_user_education)
          .where(
            and(
              inArray(vacancy_user_education.vacancy_user_id, userIds),
              notDeleted(vacancy_user_education),
            ),
          ),
      ]);

    // Map'lar.
    const natMap = new Map<number, IdName>();
    for (const n of natRows) natMap.set(n.id, n);
    const countryMap = new Map<number, IdName>();
    for (const c of countryRows) countryMap.set(c.id, c);
    const regionMap = new Map<number, IdName>();
    for (const r of regionRows) regionMap.set(r.id, r);
    const cityMap = new Map<number, IdName>();
    for (const c of cityRows) cityMap.set(c.id, c);
    const careerMap = new Map<number, CareerRow[]>();
    for (const c of careerRows) {
      const list = careerMap.get(c.vacancy_user_id) ?? [];
      list.push(c);
      careerMap.set(c.vacancy_user_id, list);
    }
    const eduMap = new Map<number, EducationRow[]>();
    for (const e of eduRows) {
      const list = eduMap.get(e.vacancy_user_id) ?? [];
      list.push(e);
      eduMap.set(e.vacancy_user_id, list);
    }

    for (const u of users) {
      result.set(
        u.id,
        await mapUserFull(u, this.minio, {
          nationality:
            u.nationality_id != null
              ? (natMap.get(u.nationality_id) ?? null)
              : null,
          region:
            u.region_id != null ? (regionMap.get(u.region_id) ?? null) : null,
          city: u.city_id != null ? (cityMap.get(u.city_id) ?? null) : null,
          country:
            u.country_id != null
              ? (countryMap.get(u.country_id) ?? null)
              : null,
          currentRegion:
            u.current_region_id != null
              ? (regionMap.get(u.current_region_id) ?? null)
              : null,
          currentCity:
            u.current_city_id != null
              ? (cityMap.get(u.current_city_id) ?? null)
              : null,
          careers: careerMap.get(u.id) ?? [],
          educations: eduMap.get(u.id) ?? [],
        }),
      );
    }
    return result;
  }

  // POST /api/v1/hr/zoom/check-meet — stub.
  zoomCheckMeeting(meetingId: string) {
    // Laravel: ZoomController::checkMeeting — Zoom API integration.
    return {
      meeting_id: meetingId,
      available: true,
    };
  }

  // POST /api/v1/hr/vacancy/{id}/applications/{aid}/upload
  // Laravel: VacancyApplicationStatusController::uploadFileForStatus.
  // `type` bo'yicha statusni topadi (yo'q bo'lsa yaratadi), faylni MinIO'ga
  // yuklaydi va status.details.files massiviga {file_path, file_name} qo'shadi.
  async uploadApplicationFile(
    _vacancyId: number,
    applicationId: number,
    type: number,
    file: Express.Multer.File | undefined,
  ): Promise<void> {
    // Laravel: 'file' => 'required|file' (minio xizmatining xato uslubiga mos).
    if (!file) {
      throw new BusinessException(422, 'file_required');
    }

    const [existing] = await this.db
      .select({ id: vacancy_applications.id })
      .from(vacancy_applications)
      .where(eq(vacancy_applications.id, applicationId))
      .limit(1);
    if (!existing) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    // `type` bo'yicha statusni topish; yo'q bo'lsa — yangi status yaratish.
    let [statusRow] = await this.db
      .select({
        id: vacancy_application_statuses.id,
        details: vacancy_application_statuses.details,
      })
      .from(vacancy_application_statuses)
      .where(
        and(
          eq(
            vacancy_application_statuses.vacancy_application_id,
            applicationId,
          ),
          eq(vacancy_application_statuses.type, type),
          notDeleted(vacancy_application_statuses),
        ),
      )
      .limit(1);

    if (!statusRow) {
      [statusRow] = await this.db
        .insert(vacancy_application_statuses)
        .values({
          vacancy_application_id: applicationId,
          type,
          status: 1,
          created_at: sql`NOW()`,
          updated_at: sql`NOW()`,
        })
        .returning({
          id: vacancy_application_statuses.id,
          details: vacancy_application_statuses.details,
        });
    }

    // Faylni MinIO'ga yuklash — Laravel: uploadFormFile(..., 'vacancy-application-status', ...).
    const filePath = await this.minio.uploadFormFile(
      {
        originalname: file.originalname,
        buffer: file.buffer,
        mimetype: file.mimetype,
        size: file.size,
      },
      'vacancy-application-status',
      ['mp4', 'avi', 'pdf', 'png', 'jpeg', 'jpg', 'webp'],
    );

    // status.details.files massiviga {file_path, file_name} qo'shish.
    const raw = statusRow.details;
    const details: Record<string, unknown> =
      raw && typeof raw === 'object'
        ? { ...(raw as Record<string, unknown>) }
        : {};
    const existingFiles: unknown[] = Array.isArray(details.files)
      ? (details.files as unknown[])
      : [];
    details.files = [
      ...existingFiles,
      { file_path: filePath, file_name: file.originalname },
    ];

    await this.db
      .update(vacancy_application_statuses)
      .set({ details, updated_at: sql`NOW()` })
      .where(eq(vacancy_application_statuses.id, statusRow.id));
  }

  // POST /api/v1/hr/vacancy/{id}/applications/{aid}/create-meet — stub.
  async createMeet(_vacancyId: number, applicationId: number) {
    const [existing] = await this.db
      .select({ id: vacancy_applications.id })
      .from(vacancy_applications)
      .where(eq(vacancy_applications.id, applicationId))
      .limit(1);
    if (!existing) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    return {
      meeting_id: `meet-${applicationId}-${Date.now()}`,
      join_url: 'https://zoom.us/j/placeholder',
    };
  }

  // PUT /api/v1/hr/vacancy/{id}/applications/{aid}/attach-exam — stub.
  async attachExam(_vacancyId: number, applicationId: number, _examId: number) {
    const [existing] = await this.db
      .select({ id: vacancy_applications.id })
      .from(vacancy_applications)
      .where(eq(vacancy_applications.id, applicationId))
      .limit(1);
    if (!existing) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
  }

  // PUT /api/v1/hr/vacancy/{id}/applications/{aid}/detach-exam — stub.
  async detachExam(_vacancyId: number, applicationId: number) {
    const [existing] = await this.db
      .select({ id: vacancy_applications.id })
      .from(vacancy_applications)
      .where(eq(vacancy_applications.id, applicationId))
      .limit(1);
    if (!existing) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
  }

  // PUT /api/v1/hr/vacancy/{id}/applications/{aid}/update-exam — stub.
  async updateExam(_vacancyId: number, applicationId: number) {
    const [existing] = await this.db
      .select({ id: vacancy_applications.id })
      .from(vacancy_applications)
      .where(eq(vacancy_applications.id, applicationId))
      .limit(1);
    if (!existing) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
  }

  // PUT /api/v1/hr/vacancy/{id}/applications/{aid}/update — Laravel uses
  // updateApplicationStatus method (alias of update status).
  async updateApplication(
    vacancyId: number,
    applicationId: number,
    dto: UpdateApplicationStatusDto,
  ) {
    return this.updateApplicationStatus(vacancyId, applicationId, dto);
  }
}
