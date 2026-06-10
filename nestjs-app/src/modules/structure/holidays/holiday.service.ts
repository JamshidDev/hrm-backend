import { Injectable } from '@nestjs/common';
import { eq, sql, type SQL } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { holidays } from '@/db/schema';
import { paginate } from '@/common/pagination/paginate.util';
import { findByIdOrFail, softDeleteById } from '@/common/database/crud.helper';
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
    const month = filters.month ?? new Date().getMonth() + 1;
    const where = {
      deleted_at: { isNull: true as const },
      RAW: (t: typeof holidays): SQL =>
        sql`EXTRACT(MONTH FROM ${t.holiday_date}) = ${month}`,
    };

    return paginate({
      db: this.db,
      count: () =>
        this.db.$count(sql`(${this.db.query.holidays.findMany({ where })})`),
      query: ({ limit, offset }) =>
        this.db.query.holidays.findMany({ where, limit, offset }),
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
  }

  async update(id: number, dto: UpdateHolidayDto): Promise<void> {
    await findByIdOrFail(this.db, holidays, id, this.i18n);
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
    await findByIdOrFail(this.db, holidays, id, this.i18n);
    await softDeleteById(this.db, holidays, id);
  }
}
