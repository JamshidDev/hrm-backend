// Career service. Laravel: Vacancy/VacancyUserCareerController.
// Vacancy nomzodining mehnat faoliyati (ish joylari) ustida CRUD.

import { Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { vacancy_user_careers } from '@/db/schema';
import type {
  CreateCareerDto,
  UpdateCareerDto,
} from '@/modules/vacancy/careers/dto/career.dto';

@Injectable()
export class CareerService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  // GET — joriy foydalanuvchining barcha career yozuvlari.
  async list(userId: number) {
    return this.db
      .select()
      .from(vacancy_user_careers)
      .where(
        and(
          eq(vacancy_user_careers.vacancy_user_id, userId),
          notDeleted(vacancy_user_careers),
        ),
      );
  }

  // POST — yangi career yozuvi.
  async create(userId: number, dto: CreateCareerDto) {
    await this.db.insert(vacancy_user_careers).values({
      vacancy_user_id: userId,
      position: dto.position,
      from: dto.from,
      to: dto.to ?? null,
    });
  }

  // PUT — career yozuvini yangilash. Laravel findOrFail → topilmasa 404.
  async update(id: number, dto: UpdateCareerDto) {
    const [row] = await this.db
      .select({ id: vacancy_user_careers.id })
      .from(vacancy_user_careers)
      .where(eq(vacancy_user_careers.id, id))
      .limit(1);
    if (!row) throw new BusinessException(404, 'not_found');

    const data: Record<string, unknown> = { updated_at: sql`NOW()` };
    if (dto.position !== undefined) data.position = dto.position;
    if (dto.from !== undefined) data.from = dto.from;
    if (dto.to !== undefined) data.to = dto.to;
    await this.db
      .update(vacancy_user_careers)
      .set(data)
      .where(eq(vacancy_user_careers.id, id));
  }

  // DELETE — soft-delete. Laravel findOrFail → topilmasa 404.
  async remove(id: number) {
    const [row] = await this.db
      .select({ id: vacancy_user_careers.id })
      .from(vacancy_user_careers)
      .where(eq(vacancy_user_careers.id, id))
      .limit(1);
    if (!row) throw new BusinessException(404, 'not_found');
    await this.db
      .update(vacancy_user_careers)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(vacancy_user_careers.id, id));
  }
}
