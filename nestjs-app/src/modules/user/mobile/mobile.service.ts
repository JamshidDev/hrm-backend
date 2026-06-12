// User Mobile service. Laravel: 4 controllerni qamrab oladi:
//   UserMobileController, MobileVersionController, MobileFaceCheckInOutController, MobileAuthController.
// Ko'pchilik endpointlar stub — real implementatsiya HR/Turnstile/Salary integratsiyalariga muhtoj.

import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { RequestContext } from '@/common/context/request.context';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { MinioService } from '@/shared/minio/minio.service';
import { UserResourceService } from '@/modules/user/_shared/user-resource.service';
import { getFullPosition } from '@/modules/hr/_shared/position-helper';
import {
  cities,
  contracts,
  countries,
  departments,
  languages as languagesTable,
  meds,
  nationalities,
  organization_disciplinaries,
  organization_incentives,
  organizations,
  positions as positionsTable,
  regions,
  specialities as specialitiesTable,
  statements,
  topics,
  universities as universitiesTable,
  users,
  user_mobile_keys,
  vacations,
  worker_exams,
  worker_languages,
  worker_old_careers,
  worker_passports,
  worker_phones,
  worker_positions,
  worker_relatives,
  worker_universities,
  exams,
  workers,
} from '@/db/schema';
import { buildStatementDetail } from '@/modules/integration/worker-salary/statement-details.util';
import type {
  CheckLocationDto,
  MobileVersionCheckDto,
  MonthStatQueryDto,
  MyResumeQueryDto,
  MySchedulesQueryDto,
  MyVacationsQueryDto,
  SalaryQueryDto,
  TurnstileEventsQueryDto,
  TurnstileStartLivenessDto,
  UpdateFcmDto,
  UpdatePasswordDto,
} from '@/modules/user/mobile/dto/mobile.dto';

@Injectable()
export class UserMobileService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly i18n: I18nService,
    private readonly userResource: UserResourceService,
    private readonly minio: MinioService,
  ) {}

  /** GET /user/mobile/enums — application_types, education_types. */
  enums() {
    return {
      application_types: [
        { id: 1, name: 'Ariza' },
        { id: 2, name: 'Hujjat so`rovi' },
      ],
      education_types: [
        { id: 1, name: 'Oliy' },
        { id: 2, name: 'O`rta-maxsus' },
      ],
    };
  }

  /** POST /user/mobile/version — version check (stub). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async version(_dto: MobileVersionCheckDto) {
    return {
      latest_version: '1.0.0',
      mandatory_update: false,
      message: '',
    };
  }

  /** GET /user/mobile/logout — Mobile JWT logout (stub). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async logout() {
    return { success: true, stub: true };
  }

  /**
   * POST /user/mobile/update-password — Laravel UserMobileService::changePassword.
   * Eski parol noto'g'ri → invalid_credentials_password (401).
   * To'g'ri bo'lsa: parolni bcrypt bilan yangilaydi + password_changed_at = now().
   */
  async updatePassword(dto: UpdatePasswordDto) {
    const userId = this.ctx.user_or_fail.id;
    const [u] = await this.db
      .select({ password: users.password })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // Laravel: Hash::check(old, current). PHP `$2y$` → Node bcrypt `$2b$`.
    const rawHash = u?.password ?? '$2b$12$fakeHashToPreventTimingAttack';
    const valid = await bcrypt.compare(
      dto.old_password,
      rawHash.replace(/^\$2y\$/, '$2b$'),
    );
    if (!valid) {
      throw new BusinessException(
        401,
        this.i18n.t('messages.invalid_credentials_password'),
      );
    }

    const hashed = await bcrypt.hash(dto.new_password, 12);
    await this.db
      .update(users)
      .set({
        password: hashed,
        password_changed_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      })
      .where(eq(users.id, userId));

    // Laravel changePassword: `return new UserResource($user)` — loadCount yo'q,
    // shuning uchun telegram_account null (profile'dan farqli).
    return this.userResource.build(userId, {
      mobile: this.ctx.auth_type === 'mobile',
      deviceUuid: this.ctx.device_uuid,
      telegramCount: false,
    });
  }

  /** POST /user/mobile/update-fcm — FCM token saqlash. */
  async updateFcm(dto: UpdateFcmDto) {
    const userId = this.ctx.user?.id;
    if (!userId) throw new BusinessException(401, 'unauthorized');
    if (dto.device_uuid) {
      await this.db
        .update(user_mobile_keys)
        .set({ fcm_token: dto.fcm_token, updated_at: sql`NOW()` })
        .where(
          and(
            eq(user_mobile_keys.user_id, userId),
            eq(user_mobile_keys.device_uuid, dto.device_uuid),
          ),
        );
    }
    return { success: true };
  }

  /**
   * GET /user/mobile/my-schedules — Laravel UserScheduleStatsService::mySchedules.
   * TurnstileWorkerSchedule WHERE worker_id + worker_position_id, date BETWEEN
   * [oy-01, keyingi-oy-01] (inclusive). → {date, start_time, end_time, is_work}.
   */
  async mySchedules(q: MySchedulesQueryDto) {
    const workerId = this.ctx.user_or_fail.worker_id;
    const now = new Date();
    const year = q.year ?? now.getUTCFullYear();
    const month = q.month ?? now.getUTCMonth() + 1;
    const mm = String(month).padStart(2, '0');
    const start = `${year}-${mm}-01`;
    // Laravel: $startDate->copy()->addMonth()->toDateString() — keyingi oy 1-kuni.
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const end = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

    // turnstile_worker_schedules — partitsiyalangan parent → raw SQL.
    const res = await this.db.execute(sql`
      SELECT date::text AS date, start_time, end_time, work_status
      FROM turnstile_worker_schedules
      WHERE worker_id = ${workerId}
        AND worker_position_id = ${q.worker_position_id}
        AND date BETWEEN ${start} AND ${end}
    `);
    return mobileRowsOf(res).map((s) => ({
      date: s.date as string,
      start_time: s.start_time as string | null,
      end_time: s.end_time as string | null,
      is_work: s.work_status as boolean | number | null,
    }));
  }

  /**
   * GET /user/mobile/personal-list — Laravel UserMobileService::workerInfoLabels.
   * Worker profil bo'limlari uchun i18n label'lar (DB so'rovi yo'q).
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async personalList() {
    const lang = this.ctx.lang;
    const t = (k: string) => this.i18n.t(`messages.mobile.${k}`, { lang });
    return {
      personal_information: t('personal_information'),
      careers: t('careers'),
      passport_information: t('passport_information'),
      educations: t('education'),
      relatives: t('relatives'),
      meds: t('meds'),
      vacations: t('vacations'),
      incentives: t('incentives'),
      disciplinary_actions: t('disciplinary_actions'),
      exams: t('exams'),
      salary: t('salary'),
    };
  }

  /**
   * GET /user/mobile/work-info — Laravel UserInfoService::buildWorkInfo.
   * To'liq xodim profili: personal/careers/passports/educations/relatives/
   * meds/vacations/incentives/disciplinary_actions/exams. Wrapped.
   */
  async workInfo() {
    const wid = this.ctx.user_or_fail.worker_id;
    if (wid == null)
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    const lang = this.ctx.lang;

    const [w] = await this.db
      .select()
      .from(workers)
      .where(eq(workers.id, wid))
      .limit(1);
    if (!w) throw new BusinessException(404, this.i18n.t('messages.not_found'));

    const name1 = (
      table:
        | typeof regions
        | typeof cities
        | typeof countries
        | typeof nationalities,
      id: number | null,
    ) =>
      id == null
        ? Promise.resolve([] as { name: string | null }[])
        : this.db
            .select({ name: table.name })
            .from(table)
            // Laravel relation'lar SoftDeletes scope qo'llaydi → o'chirilgan bo'lsa null.
            .where(and(eq(table.id, id), notDeleted(table)))
            .limit(1);

    const [
      nationalityRow,
      curRegionRow,
      curCityRow,
      bRegionRow,
      bCityRow,
      bCountryRow,
      phonesRows,
      languagesRows,
      passportsRows,
      universitiesRows,
      relativesRows,
      medsRows,
      vacationsRows,
      incentivesRows,
      disciplinaryRows,
      examsRows,
      oldCareersRows,
      positionsRows,
    ] = await Promise.all([
      name1(nationalities, w.nationality_id),
      name1(regions, w.current_region_id),
      name1(cities, w.current_city_id),
      name1(regions, w.region_id),
      name1(cities, w.city_id),
      name1(countries, w.country_id),
      this.db
        .select({ phone: worker_phones.phone })
        .from(worker_phones)
        .where(
          and(eq(worker_phones.worker_id, wid), notDeleted(worker_phones)),
        ),
      this.db
        .select({ name: languagesTable.name })
        .from(worker_languages)
        .leftJoin(
          languagesTable,
          eq(languagesTable.id, worker_languages.language_id),
        )
        // Laravel belongsToMany — pivot (worker_languages) soft-delete'ni
        // filtrlamaydi, shuning uchun notDeleted YO'Q.
        .where(eq(worker_languages.worker_id, wid)),
      this.db
        .select({
          serial_number: worker_passports.serial_number,
          from_date: worker_passports.from_date,
          to_date: worker_passports.to_date,
          address: worker_passports.address,
          file: worker_passports.file,
          created_at: worker_passports.created_at,
        })
        .from(worker_passports)
        .where(
          and(
            eq(worker_passports.worker_id, wid),
            notDeleted(worker_passports),
          ),
        ),
      this.db
        .select({
          speciality: specialitiesTable.name,
          university: universitiesTable.name,
          from_date: worker_universities.from_date,
          to_date: worker_universities.to_date,
          file: worker_universities.file,
        })
        .from(worker_universities)
        .leftJoin(
          universitiesTable,
          eq(universitiesTable.id, worker_universities.university_id),
        )
        .leftJoin(
          specialitiesTable,
          eq(specialitiesTable.id, worker_universities.speciality_id),
        )
        .where(
          and(
            eq(worker_universities.worker_id, wid),
            notDeleted(worker_universities),
          ),
        ),
      this.db
        .select({
          relative: worker_relatives.relative,
          birthday: worker_relatives.birthday,
          last_name: worker_relatives.last_name,
          first_name: worker_relatives.first_name,
          middle_name: worker_relatives.middle_name,
          birth_place: worker_relatives.birth_place,
          post_name: worker_relatives.post_name,
          address: worker_relatives.address,
        })
        .from(worker_relatives)
        .where(
          and(
            eq(worker_relatives.worker_id, wid),
            notDeleted(worker_relatives),
          ),
        )
        .orderBy(asc(worker_relatives.sort)),
      this.db
        .select({ from: meds.from, to: meds.to, status: meds.status })
        .from(meds)
        .where(and(eq(meds.worker_id, wid), notDeleted(meds))),
      this.db
        .select({
          type: vacations.type,
          from: vacations.from,
          to: vacations.to,
          work_day: vacations.work_day,
          rest_day: vacations.rest_day,
          all_day: vacations.all_day,
        })
        .from(vacations)
        .where(and(eq(vacations.worker_id, wid), notDeleted(vacations))),
      this.db
        .select({
          organization: organizations.name,
          number: organization_incentives.number,
          reason: organization_incentives.reason,
          by_whom: organization_incentives.by_whom,
          gift: organization_incentives.gift,
          date: organization_incentives.date,
        })
        .from(organization_incentives)
        .leftJoin(
          organizations,
          and(
            eq(organizations.id, organization_incentives.organization_id),
            isNull(organizations.deleted_at),
          ),
        )
        .where(
          and(
            eq(organization_incentives.worker_id, wid),
            notDeleted(organization_incentives),
          ),
        ),
      this.db
        .select({
          organization: organizations.name,
          number: organization_disciplinaries.number,
          reason: organization_disciplinaries.reason,
          fine: organization_disciplinaries.fine,
          date: organization_disciplinaries.date,
        })
        .from(organization_disciplinaries)
        .leftJoin(
          organizations,
          and(
            eq(organizations.id, organization_disciplinaries.organization_id),
            isNull(organizations.deleted_at),
          ),
        )
        .where(
          and(
            eq(organization_disciplinaries.worker_id, wid),
            notDeleted(organization_disciplinaries),
          ),
        ),
      this.db
        .select({
          we_created: worker_exams.created,
          we_ended: worker_exams.ended,
          we_result: worker_exams.result,
          e_id: exams.id,
          e_name: exams.name,
          e_whom: exams.whom,
          e_deadline: exams.deadline,
          e_variant: exams.variant,
          e_minute: exams.minute,
          e_tests_count: exams.tests_count,
          e_chances: exams.chances,
          e_active: exams.active,
          e_description: exams.description,
          t_id: topics.id,
          t_name: topics.name,
          t_type: topics.type,
        })
        .from(worker_exams)
        .leftJoin(exams, eq(exams.id, worker_exams.exam_id))
        .leftJoin(topics, eq(topics.id, exams.topic_id))
        .where(and(eq(worker_exams.worker_id, wid), notDeleted(worker_exams))),
      this.db
        .select({
          from_date: worker_old_careers.from_date,
          to_date: worker_old_careers.to_date,
          post_name: worker_old_careers.post_name,
          sort: worker_old_careers.sort,
        })
        .from(worker_old_careers)
        .where(
          and(
            eq(worker_old_careers.worker_id, wid),
            notDeleted(worker_old_careers),
          ),
        ),
      this.db
        .select({
          id: worker_positions.id,
          position_date: worker_positions.position_date,
          to: worker_positions.to,
          contract_id: worker_positions.contract_id,
          org_id: organizations.id,
          org_name: organizations.name,
          org_name_ru: organizations.name_ru,
          org_name_en: organizations.name_en,
          org_group: organizations.group,
          org_full_name: organizations.full_name,
          dept_id: departments.id,
          dept_name: departments.name,
          dept_level: departments.level,
          pos_id: positionsTable.id,
          pos_name: positionsTable.name,
          pos_name_ru: positionsTable.name_ru,
          pos_name_en: positionsTable.name_en,
          contract_to_date: contracts.contract_to_date,
        })
        .from(worker_positions)
        .leftJoin(
          organizations,
          and(
            eq(organizations.id, worker_positions.organization_id),
            isNull(organizations.deleted_at),
          ),
        )
        .leftJoin(
          departments,
          eq(departments.id, worker_positions.department_id),
        )
        .leftJoin(
          positionsTable,
          eq(positionsTable.id, worker_positions.position_id),
        )
        .leftJoin(contracts, eq(contracts.id, worker_positions.contract_id))
        .where(
          and(
            eq(worker_positions.worker_id, wid),
            eq(worker_positions.status, 2),
            notDeleted(worker_positions),
          ),
        ),
    ]);

    const spelled = [
      'one',
      'two',
      'three',
      'four',
      'five',
      'six',
      'seven',
      'eight',
      'nine',
      'ten',
      'eleven',
      'twelve',
      'thirteen',
      'fourteen',
      'fifteen',
    ];
    const enumName = (group: string, v: number | null, max: number): string => {
      if (v == null || v < 1 || v > max) return '';
      return this.i18n.t(`messages.${group}.${spelled[v - 1]}`, { lang });
    };

    return {
      personal_information: {
        last_name: w.last_name,
        first_name: w.first_name,
        middle_name: w.middle_name,
        birthday: w.birthday,
        photo: await this.minio.fileUrl(w.photo),
        pin: w.pin,
        nationality: nationalityRow[0]?.name ?? null,
        current_region: curRegionRow[0]?.name ?? null,
        current_city: curCityRow[0]?.name ?? null,
        current_address: w.address,
        birthday_city: bCityRow[0]?.name ?? null,
        birthday_region: bRegionRow[0]?.name ?? null,
        birthday_country: bCountryRow[0]?.name ?? null,
        phones: phonesRows.map((p) => p.phone),
        languages: languagesRows.map((l) => l.name).filter((n) => n != null),
        marital_status: enumName('worker.marital_status', w.marital_status, 3),
      },
      careers: {
        new_careers: this.buildPositions(positionsRows, lang),
        old_careers: [...oldCareersRows]
          .sort((a, b) => (b.sort ?? 0) - (a.sort ?? 0))
          .map((c) => ({
            from_date: c.from_date,
            to_date: c.to_date,
            post_name: c.post_name,
          })),
      },
      passport_information: {
        passports: await Promise.all(
          [...passportsRows]
            .sort((a, b) =>
              String(b.created_at ?? '').localeCompare(
                String(a.created_at ?? ''),
              ),
            )
            .map(async (p) => ({
              serial_number: p.serial_number,
              from_date: p.from_date,
              to_date: p.to_date,
              address: p.address,
              file: await this.minio.fileUrl(p.file),
            })),
        ),
      },
      educations: await Promise.all(
        universitiesRows.map(async (u) => ({
          speciality: u.speciality ?? null,
          university: u.university ?? null,
          from_date: u.from_date,
          to_date: u.to_date,
          file: await this.minio.fileUrl(u.file),
        })),
      ),
      relatives: relativesRows.map((r) => ({
        relative: enumName('worker.family', r.relative, 15),
        birthday: r.birthday,
        last_name: r.last_name,
        first_name: r.first_name,
        middle_name: r.middle_name,
        birth_place: r.birth_place,
        post_name: r.post_name,
        address: r.address,
      })),
      meds: medsRows.map((m) => ({
        from: m.from,
        to: m.to,
        status: enumName('worker.med', m.status, 2),
      })),
      vacations: vacationsRows.map((v) => ({
        type: this.vacationTypeName(v.type),
        from: v.from,
        to: v.to,
        work_day: v.work_day,
        rest_day: v.rest_day,
        all_day: v.all_day,
      })),
      incentives: incentivesRows.map((i) => ({
        organization: i.organization ?? null,
        number: i.number,
        reason: i.reason,
        by_whom: i.by_whom,
        gift: i.gift,
        date: i.date,
      })),
      disciplinary_actions: disciplinaryRows.map((d) => ({
        organization: d.organization ?? null,
        number: d.number,
        reason: d.reason,
        fine: d.fine,
        date: d.date,
      })),
      exams: examsRows.map((e) => ({
        exam_name: e.e_name ?? null,
        created: e.we_created,
        ended: e.we_ended,
        result: e.we_result,
        exam: e.e_id
          ? {
              id: e.e_id,
              name: e.e_name,
              whom: {
                id: e.e_whom,
                name: enumName('exam.exam_whom', e.e_whom, 5),
              },
              topic: e.t_id
                ? {
                    id: e.t_id,
                    name: e.t_name,
                    type: {
                      id: e.t_type,
                      name: enumName('exam.exam_types', e.t_type, 4),
                    },
                  }
                : null,
              deadline: e.e_deadline,
              variant: e.e_variant,
              minute: e.e_minute,
              tests_count: e.e_tests_count,
              chances: e.e_chances,
              active: e.e_active,
              description: e.e_description,
            }
          : null,
      })),
    };
  }

  // Laravel WorkerPositionService::positions — sortBy position_date,
  // `to` ni keyingi pozitsiya/shartnoma sanasidan aniqlaydi.
  private buildPositions(
    rows: WorkInfoPositionRow[],
    lang: string,
  ): Record<string, unknown>[] {
    const byDate = [...rows].sort((a, b) =>
      String(a.position_date ?? '').localeCompare(
        String(b.position_date ?? ''),
      ),
    );
    return byDate.map((p) => {
      let to: string | null;
      if (p.to) {
        to = p.to;
      } else {
        const next = rows
          .filter((x) => x.id > p.id)
          .sort((a, b) => a.id - b.id)[0];
        if (next) {
          to =
            next.contract_id === p.contract_id
              ? next.position_date
              : p.contract_to_date;
        } else {
          to = null;
        }
      }
      return {
        id: p.id,
        organization: p.org_id
          ? {
              id: p.org_id,
              name: this.langName(
                p.org_name,
                p.org_name_ru,
                p.org_name_en,
                lang,
              ),
              group: p.org_group,
            }
          : null,
        department: p.dept_id
          ? { id: p.dept_id, name: p.dept_name, level: p.dept_level }
          : null,
        position: p.pos_id
          ? {
              id: p.pos_id,
              // Laravel eager-load `positions.position:id,name` — name_ru/name_en
              // yuklanmaydi → ru/en'da null (PositionMinimalResource fallback'siz).
              name: this.langName(p.pos_name, null, null, lang),
            }
          : null,
        full_position: getFullPosition({
          position_name: p.pos_name,
          department_name: p.dept_name,
          department_level: p.dept_level,
          organization_full_name: p.org_full_name,
        }),
        from: p.position_date,
        to,
      };
    });
  }

  // Laravel OrganizationListResource / PositionMinimalResource — match($lang)
  // fallback'siz (name_ru/name_en null bo'lsa null qaytadi).
  private langName(
    name: string | null,
    nameRu: string | null,
    nameEn: string | null,
    lang: string,
  ): string | null {
    if (lang === 'ru') return nameRu;
    if (lang === 'en') return nameEn;
    return name;
  }

  /** GET /user/mobile/documents — worker documents (stub). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async documents() {
    return { documents: [], stub: true };
  }

  /** GET /user/mobile/turnstile-events — kirish/chiqish (stub). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async turnstileEvents(_q: TurnstileEventsQueryDto) {
    return { data: [], stub: true };
  }

  // Auth user'ning worker pin'i (Laravel $user->worker?->pin).
  private async workerPin(): Promise<number | null> {
    const wid = this.ctx.user_or_fail.worker_id;
    if (!wid) return null;
    const [w] = await this.db
      .select({ pin: workers.pin })
      .from(workers)
      .where(eq(workers.id, wid))
      .limit(1);
    return w?.pin ?? null;
  }

  /**
   * GET /user/mobile/get-salary-months — Laravel UserMobileService::salaryMonths.
   * Statement WHERE pin = worker.pin, distinct (year, month). Wrapped.
   */
  async getSalaryMonths() {
    const pin = await this.workerPin();
    if (pin == null) return [];
    return this.db
      .select({ year: statements.year, month: statements.month })
      .from(statements)
      .where(eq(statements.pin, pin))
      .groupBy(statements.year, statements.month);
  }

  /**
   * GET /user/mobile/get-salary — Laravel UserMobileService::salary.
   * Statement WHERE pin AND year AND month → buildDetails. FLAT {salary:[...]}.
   */
  async getSalary(q: SalaryQueryDto) {
    const pin = await this.workerPin();
    const rows =
      pin == null
        ? []
        : await this.db
            .select({
              stmt: statements,
              org_full: organizations.full_name,
              org_name: organizations.name,
            })
            .from(statements)
            .leftJoin(
              organizations,
              eq(organizations.id, statements.organization_id),
            )
            .where(
              and(
                eq(statements.pin, pin),
                eq(statements.year, q.year),
                eq(statements.month, q.month),
              ),
            );
    const lang = this.ctx.lang;
    return {
      salary: rows.map((r) =>
        buildStatementDetail(r.stmt, r.org_full, r.org_name, lang),
      ),
    };
  }

  /**
   * GET /user/mobile/my-vacations — Laravel VacationService::getMyLatestVacation.
   * WorkerPosition WHERE worker_id=user.worker_id AND id=worker_position_id (findOrFail→404)
   * → Vacation WHERE worker_id, latest(id). Yo'q bo'lsa []. Wrapped.
   */
  async myVacations(q: MyVacationsQueryDto) {
    const userWorkerId = this.ctx.user_or_fail.worker_id;
    const wpId = q.worker_position_id ?? null;
    const notFound = () =>
      new BusinessException(404, this.i18n.t('messages.not_found'));
    if (userWorkerId == null || wpId == null) throw notFound();
    // findOrFail: pozitsiya foydalanuvchining worker'iga tegishli bo'lishi shart.
    const [wp] = await this.db
      .select({ id: worker_positions.id })
      .from(worker_positions)
      .where(
        and(
          eq(worker_positions.worker_id, userWorkerId),
          eq(worker_positions.id, wpId),
        ),
      )
      .limit(1);
    if (!wp) throw notFound();

    // WP worker_id = user.worker_id (yuqorida shu bilan filtrlangan).
    const [v] = await this.db
      .select()
      .from(vacations)
      .where(eq(vacations.worker_id, userWorkerId))
      .orderBy(desc(vacations.id))
      .limit(1);
    if (!v) return [];

    return {
      all_day: v.all_day,
      type: {
        id: v.type,
        name: this.vacationTypeName(v.type),
      },
      period_from: v.period_from,
      period_to: v.period_to,
      from: v.from,
      to: v.to,
      rest_day: v.rest_day,
    };
  }

  // Laravel VacationTypeEnum::get — command-type qiymatini ta'til turi nomiga map qiladi.
  private vacationTypeName(type: number): string {
    // CommandType → vacation type kaliti (1..8).
    const map: Record<number, string> = {
      41: 'one',
      42: 'one',
      43: 'one',
      44: 'one',
      46: 'one',
      45: 'three',
      49: 'three',
      48: 'two',
      51: 'five',
      52: 'four',
      53: 'seven',
      55: 'six',
    };
    const key = map[type] ?? 'eight';
    return this.i18n.t(`messages.vacations.types.${key}`, {
      lang: this.ctx.lang,
    });
  }

  /** GET /user/mobile/my-resume — resume PDF (stub binary, hozir JSON). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async myResume(_q: MyResumeQueryDto) {
    return { success: true, stub: true, url: '' };
  }

  /** GET /user/mobile/last-event — face check-in/out so'nggi event (stub). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async lastEvent() {
    return { last_event: null, stub: true };
  }

  /** POST /user/mobile/check-location — manzilni tekshirish (stub). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async checkLocation(_dto: CheckLocationDto) {
    return { is_allowed: true, distance_m: 0, stub: true };
  }

  /** POST /user/mobile/turnstile-start-liveness — face liveness boshlash (stub). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async turnstileStartLiveness(_dto: TurnstileStartLivenessDto) {
    return { session_id: 'stub-uuid', success: true, stub: true };
  }

  /** GET /user/mobile/turnstile-stats — bugungi smena/stats (stub). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async turnstileStats() {
    return { today: null, stub: true };
  }

  /** GET /user/mobile/turnstile-show-stats — oylik stats (stub). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async turnstileShowStats(_q: MonthStatQueryDto) {
    return { data: [], stub: true };
  }
}

interface WorkInfoPositionRow {
  id: number;
  position_date: string | null;
  to: string | null;
  contract_id: number | null;
  org_id: number | null;
  org_name: string | null;
  org_name_ru: string | null;
  org_name_en: string | null;
  org_group: boolean | null;
  org_full_name: string | null;
  dept_id: number | null;
  dept_name: string | null;
  dept_level: number | null;
  pos_id: number | null;
  pos_name: string | null;
  pos_name_ru: string | null;
  pos_name_en: string | null;
  contract_to_date: string | null;
}

function mobileRowsOf(result: unknown): Record<string, unknown>[] {
  const r = result as { rows?: unknown[] };
  return (Array.isArray(r.rows) ? r.rows : result) as Record<string, unknown>[];
}
