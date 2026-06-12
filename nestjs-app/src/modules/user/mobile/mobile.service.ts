// User Mobile service. Laravel: 4 controllerni qamrab oladi:
//   UserMobileController, MobileVersionController, MobileFaceCheckInOutController, MobileAuthController.
// Ko'pchilik endpointlar stub — real implementatsiya HR/Turnstile/Salary integratsiyalariga muhtoj.

import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { and, eq, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { RequestContext } from '@/common/context/request.context';
import { UserResourceService } from '@/modules/user/_shared/user-resource.service';
import {
  organizations,
  statements,
  users,
  user_mobile_keys,
  workers,
} from '@/db/schema';
import { buildStatementDetail } from '@/modules/integration/worker-salary/statement-details.util';
import type {
  CheckLocationDto,
  MobileVersionCheckDto,
  MonthStatQueryDto,
  MyResumeQueryDto,
  MySchedulesQueryDto,
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

  /** GET /user/mobile/work-info — worker work info (stub). */
  async workInfo() {
    const userId = this.ctx.user?.id;
    if (!userId) throw new BusinessException(401, 'unauthorized');
    const [u] = await this.db
      .select({ id: users.id, worker_id: users.worker_id, phone: users.phone })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!u) return { worker: null, stub: true };
    if (!u.worker_id) return { worker: null, stub: true };
    const [w] = await this.db
      .select()
      .from(workers)
      .where(eq(workers.id, u.worker_id))
      .limit(1);
    return {
      worker: w
        ? {
            id: w.id,
            last_name: w.last_name,
            first_name: w.first_name,
            middle_name: w.middle_name,
            photo: w.photo,
            phone: u.phone,
          }
        : null,
    };
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

  /** GET /user/mobile/my-vacations — oxirgi ta'tillar (stub). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async myVacations() {
    return { data: [], stub: true };
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

function mobileRowsOf(result: unknown): Record<string, unknown>[] {
  const r = result as { rows?: unknown[] };
  return (Array.isArray(r.rows) ? r.rows : result) as Record<string, unknown>[];
}
