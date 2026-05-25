// Vacancy auth service. Laravel: Vacancy/VacancyUserController.
// Vacancy nomzodlari uchun alohida auth oqimi (vacancy_users jadvali).
//
// ESLATMA: Laravel `auth:vacancy` guard (Sanctum token) ishlatadi. Hozircha
// NestJS'da bu guard alohida bosqichda implement qilinadi — auth talab
// qiladigan endpointlar joriy foydalanuvchi id'sini RequestContext'dan oladi
// yoki stub bilan ishlaydi.

import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { and, eq, sql } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { vacancy_users } from '@/db/schema';
import type {
  VacancyLoginDto,
  VacancyOtpDto,
  VacancyRegisterDto,
  VacancyUpdateDto,
} from '@/modules/vacancy/vacancy-auth/dto/vacancy-auth.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class VacancyAuthService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
  ) {}

  // POST /v1/vacancies/login — telefon + parol bilan kirish, token qaytaradi.
  async login(dto: VacancyLoginDto) {
    const [user] = await this.db
      .select()
      .from(vacancy_users)
      .where(and(eq(vacancy_users.phone, dto.phone), notDeleted(vacancy_users)))
      .limit(1);
    if (!user) {
      throw new BusinessException(
        401,
        this.i18n.t('messages.invalid_credentials'),
      );
    }
    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new BusinessException(
        401,
        this.i18n.t('messages.invalid_credentials'),
      );
    }
    // Laravel: Sanctum token. Hozircha oddiy token formati.
    return {
      access_token: `vacancy-${user.id}-${Date.now()}`,
    };
  }

  // POST /v1/vacancies/token — OTP yuborish. Mavjud bo'lmasa yangi user yaratadi.
  // Laravel EskizService orqali SMS yuboradi; NestJS'da SMS stub.
  async sendOtp(dto: VacancyOtpDto) {
    const [existing] = await this.db
      .select()
      .from(vacancy_users)
      .where(eq(vacancy_users.phone, dto.phone))
      .limit(1);

    // OTP kodi — Laravel'da random_int(111111, 999999).
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const hashed = await bcrypt.hash(code, 10);

    if (existing) {
      if (existing.is_verified) {
        throw new BusinessException(
          400,
          this.i18n.t('messages.user_all_ready'),
        );
      }
      await this.db
        .update(vacancy_users)
        .set({
          password: hashed,
          phone: dto.phone,
          last_name: dto.last_name,
          first_name: dto.first_name,
          middle_name: dto.middle_name,
          // Laravel: phone_verified_at = now()+2min (OTP amal qilish muddati).
          phone_verified_at: sql`NOW() + INTERVAL '2 minutes'`,
        })
        .where(eq(vacancy_users.id, existing.id));
      return { user: existing.uuid };
    }

    const [created] = await this.db
      .insert(vacancy_users)
      .values({
        uuid: randomUUID(),
        password: hashed,
        phone: dto.phone,
        last_name: dto.last_name,
        first_name: dto.first_name,
        middle_name: dto.middle_name,
        phone_verified_at: sql`NOW() + INTERVAL '2 minutes'`,
      })
      .returning({ uuid: vacancy_users.uuid });
    return { user: created.uuid };
  }

  // POST /v1/vacancies/register — OTP tasdiqlash + parol o'rnatish.
  async register(dto: VacancyRegisterDto) {
    const [user] = await this.db
      .select()
      .from(vacancy_users)
      .where(eq(vacancy_users.uuid, dto.token))
      .limit(1);
    if (!user) {
      throw new BusinessException(400, this.i18n.t('messages.user_not_found'));
    }
    if (user.is_verified) {
      throw new BusinessException(400, this.i18n.t('messages.user_all_ready'));
    }
    // OTP kodi user.password ichida hash holatda saqlanadi.
    const otpValid = await bcrypt.compare(dto.otp, user.password);
    if (!otpValid) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.otp_code_not_verified'),
      );
    }
    const hashed = await bcrypt.hash(dto.password, 10);
    await this.db
      .update(vacancy_users)
      .set({ password: hashed, is_verified: true })
      .where(eq(vacancy_users.id, user.id));
    return { access_token: `vacancy-${user.id}-${Date.now()}` };
  }

  // GET /v1/vacancies/profile — joriy foydalanuvchi profili.
  async profile(userId: number) {
    const [user] = await this.db
      .select()
      .from(vacancy_users)
      .where(eq(vacancy_users.id, userId))
      .limit(1);
    if (!user) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    return {
      phone: user.phone,
      uuid: user.uuid,
      last_name: user.last_name,
      first_name: user.first_name,
      middle_name: user.middle_name,
      birthday: user.birthday,
      pin: user.pin,
      photo: user.photo,
      address: user.address,
      sex: user.sex,
      languages: user.languages,
      marital_status: { id: user.marital_status, name: '' },
      education: { id: Number(user.education), name: '' },
    };
  }

  // PUT /v1/vacancies/profile/update — profil maydonlarini yangilash.
  async update(userId: number, dto: VacancyUpdateDto) {
    const data: Record<string, unknown> = { updated_at: sql`NOW()` };
    if (dto.last_name !== undefined) data.last_name = dto.last_name;
    if (dto.first_name !== undefined) data.first_name = dto.first_name;
    if (dto.middle_name !== undefined) data.middle_name = dto.middle_name;
    if (dto.birthday !== undefined) data.birthday = dto.birthday;
    if (dto.sex !== undefined) data.sex = dto.sex;
    if (dto.education !== undefined) data.education = dto.education;
    if (dto.country_id !== undefined) data.country_id = dto.country_id;
    if (dto.city_id !== undefined) data.city_id = dto.city_id;
    if (dto.region_id !== undefined) data.region_id = dto.region_id;
    if (dto.current_region_id !== undefined)
      data.current_region_id = dto.current_region_id;
    if (dto.current_city_id !== undefined)
      data.current_city_id = dto.current_city_id;
    if (dto.nationality_id !== undefined)
      data.nationality_id = dto.nationality_id;
    if (dto.marital_status !== undefined)
      data.marital_status = dto.marital_status;
    if (dto.pin !== undefined) data.pin = dto.pin;
    if (dto.languages !== undefined) data.languages = dto.languages;
    if (dto.address !== undefined) data.address = dto.address;
    await this.db
      .update(vacancy_users)
      .set(data)
      .where(eq(vacancy_users.id, userId));
  }

  // POST /v1/vacancies/profile/update-photo — foto yangilash.
  // Laravel base64/form-file yuklaydi; NestJS'da photo path saqlanadi.
  async updatePhoto(userId: number, photo: string) {
    await this.db
      .update(vacancy_users)
      .set({ photo, updated_at: sql`NOW()` })
      .where(eq(vacancy_users.id, userId));
  }
}
