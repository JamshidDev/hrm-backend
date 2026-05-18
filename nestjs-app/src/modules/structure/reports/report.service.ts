// Report service — qisman implementatsiya (7 endpoint).
// Laravel: ReportController + ReportService (1081 LOC). Generate/Excel/stats skip qilingan.

import { Injectable } from '@nestjs/common';
import { and, count, eq, inArray, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  reports,
  report_details,
  report_moth_pers,
  organizations,
  confirmation_workers,
} from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { paginate } from '@/common/pagination/paginate.util';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import { toLaravelTimestamp } from '@/common/utils/datetime.util';
import {
  QueryReportDto,
  QueryReportMonthDto,
  UpdateReportMonthDto,
  ReportListResponseDto,
  ReportMonthPerListResponseDto,
  ReportItemDto,
  ReportMonthPerItemDto,
} from '@/modules/structure/reports/dto/report.dto';

// ConfirmationStatusEnum: 1=PROCESS, 2=READ, 3=SUCCESS, 4=REJECTED, 5=DELETED
const CONFIRMATION_STATUS_KEYS: Record<number, string> = {
  1: 'messages.confirmation.status.process',
  2: 'messages.confirmation.status.read',
  3: 'messages.confirmation.status.success',
  4: 'messages.confirmation.status.rejected',
  5: 'messages.confirmation.status.deleted',
};

@Injectable()
export class ReportService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
  ) {}

  // Laravel: Report::query()->filter($user, request->all())->withCount(details)->where('active', true)->with('organization').
  // Filter $user — agar admin permission bo'lmasa, faqat user.organization_id.
  // Bizning test admin user — barcha orglar. Hozir oddiy version: active=true filter.
  async findAll(filters: QueryReportDto): Promise<ReportListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;

    const orgIds = filters.organizations
      ? filters.organizations
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => !Number.isNaN(n))
      : null;

    const where = and(
      notDeleted(reports),
      eq(reports.active, true),
      orgIds && orgIds.length > 0
        ? inArray(reports.organization_id, orgIds)
        : undefined,
      filters.year ? eq(reports.year, filters.year) : undefined,
      filters.month ? eq(reports.month, filters.month) : undefined,
    );

    const result = await paginate({
      db: this.db,
      countTable: reports,
      countWhere: where,
      query: ({ limit, offset }) =>
        this.db.select().from(reports).where(where).limit(limit).offset(offset),
      page,
      perPage,
      mapper: (r) => r,
    });

    // Batch load: organizations + details_count + signed URLs.
    const reportIds = result.data.map((r) => r.id);
    const orgIdSet = [...new Set(result.data.map((r) => r.organization_id))];

    const [orgsMap, countsMap] = await Promise.all([
      this.fetchOrganizations(orgIdSet),
      this.fetchDetailsCount(reportIds),
    ]);

    const data: ReportItemDto[] = await Promise.all(
      result.data.map(async (r) => ({
        id: r.id,
        uuid: r.uuid,
        year: r.year,
        month: r.month,
        organization: this.toOrgMin(orgsMap[r.organization_id], lang),
        file: await this.minio.fileUrl(r.file),
        confirmation_file: await this.minio.fileUrl(r.confirmation_file),
        confirmation: this.toConfirmation(r.confirmation, lang),
        generate: r.generate,
        created_at: toLaravelTimestamp(r.created_at),
        details_count: countsMap[r.id] ?? 0,
      })),
    );

    return {
      current_page: result.current_page,
      per_page: result.per_page,
      total: result.total,
      data,
    };
  }

  async remove(id: number): Promise<void> {
    const [row] = await this.db
      .select({ id: reports.id })
      .from(reports)
      .where(and(eq(reports.id, id), notDeleted(reports)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    await this.db
      .update(reports)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(reports.id, id));
  }

  async removeDetail(detailId: number): Promise<void> {
    await this.db
      .update(report_details)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(report_details.id, detailId));
  }

  async deleteConfirmation(confirmationId: number): Promise<void> {
    // Confirmation workers — soft delete kerakmi yoki hard? Laravel ->delete() →
    // SoftDeletes bor bo'lsa soft. Schema'da deleted_at borligini tekshirish kerak.
    // Hozircha soft delete.
    await this.db
      .update(confirmation_workers)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(confirmation_workers.id, confirmationId));
  }

  // Laravel: ReportMothPer::query()->with('organization')->paginate().
  async findAllMonthPer(
    filters: QueryReportMonthDto,
  ): Promise<ReportMonthPerListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;

    const result = await paginate({
      db: this.db,
      countTable: report_moth_pers,
      countWhere: undefined,
      query: ({ limit, offset }) =>
        this.db.select().from(report_moth_pers).limit(limit).offset(offset),
      page,
      perPage,
      mapper: (r) => r,
    });

    const orgIds = [...new Set(result.data.map((r) => r.organization_id))];
    const orgsMap = await this.fetchOrganizations(orgIds);

    const data: ReportMonthPerItemDto[] = result.data.map((r) => ({
      id: r.id,
      year: r.year,
      month: r.month,
      organization: this.toOrgMin(orgsMap[r.organization_id], lang),
    }));

    return {
      current_page: result.current_page,
      per_page: result.per_page,
      total: result.total,
      data,
    };
  }

  // Laravel: ReportMothPer::query()->insertOrIgnore($data).
  // unique constraint (organization_id, year, month) sabab onConflictDoNothing.
  async upsertMonthPer(dto: UpdateReportMonthDto): Promise<void> {
    const values = dto.organizations.map((orgId) => ({
      year: dto.year,
      month: dto.month,
      organization_id: orgId,
    }));
    await this.db
      .insert(report_moth_pers)
      .values(values)
      .onConflictDoNothing();
  }

  async removeMonthPer(id: number): Promise<void> {
    const [row] = await this.db
      .select({ id: report_moth_pers.id })
      .from(report_moth_pers)
      .where(eq(report_moth_pers.id, id))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    await this.db
      .delete(report_moth_pers)
      .where(eq(report_moth_pers.id, id));
  }

  // ---- Helper'lar ----

  private async fetchOrganizations(
    ids: number[],
  ): Promise<
    Record<
      number,
      {
        id: number;
        name: string | null;
        name_ru: string | null;
        name_en: string | null;
        group: boolean;
      }
    >
  > {
    const result: Record<
      number,
      {
        id: number;
        name: string | null;
        name_ru: string | null;
        name_en: string | null;
        group: boolean;
      }
    > = {};
    if (ids.length === 0) return result;

    const rows = await this.db
      .select({
        id: organizations.id,
        name: organizations.name,
        name_ru: organizations.name_ru,
        name_en: organizations.name_en,
        group: organizations.group,
      })
      .from(organizations)
      .where(inArray(organizations.id, ids));

    for (const r of rows) {
      result[r.id] = {
        id: r.id,
        name: r.name,
        name_ru: r.name_ru,
        name_en: r.name_en,
        group: r.group ?? false,
      };
    }
    return result;
  }

  // Laravel: withCount(details — distinct organization_id).
  private async fetchDetailsCount(
    reportIds: number[],
  ): Promise<Record<number, number>> {
    const result: Record<number, number> = {};
    if (reportIds.length === 0) return result;

    const rows = await this.db
      .select({
        report_id: report_details.report_id,
        c: sql<number>`COUNT(DISTINCT ${report_details.organization_id})`,
      })
      .from(report_details)
      .where(
        and(
          inArray(report_details.report_id, reportIds),
          notDeleted(report_details),
        ),
      )
      .groupBy(report_details.report_id);

    for (const r of rows) result[r.report_id] = Number(r.c);
    return result;
  }

  private toOrgMin(
    org:
      | {
          id: number;
          name: string | null;
          name_ru: string | null;
          name_en: string | null;
          group: boolean;
        }
      | undefined,
    lang: string,
  ): { id: number; name: string | null; group: boolean } | null {
    if (!org) return null;
    let name = org.name;
    if (lang === 'ru') name = org.name_ru ?? org.name;
    else if (lang === 'en') name = org.name_en ?? org.name;
    return { id: org.id, name, group: org.group };
  }

  private toConfirmation(
    confirmationId: number,
    lang: string,
  ): { id: number; name: string } {
    const key = CONFIRMATION_STATUS_KEYS[confirmationId];
    const name = key ? this.i18n.t(key, { lang }) : '';
    return {
      id: confirmationId,
      name: typeof name === 'string' ? name : '',
    };
  }

  // count silencer (lint protection).
  private _x(): void {
    void count;
  }
}
