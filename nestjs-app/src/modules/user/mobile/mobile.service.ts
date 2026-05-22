// User Mobile service. Laravel: 4 controllerni qamrab oladi:
//   UserMobileController, MobileVersionController, MobileFaceCheckInOutController, MobileAuthController.
// Ko'pchilik endpointlar stub — real implementatsiya HR/Turnstile/Salary integratsiyalariga muhtoj.

import { Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { RequestContext } from '@/common/context/request.context';
import { users, user_mobile_keys, workers } from '@/db/schema';
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

  /** POST /user/mobile/update-password — change password (stub — bcrypt verify). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async updatePassword(_dto: UpdatePasswordDto) {
    return { success: true, stub: true };
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

  /** GET /user/mobile/my-schedules — workerning grafigi (stub). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async mySchedules(_q: MySchedulesQueryDto) {
    return { data: [], stub: true };
  }

  /** GET /user/mobile/personal-list — worker personal info (stub). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async personalList() {
    return { data: [], stub: true };
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

  /** GET /user/mobile/get-salary-months — oxirgi oylik oylar (stub). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async getSalaryMonths() {
    return { months: [], stub: true };
  }

  /** GET /user/mobile/get-salary — oylik tafsiloti (stub). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async getSalary(_q: SalaryQueryDto) {
    return { data: null, stub: true };
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
