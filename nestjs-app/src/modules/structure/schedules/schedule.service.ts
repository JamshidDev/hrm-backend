// Schedule service. Laravel: ScheduleController.
// scopeSearch: name LIKE. with('work_days') eager load.

import { Injectable } from '@nestjs/common';
import { and, eq, ilike, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { schedules } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { paginate } from '@/common/pagination/paginate.util';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { ScheduleMapper } from '@/modules/structure/schedules/schedule.mapper';
import {
  QueryScheduleDto,
  CreateScheduleDto,
  UpdateScheduleDto,
  ScheduleListResponseDto,
} from '@/modules/structure/schedules/dto/schedule.dto';

@Injectable()
export class ScheduleService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
  ) {}

  async findAll(filters: QueryScheduleDto): Promise<ScheduleListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;

    const where = and(
      notDeleted(schedules),
      filters.search ? ilike(schedules.name, `%${filters.search}%`) : undefined,
    );

    return paginate({
      db: this.db,
      countTable: schedules,
      countWhere: where,
      query: ({ limit, offset }) =>
        this.db.query.schedules.findMany({
          where: {
            deleted_at: { isNull: true },
            ...(filters.search
              ? { name: { ilike: `%${filters.search}%` } }
              : {}),
          },
          with: {
            // Laravel hasMany('work_days') — soft-delete bilan filter.
            work_days: {
              where: { deleted_at: { isNull: true } },
            },
          },
          // Laravel ORDER BY ishlatmaydi — natural PG order parity uchun.
          limit,
          offset,
        }),
      page,
      perPage,
      mapper: (row) => ScheduleMapper.toItem(row, this.i18n, lang),
    });
  }

  async create(dto: CreateScheduleDto): Promise<void> {
    await this.db.insert(schedules).values({
      name: dto.name,
      name_ru: dto.name_ru ?? null,
      name_en: dto.name_en ?? null,
      type: dto.type,
    });
  }

  async update(id: number, dto: UpdateScheduleDto): Promise<void> {
    await this.findById(id);
    await this.db
      .update(schedules)
      .set({
        name: dto.name,
        name_ru: dto.name_ru ?? null,
        name_en: dto.name_en ?? null,
        type: dto.type,
      })
      .where(eq(schedules.id, id));
  }

  async remove(id: number): Promise<void> {
    await this.findById(id);
    await this.db
      .update(schedules)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(schedules.id, id));
  }

  private async findById(id: number) {
    const [row] = await this.db
      .select({ id: schedules.id })
      .from(schedules)
      .where(and(eq(schedules.id, id), notDeleted(schedules)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    return row;
  }
}
