import { Injectable } from '@nestjs/common';
import { and, eq, sql, type SQL } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { work_days } from '@/db/schema';
import { paginate } from '@/common/pagination/paginate.util';
import { findByIdOrFail, softDeleteById } from '@/common/database/crud.helper';
import { RequestContext } from '@/common/context/request.context';
import { WorkDayMapper } from '@/modules/structure/work-days/work-day.mapper';
import {
  QueryWorkDayDto,
  CreateWorkDayDto,
  UpdateWorkDayDto,
  WorkDayListResponseDto,
} from '@/modules/structure/work-days/dto/work-day.dto';

@Injectable()
export class WorkDayService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
  ) {}

  async findAll(filters: QueryWorkDayDto): Promise<WorkDayListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;
    const { schedule_id, start_time, end_time } = filters;

    const where = {
      deleted_at: { isNull: true as const },
      ...(schedule_id ? { schedule_id } : {}),
      ...(start_time || end_time
        ? {
            RAW: (t: typeof work_days): SQL =>
              and(
                start_time
                  ? sql`CAST(${t.start_time} AS TEXT) ILIKE ${`%${start_time}%`}`
                  : undefined,
                end_time
                  ? sql`CAST(${t.end_time} AS TEXT) ILIKE ${`%${end_time}%`}`
                  : undefined,
              )!,
          }
        : {}),
    };

    return paginate({
      db: this.db,
      count: () =>
        this.db.$count(sql`(${this.db.query.work_days.findMany({ where })})`),
      query: ({ limit, offset }) =>
        this.db.query.work_days.findMany({
          where,
          with: {
            schedule: {
              with: {
                work_days: { where: { deleted_at: { isNull: true } } },
              },
            },
          },
          limit,
          offset,
        }),
      page,
      perPage,
      mapper: (row) => WorkDayMapper.toItem(row, this.i18n, lang),
    });
  }

  async create(dto: CreateWorkDayDto): Promise<void> {
    await this.db.insert(work_days).values({
      schedule_id: dto.schedule_id,
      start_time: dto.start_time,
      end_time: dto.end_time,
      day_of_week: dto.day_of_week,
      type: dto.type,
    });
  }

  async update(id: number, dto: UpdateWorkDayDto): Promise<void> {
    await findByIdOrFail(this.db, work_days, id, this.i18n);

    await this.db
      .update(work_days)
      .set({
        schedule_id: dto.schedule_id,
        start_time: dto.start_time,
        end_time: dto.end_time,
        day_of_week: dto.day_of_week,
        type: dto.type,
      })
      .where(eq(work_days.id, id));
  }

  async remove(id: number): Promise<void> {
    await findByIdOrFail(this.db, work_days, id, this.i18n);
    await softDeleteById(this.db, work_days, id);
  }
}
