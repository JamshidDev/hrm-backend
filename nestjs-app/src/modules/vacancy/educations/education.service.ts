// Education service. Laravel: Vacancy/VacancyUserEducationController.
// Vacancy nomzodining ta'lim ma'lumotlari ustida CRUD (vacancy_user_education jadvali).

import { Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { vacancy_user_education } from '@/db/schema';
import type {
  CreateEducationDto,
  UpdateEducationDto,
} from '@/modules/vacancy/educations/dto/education.dto';

@Injectable()
export class EducationService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  // GET — joriy foydalanuvchining barcha ta'lim yozuvlari.
  async list(userId: number) {
    return this.db
      .select()
      .from(vacancy_user_education)
      .where(
        and(
          eq(vacancy_user_education.vacancy_user_id, userId),
          notDeleted(vacancy_user_education),
        ),
      );
  }

  // POST — yangi ta'lim yozuvi.
  async create(userId: number, dto: CreateEducationDto) {
    await this.db.insert(vacancy_user_education).values({
      vacancy_user_id: userId,
      university: dto.university,
      from: dto.from,
      to: dto.to ?? null,
    });
  }

  // PUT — ta'lim yozuvini yangilash. Laravel findOrFail → topilmasa 404.
  async update(id: number, dto: UpdateEducationDto) {
    const [row] = await this.db
      .select({ id: vacancy_user_education.id })
      .from(vacancy_user_education)
      .where(eq(vacancy_user_education.id, id))
      .limit(1);
    if (!row) throw new BusinessException(404, 'not_found');

    const data: Record<string, unknown> = { updated_at: sql`NOW()` };
    if (dto.university !== undefined) data.university = dto.university;
    if (dto.from !== undefined) data.from = dto.from;
    if (dto.to !== undefined) data.to = dto.to;
    await this.db
      .update(vacancy_user_education)
      .set(data)
      .where(eq(vacancy_user_education.id, id));
  }

  // DELETE — soft-delete. Laravel findOrFail → topilmasa 404.
  async remove(id: number) {
    const [row] = await this.db
      .select({ id: vacancy_user_education.id })
      .from(vacancy_user_education)
      .where(eq(vacancy_user_education.id, id))
      .limit(1);
    if (!row) throw new BusinessException(404, 'not_found');
    await this.db
      .update(vacancy_user_education)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(vacancy_user_education.id, id));
  }
}
