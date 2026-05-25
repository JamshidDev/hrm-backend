// TimeSheet service. Laravel: TimeSheet/TimeSheetController.
// scopeFilter: where user_id = current user.

import { Injectable } from '@nestjs/common';
import { and, asc, count, eq, isNull, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { time_sheets, departments, organizations } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import {
  CreateTimeSheetDto,
  QueryTimeSheetDto,
  TimeSheetItemDto,
  TimeSheetListResponseDto,
  UpdateTimeSheetDto,
} from '@/modules/timesheet/timesheet/dto/timesheet.dto';

const CONFIRMATION_STATUS_KEYS: Record<number, string> = {
  1: 'messages.confirmation.status.process',
  2: 'messages.confirmation.status.read',
  3: 'messages.confirmation.status.success',
  4: 'messages.confirmation.status.rejected',
  5: 'messages.confirmation.status.deleted',
};

@Injectable()
export class TimeSheetService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
  ) {}

  async findAll(filters: QueryTimeSheetDto): Promise<TimeSheetListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;
    const userId = this.ctx.user_or_fail.id;

    const where = and(
      isNull(time_sheets.deleted_at),
      eq(time_sheets.user_id, userId),
    );

    const offset = (page - 1) * perPage;

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: time_sheets.id,
          year: time_sheets.year,
          month: time_sheets.month,
          status: time_sheets.status,
          confirmation_file: time_sheets.confirmation_file,
          confirmation: time_sheets.confirmation,
          department_id: departments.id,
          department_name: departments.name,
          org_id: organizations.id,
          org_name: organizations.name,
          org_name_ru: organizations.name_ru,
          org_name_en: organizations.name_en,
          org_group: organizations.group,
          // Laravel TimeSheetController::index withCount('workers') chaqirmaydi
          // → $this->workers_count = null (parity).
          workers_count: sql<number | null>`NULL`,
        })
        .from(time_sheets)
        .leftJoin(departments, eq(departments.id, time_sheets.department_id))
        .leftJoin(
          organizations,
          and(
            eq(organizations.id, time_sheets.work_place_id),
            isNull(organizations.deleted_at),
          ),
        )
        .where(where)
        .orderBy(asc(time_sheets.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(time_sheets).where(where),
    ]);

    // Laravel paginate() javobida `per_page` yo'q — parity uchun qaytarmaymiz.
    return {
      current_page: page,
      total: Number(total),
      data: await Promise.all(rows.map((r) => this.toItem(r, lang))),
    };
  }

  async create(dto: CreateTimeSheetDto): Promise<void> {
    const userId = this.ctx.user_or_fail.id;
    await this.db.insert(time_sheets).values({
      user_id: userId,
      year: dto.year,
      month: dto.month,
      department_id: dto.department_id ?? null,
      work_place_id: dto.work_place_id ?? null,
    });
  }

  async update(id: number, dto: UpdateTimeSheetDto): Promise<void> {
    await this.assertExists(id);
    await this.db
      .update(time_sheets)
      .set({
        year: dto.year,
        month: dto.month,
        department_id: dto.department_id ?? null,
        work_place_id: dto.work_place_id ?? null,
      })
      .where(eq(time_sheets.id, id));
  }

  async accept(id: number): Promise<void> {
    // Laravel: excelGenerate + status=true. Excel generation skip — faqat status update.
    await this.assertExists(id);
    await this.db
      .update(time_sheets)
      .set({ status: true })
      .where(eq(time_sheets.id, id));
  }

  async remove(id: number): Promise<void> {
    await this.assertExists(id);
    await this.db
      .update(time_sheets)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(time_sheets.id, id));
  }

  // ---- helpers ----

  private async assertExists(id: number) {
    const [row] = await this.db
      .select({ id: time_sheets.id })
      .from(time_sheets)
      .where(and(eq(time_sheets.id, id), notDeleted(time_sheets)))
      .limit(1);
    if (!row)
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
  }

  private async toItem(
    r: {
      id: number;
      year: number;
      month: number;
      status: boolean;
      confirmation_file: string | null;
      confirmation: number;
      department_id: number | null;
      department_name: string | null;
      org_id: number | null;
      org_name: string | null;
      org_name_ru: string | null;
      org_name_en: string | null;
      org_group: boolean | null;
      workers_count: number | null;
    },
    lang: string,
  ): Promise<TimeSheetItemDto> {
    const confKey = CONFIRMATION_STATUS_KEYS[r.confirmation];
    const confLabel = confKey ? this.i18n.t(confKey, { lang }) : '';
    return {
      id: r.id,
      department: r.department_id
        ? { id: r.department_id, name: r.department_name }
        : null,
      work_place: r.org_id
        ? {
            id: r.org_id,
            name:
              lang === 'ru'
                ? (r.org_name_ru ?? r.org_name)
                : lang === 'en'
                  ? (r.org_name_en ?? r.org_name)
                  : r.org_name,
            group: r.org_group ?? false,
          }
        : null,
      year: r.year,
      month: r.month,
      status: r.status,
      confirmation_file: await this.minio.fileUrl(r.confirmation_file),
      confirmation: {
        id: r.confirmation,
        name: typeof confLabel === 'string' ? confLabel : '',
      },
      workers_count: r.workers_count,
    };
  }
}
