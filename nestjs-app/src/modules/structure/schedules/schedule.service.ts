import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { schedules } from '@/db/schema';
import { paginate } from '@/common/pagination/paginate.util';
import { findByIdOrFail, softDeleteById } from '@/common/database/crud.helper';
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
    const { search } = filters;
    const where = {
      deleted_at: { isNull: true as const },
      ...(search ? { name: { ilike: `%${search}%` } } : {}),
    };

    return paginate({
      db: this.db,
      count: () =>
        this.db.$count(sql`(${this.db.query.schedules.findMany({ where })})`),
      query: ({ limit, offset }) =>
        this.db.query.schedules.findMany({
          where,
          with: {
            work_days: {
              where: { deleted_at: { isNull: true } },
            },
          },
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
    await findByIdOrFail(this.db, schedules, id, this.i18n);

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
    await findByIdOrFail(this.db, schedules, id, this.i18n);
    await softDeleteById(this.db, schedules, id);
  }
}
