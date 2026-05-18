// Holiday service. Laravel: HolidayController.
// scopeSearch: whereMonth(holiday_date, ?month=N || current month).
// Default — current month bo'lib filter qiladi (Laravel default behavior).

import { Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { holidays } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { paginate } from '@/common/pagination/paginate.util';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { HolidayMapper } from '@/modules/structure/holidays/holiday.mapper';
import {
  QueryHolidayDto,
  CreateHolidayDto,
  UpdateHolidayDto,
  HolidayListResponseDto,
} from '@/modules/structure/holidays/dto/holiday.dto';

@Injectable()
export class HolidayService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
  ) {}

  async findAll(filters: QueryHolidayDto): Promise<HolidayListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;

    // Laravel: whereMonth('holiday_date', ?month=N || date('m')) — default current month.
    const month = filters.month ?? new Date().getMonth() + 1;

    const where = and(
      notDeleted(holidays),
      sql`EXTRACT(MONTH FROM ${holidays.holiday_date}) = ${month}`,
    );

    return paginate({
      db: this.db,
      countTable: holidays,
      countWhere: where,
      query: ({ limit, offset }) =>
        this.db
          .select()
          .from(holidays)
          .where(where)
          .limit(limit)
          .offset(offset),
      page,
      perPage,
      mapper: (h) => HolidayMapper.toItem(h, this.i18n, lang),
    });
  }

  async create(dto: CreateHolidayDto): Promise<void> {
    await this.db.insert(holidays).values({
      name: dto.name,
      name_ru: dto.name_ru ?? null,
      name_en: dto.name_en ?? null,
      holiday_date: dto.holiday_date,
      type: dto.type,
    });
    // Laravel: Cache::delete('days_in_month_YEAR_MONTH') — bizda Redis cache yo'q,
    // bu hozircha skip (kerak bo'lganda CacheModule qo'shamiz).
  }

  async update(id: number, dto: UpdateHolidayDto): Promise<void> {
    await this.findById(id);
    await this.db
      .update(holidays)
      .set({
        name: dto.name,
        name_ru: dto.name_ru ?? null,
        name_en: dto.name_en ?? null,
        holiday_date: dto.holiday_date,
        type: dto.type,
      })
      .where(eq(holidays.id, id));
  }

  async remove(id: number): Promise<void> {
    await this.findById(id);
    await this.db
      .update(holidays)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(holidays.id, id));
  }

  private async findById(id: number) {
    const [row] = await this.db
      .select({ id: holidays.id })
      .from(holidays)
      .where(and(eq(holidays.id, id), notDeleted(holidays)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    return row;
  }
}
