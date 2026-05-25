// WorkDay service. Laravel: WorkDayController.
// scopeFilter: schedule_id. scopeSearch: start_time / end_time (Laravel `whereTime` LIKE).
// with('schedule') eager load — schedule.work_days ham yuklab oladi (recursive).

import { Injectable } from '@nestjs/common';
import { and, eq, sql, type SQL } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { work_days } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { paginate } from '@/common/pagination/paginate.util';
import { notDeleted } from '@/common/database/soft-delete.helper';
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

    // Laravel `whereTime` SQL: WHERE EXTRACT(...) — bizda string compare ham ishlaydi (PG time → string).
    const where: SQL | undefined = and(
      notDeleted(work_days),
      filters.schedule_id
        ? eq(work_days.schedule_id, filters.schedule_id)
        : undefined,
      filters.start_time
        ? sql`CAST(${work_days.start_time} AS TEXT) ILIKE ${`%${filters.start_time}%`}`
        : undefined,
      filters.end_time
        ? sql`CAST(${work_days.end_time} AS TEXT) ILIKE ${`%${filters.end_time}%`}`
        : undefined,
    );

    return paginate({
      db: this.db,
      countTable: work_days,
      countWhere: where,
      query: ({ limit, offset }) =>
        this.db.query.work_days.findMany({
          where: {
            deleted_at: { isNull: true },
            ...(filters.schedule_id
              ? { schedule_id: filters.schedule_id }
              : {}),
          },
          with: {
            schedule: {
              with: {
                work_days: { where: { deleted_at: { isNull: true } } },
              },
            },
          },
          // Laravel ORDER BY ishlatmaydi — natural PG order parity uchun.
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
    await this.findById(id);
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
    await this.findById(id);
    await this.db
      .update(work_days)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(work_days.id, id));
  }

  private async findById(id: number) {
    const [row] = await this.db
      .select({ id: work_days.id })
      .from(work_days)
      .where(and(eq(work_days.id, id), notDeleted(work_days)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    return row;
  }
}
