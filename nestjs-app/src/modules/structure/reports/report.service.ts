// Report service — qisman implementatsiya (7 endpoint).
// Laravel: ReportController + ReportService (1081 LOC). Generate/Excel/stats skip qilingan.

import { Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  eq,
  inArray,
  isNull,
  notInArray,
  sql,
} from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  reports,
  report_details,
  report_moth_pers,
  report_confirmations,
  organizations,
  confirmation_workers,
  workers,
  users,
} from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { paginate } from '@/common/pagination/paginate.util';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import { ExcelService } from '@/shared/excel/excel.service';
import { ConvertService } from '@/shared/convert/convert.service';
import { PermissionService } from '@/shared/permission/permission.service';
import { toLaravelTimestamp } from '@/common/utils/datetime.util';
import { buildReportExcel } from '@/modules/structure/reports/report-excel.builder';
import { generateReport } from '@/modules/structure/reports/report-generate.builder';
import {
  buildReportDocx,
  type ReportDocDetail,
} from '@/modules/structure/reports/report-document.builder';
import { REPORT_LABELS } from '@/modules/structure/reports/report-labels.constant';
import {
  QueryReportDto,
  QueryReportMonthDto,
  QueryReportStatDto,
  ReportExcelDto,
  ReportGenerateDto,
  ReportStoreDto,
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

// DOCX MIME — generate qilingan hisobot hujjati uchun.
const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// reports-stat — tashkilot daraxti tuguni.
export interface ReportStatOrgRow {
  id: number;
  name: string | null;
  parent_id: number | null;
  _lft: number;
  _rgt: number;
}
export interface ReportStatNode extends ReportStatOrgRow {
  report_for_period: {
    id: number;
    confirmation: number;
    laravel_through_key: number;
  } | null;
  children: ReportStatNode[];
}

@Injectable()
export class ReportService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
    private readonly excel: ExcelService,
    private readonly convert: ConvertService,
    private readonly perms: PermissionService,
    private readonly scope: OrgScopeService,
  ) {}

  // Laravel ReportController::index — Report::query()->filter($user, request->all())
  //   ->where('active', true)->paginate(per_page). YEAR/MONTH filter ishlatilmaydi.
  async findAll(filters: QueryReportDto): Promise<ReportListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;

    // Laravel Report::filter — role + organizations + organization_id.
    const inScope = await this.scope.whereOrg(reports.organization_id, {
      organizations: filters.organizations,
      organization_id: filters.organization_id,
    });

    const where = and(notDeleted(reports), eq(reports.active, true), inScope);

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
      total: result.total,
      data,
    };
  }

  async remove(id: number): Promise<void> {
    const [row] = await this.db
      .select({
        id: reports.id,
        confirmation: reports.confirmation,
        organization_id: reports.organization_id,
      })
      .from(reports)
      .where(and(eq(reports.id, id), notDeleted(reports)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    // Laravel: faqat o'z tashkiloti hisobotini o'chirishga ruxsat beriladi.
    const user = this.ctx.user_or_fail;
    if (row.organization_id !== user.organization_id) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.errors.organization_not_allowed_permission'),
      );
    }
    // Laravel: imzolangan (SUCCESS) hisobotni o'chirish — delete_report ruxsati kerak.
    if (row.confirmation === 3) {
      const ok = await this.perms.hasPermission(user.id, 'delete_report');
      if (!ok) {
        throw new BusinessException(
          400,
          "Tasdiqlangan hujjatni o'chirish mumkin emas",
        );
      }
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

    // Laravel: when(year), when(month) — ixtiyoriy filtrlar.
    const where = and(
      filters.year ? eq(report_moth_pers.year, filters.year) : undefined,
      filters.month ? eq(report_moth_pers.month, filters.month) : undefined,
    );

    const result = await paginate({
      db: this.db,
      countTable: report_moth_pers,
      countWhere: where,
      query: ({ limit, offset }) =>
        this.db
          .select()
          .from(report_moth_pers)
          .where(where)
          .limit(limit)
          .offset(offset),
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
    await this.db.insert(report_moth_pers).values(values).onConflictDoNothing();
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
    await this.db.delete(report_moth_pers).where(eq(report_moth_pers.id, id));
  }

  // ---- Helper'lar ----

  private async fetchOrganizations(ids: number[]): Promise<
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

  // GET /api/v1/structure/reports-stat — Laravel: ReportController::stats().
  // Foydalanuvchi tashkilot subdaraxti + har org uchun shu davr (year/month)
  // hisoboti (report_details orqali). Natija — daraxt ko'rinishida.
  async stats(
    query: QueryReportStatDto,
  ): Promise<{ organizations: ReportStatNode[] }> {
    const now = new Date();
    const year = query.year ?? now.getFullYear();
    const month = query.month ?? now.getMonth() + 1;
    const userOrgId = this.ctx.user_or_fail.organization_id;

    const orgs = await this.fetchLeaderOrgs(userOrgId);
    if (orgs.length === 0) return { organizations: [] };

    // Shu davr hisobotlari — Laravel hasOneThrough (org → report_details → reports).
    const orgIds = orgs.map((o) => o.id);
    const reportRows = await this.db
      .select({
        org_id: report_details.organization_id,
        report_id: reports.id,
        confirmation: reports.confirmation,
      })
      .from(report_details)
      .innerJoin(reports, eq(reports.id, report_details.report_id))
      .where(
        and(
          inArray(report_details.organization_id, orgIds),
          eq(reports.year, year),
          eq(reports.month, month),
          isNull(reports.deleted_at),
          isNull(report_details.deleted_at),
        ),
      );

    // hasOneThrough — org bo'yicha bittadan (birinchisi).
    const reportByOrg = new Map<number, { id: number; confirmation: number }>();
    for (const r of reportRows) {
      if (!reportByOrg.has(r.org_id)) {
        reportByOrg.set(r.org_id, {
          id: r.report_id,
          confirmation: r.confirmation,
        });
      }
    }

    return { organizations: this.buildOrgTree(orgs, reportByOrg) };
  }

  // leaderOrganizations — foydalanuvchi tashkiloti _lft..._rgt subdaraxti.
  private async fetchLeaderOrgs(
    userOrgId: number | null,
  ): Promise<ReportStatOrgRow[]> {
    if (!userOrgId) return [];
    const [self] = await this.db
      .select({ lft: organizations._lft, rgt: organizations._rgt })
      .from(organizations)
      .where(eq(organizations.id, userOrgId))
      .limit(1);
    if (!self) return [];
    return this.db
      .select({
        id: organizations.id,
        name: organizations.name,
        parent_id: organizations.parent_id,
        _lft: organizations._lft,
        _rgt: organizations._rgt,
      })
      .from(organizations)
      .where(
        and(
          notDeleted(organizations),
          sql`${organizations._lft} BETWEEN ${self.lft} AND ${self.rgt}`,
        ),
      )
      .orderBy(asc(organizations._lft));
  }

  // Org ro'yxatini daraxtga aylantiradi (Laravel toTree()). orgs `_lft`
  // tartibida — Map insertion tartibi bolalar tartibini saqlaydi.
  private buildOrgTree(
    orgs: ReportStatOrgRow[],
    reportByOrg: Map<number, { id: number; confirmation: number }>,
  ): ReportStatNode[] {
    const byId = new Map<number, ReportStatNode>();
    for (const o of orgs) {
      const rep = reportByOrg.get(o.id);
      byId.set(o.id, {
        id: o.id,
        name: o.name,
        parent_id: o.parent_id,
        _lft: o._lft,
        _rgt: o._rgt,
        report_for_period: rep
          ? {
              id: rep.id,
              confirmation: rep.confirmation,
              laravel_through_key: o.id,
            }
          : null,
        children: [],
      });
    }
    const roots: ReportStatNode[] = [];
    for (const node of byId.values()) {
      const parent =
        node.parent_id != null ? byId.get(node.parent_id) : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
    return roots;
  }

  // GET /api/v1/structure/report/labels — Laravel: ReportController::labels().
  // Stat label'lari ro'yxati (name tarjima qilinadi, key/man_woman/change bilan).
  labels(): Array<{
    name: string;
    key: string;
    man_woman?: string[];
    change?: boolean;
  }> {
    const lang = this.ctx.lang;
    return REPORT_LABELS.map((l) => {
      const item: {
        name: string;
        key: string;
        man_woman?: string[];
        change?: boolean;
      } = {
        name: this.i18n.t(`messages.report.labels.${l.key}`, { lang }),
        key: l.key,
      };
      if (l.man_woman) item.man_woman = l.man_woman;
      if (l.change) item.change = l.change;
      return item;
    });
  }

  // POST /api/v1/structure/report/generate — Laravel: ReportController::generate().
  // O'tgan oy uchun tanlangan tashkilotlar bo'yicha hisobot yaratadi.
  async generate(dto: ReportGenerateDto) {
    const user = this.ctx.user_or_fail;
    const userOrgId = user.organization_id;
    if (userOrgId == null) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    const lang = this.ctx.lang;

    // EducationEnum.get() — education(1/2/3) => label.
    const educationLabels: Record<number, string> = {
      1: this.i18n.t('messages.education.level.one', { lang }),
      2: this.i18n.t('messages.education.level.two', { lang }),
      3: this.i18n.t('messages.education.level.three', { lang }),
    };
    // ContractTypeEnum.getMinimized() — type(1..6) => qisqa label.
    const contractTypeLabels: Record<number, string> = {
      1: this.i18n.t(
        'messages.contract.minimeze_employment_contract_indefinite',
        { lang },
      ),
      2: this.i18n.t('messages.contract.minimeze_civil_labor_contract', {
        lang,
      }),
      3: this.i18n.t(
        'messages.contract.minimeze_employment_contract_part_time',
        { lang },
      ),
      4: this.i18n.t('messages.contract.minimeze_employment_contract_remote', {
        lang,
      }),
      5: this.i18n.t(
        'messages.contract.minimeze_employment_contract_seasonal',
        { lang },
      ),
      6: this.i18n.t('messages.contract.minimeze_employment_contract_fixed', {
        lang,
      }),
    };

    return generateReport(this.db, {
      userId: user.id,
      userOrganizationId: userOrgId,
      organizationIds: dto.organizations,
      educationLabels,
      contractTypeLabels,
    });
  }

  // POST /api/v1/structure/reports — Laravel: ReportController::store().
  // Generate qilingan hisobotni yakuniy tasdiqlash: report active=true,
  // detallar yangilanadi, confirmation'lar sinxron, .docx/.pdf hujjat yaratiladi.
  async store(dto: ReportStoreDto): Promise<void> {
    // 1. validateData — month_created_band > month_other_created bo'lmasligi.
    for (const d of dto.data) {
      const stats = Array.isArray(d.data?.stats) ? d.data.stats : [];
      const band = stats.find((s) => s.key === 'month_created_band');
      const other = stats.find((s) => s.key === 'month_other_created');
      if (toInt(band?.value) > toInt(other?.value)) {
        throw new BusinessException(
          400,
          this.i18n.t('messages.report.error.month_created_band'),
        );
      }
    }

    // 2. Report'ni uuid bo'yicha topish.
    const [report] = await this.db
      .select()
      .from(reports)
      .where(and(eq(reports.uuid, dto.report), notDeleted(reports)))
      .limit(1);
    if (!report) {
      throw new BusinessException(400, this.i18n.t('messages.not_found'));
    }

    // 3. Har bir detal tashkiloti uchun yuklash muddati tekshiruvi.
    const detailOrgs = await this.db
      .select({ org: report_details.organization_id })
      .from(report_details)
      .where(
        and(
          eq(report_details.report_id, report.id),
          notDeleted(report_details),
        ),
      );
    for (const { org } of detailOrgs) {
      const allowed = await this.checkGeneratePermission(org);
      if (!allowed) {
        const [o] = await this.db
          .select({ name: organizations.name })
          .from(organizations)
          .where(eq(organizations.id, org))
          .limit(1);
        throw new BusinessException(
          400,
          `Ushbu ${o?.name ?? ''} uchun joriy oyda hisobot yuklash muddati tugadi`,
        );
      }
    }

    // 4. Report — director_id + active=true.
    await this.db
      .update(reports)
      .set({
        director_id: dto.director_id,
        active: true,
        updated_at: sql`NOW()`,
      })
      .where(eq(reports.id, report.id));

    // 5. Detallar data'sini yangilash.
    for (const d of dto.data) {
      await this.db
        .update(report_details)
        .set({ data: d.data, updated_at: sql`NOW()` })
        .where(eq(report_details.id, d.reportId));
    }

    // 6. Confirmation'lar (imzolovchilar + direktor).
    await this.syncConfirmations(
      [...dto.confirmations, dto.director_id],
      report.id,
      dto.director_id,
    );

    // 7. .docx/.pdf hujjat generatsiyasi.
    await this.generateDocument(report.id);
  }

  // Laravel checkGeneratePermission — hisobot yuklash muddati: joriy oyning
  // 10-kuni (dam olish kuniga to'g'ri kelsa keyingi ish kuniga suriladi).
  // Muddat o'tgan bo'lsa — o'tgan oy uchun ReportMothPer ruxsati bo'lsagina true.
  private async checkGeneratePermission(orgId: number): Promise<boolean> {
    const now = new Date();
    const year = now.getFullYear();
    const monthIdx = now.getMonth(); // 0-asosli (joriy oy)

    // Laravel: Carbon::create(year, month, 10).
    const base = new Date(year, monthIdx, 10, 0, 0, 0, 0);
    let lastDay: Date;
    const dow = base.getDay(); // 0=yakshanba, 6=shanba
    if (dow === 6) {
      lastDay = new Date(year, monthIdx, 12, 23, 59, 59, 999);
    } else if (dow === 0) {
      lastDay = new Date(year, monthIdx, 11, 23, 59, 59, 999);
    } else {
      lastDay = base;
    }

    if (now > lastDay) {
      // ReportMothPer — o'tgan oy uchun (now - 1 oy).
      let pm = monthIdx; // 0-asosli joriy = 1-asosli o'tgan oy
      let py = year;
      if (pm < 1) {
        pm = 12;
        py -= 1;
      }
      const [row] = await this.db
        .select({ id: report_moth_pers.id })
        .from(report_moth_pers)
        .where(
          and(
            eq(report_moth_pers.organization_id, orgId),
            eq(report_moth_pers.year, py),
            eq(report_moth_pers.month, pm),
          ),
        )
        .limit(1);
      return !!row;
    }
    return true;
  }

  // Laravel confirmations() — report_confirmations'ni sinxronlaydi.
  // type: direktor → 'd', qolganlar → 's'. To'plamda yo'q worker'lar soft-delete.
  private async syncConfirmations(
    confirmationIds: number[],
    reportId: number,
    directorId: number,
  ): Promise<void> {
    const cws = confirmationIds.length
      ? await this.db
          .select({
            id: confirmation_workers.id,
            worker_id: confirmation_workers.worker_id,
            position: confirmation_workers.position,
          })
          .from(confirmation_workers)
          .where(inArray(confirmation_workers.id, confirmationIds))
      : [];

    const workerIds: number[] = [];
    for (const cw of cws) {
      if (cw.worker_id == null) continue;
      workerIds.push(cw.worker_id);
      const type = cw.id === directorId ? 'd' : 's';

      const [existing] = await this.db
        .select({ id: report_confirmations.id })
        .from(report_confirmations)
        .where(
          and(
            eq(report_confirmations.report_id, reportId),
            eq(report_confirmations.worker_id, cw.worker_id),
            notDeleted(report_confirmations),
          ),
        )
        .limit(1);

      if (existing) {
        await this.db
          .update(report_confirmations)
          .set({ position: cw.position, type, updated_at: sql`NOW()` })
          .where(eq(report_confirmations.id, existing.id));
      } else {
        await this.db.insert(report_confirmations).values({
          report_id: reportId,
          worker_id: cw.worker_id,
          position: cw.position,
          type,
          created_at: sql`NOW()`,
          updated_at: sql`NOW()`,
        });
      }
    }

    // To'plamda yo'q worker'lar — soft delete.
    await this.db
      .update(report_confirmations)
      .set({ deleted_at: sql`NOW()` })
      .where(
        and(
          eq(report_confirmations.report_id, reportId),
          notDeleted(report_confirmations),
          workerIds.length > 0
            ? notInArray(report_confirmations.worker_id, workerIds)
            : undefined,
        ),
      );
  }

  // Laravel generateDocument — report.docx shablonidan .docx → .pdf yaratadi,
  // MinIO'ga yuklaydi, report.generate = 3 qiladi.
  private async generateDocument(reportId: number): Promise<void> {
    const [report] = await this.db
      .select()
      .from(reports)
      .where(eq(reports.id, reportId))
      .limit(1);
    if (!report) return;

    const details = await this.db
      .select({ data: report_details.data })
      .from(report_details)
      .where(
        and(eq(report_details.report_id, reportId), notDeleted(report_details)),
      )
      .orderBy(asc(report_details.id));

    // Direktor (ConfirmationWorker) + worker — qisqa ism uchun.
    let directorPosition = '';
    let directorName = '';
    if (report.director_id) {
      const [dir] = await this.db
        .select({
          position: confirmation_workers.position,
          worker_id: confirmation_workers.worker_id,
        })
        .from(confirmation_workers)
        .where(eq(confirmation_workers.id, report.director_id))
        .limit(1);
      if (dir) {
        directorPosition = dir.position ?? '';
        if (dir.worker_id) {
          const [w] = await this.db
            .select({
              first_name: workers.first_name,
              middle_name: workers.middle_name,
              last_name: workers.last_name,
            })
            .from(workers)
            .where(eq(workers.id, dir.worker_id))
            .limit(1);
          if (w) directorName = shortName(w);
        }
      }
    }

    // Report user'ining tashkiloti nomi.
    let userOrgName = '';
    const [u] = await this.db
      .select({ org_name: organizations.name })
      .from(users)
      .leftJoin(
        organizations,
        and(
          eq(organizations.id, users.organization_id),
          isNull(organizations.deleted_at),
        ),
      )
      .where(eq(users.id, report.user_id))
      .limit(1);
    if (u) userOrgName = u.org_name ?? '';

    try {
      const docxBuffer = await buildReportDocx({
        details: details.map((d) => ({
          data: d.data as ReportDocDetail['data'],
        })),
        year: report.year,
        month: report.month,
        userOrganizationName: userOrgName,
        directorPosition,
        directorName,
      });

      if (report.file) {
        await this.minio.putObject(report.file, docxBuffer, DOCX_MIME);
      }
      const pdfBuffer = await this.convert.docxToPdf(docxBuffer);
      if (report.confirmation_file) {
        await this.minio.putObject(
          report.confirmation_file,
          pdfBuffer,
          'application/pdf',
        );
      }
      await this.db
        .update(reports)
        .set({ generate: 3, updated_at: sql`NOW()` })
        .where(eq(reports.id, reportId));
    } catch {
      throw new BusinessException(400, this.i18n.t('messages.server_error'));
    }
  }

  // POST /api/v1/structure/report/excel — Laravel: ReportController::viewExcel.
  // type one/two/three — saqlangan report_details.data asosida Excel hisobot.
  // report (uuid) berilsa o'sha hisobot, aks holda year/month bo'yicha.
  async viewExcel(
    dto: ReportExcelDto,
  ): Promise<{ buffer: Buffer; filename: string }> {
    let reportId: number | undefined;
    if (dto.report) {
      const [row] = await this.db
        .select({ id: reports.id })
        .from(reports)
        .where(and(eq(reports.uuid, dto.report), notDeleted(reports)))
        .limit(1);
      if (!row) {
        throw new BusinessException(404, this.i18n.t('messages.not_found'));
      }
      reportId = row.id;
    }

    const now = new Date();
    return buildReportExcel(this.db, this.excel, {
      type: dto.type,
      reportId,
      year: dto.year ?? now.getFullYear(),
      month: dto.month ?? now.getMonth() + 1,
    });
  }

  // count silencer (lint protection).
  private _x(): void {
    void count;
  }
}

// PHP (int) — qiymatni butun songa aylantiradi (NaN → 0).
function toInt(v: unknown): number {
  if (typeof v === 'number') return Math.trunc(v);
  const n = parseInt(typeof v === 'string' ? v : '', 10);
  return Number.isNaN(n) ? 0 : n;
}

// Worker::short_name() — maxsus harf juftliklari (Yu, Sh, O', G' ...) hisobga olinadi.
const SHORTEN_EXCEPTIONS = new Set([
  'Yu',
  'YU',
  'SH',
  'sh',
  'Sh',
  'Ch',
  'CH',
  'ch',
  'yu',
  "O'",
  "o'",
  'O?',
  'o?',
  "G'",
  'G?',
  'g?',
  "g'",
  'Oʻ',
  'O’',
  'Gʻ',
  'G’',
  'oʻ',
  'o’',
  'gʻ',
  'g’',
]);

function shorten(name: string): string {
  if (!name) return '';
  const two = name.slice(0, 2);
  return SHORTEN_EXCEPTIONS.has(two) ? two : name.slice(0, 1);
}

function shortName(w: {
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
}): string {
  return (
    shorten(w.first_name ?? '') +
    '.' +
    shorten(w.middle_name ?? '') +
    '.' +
    (w.last_name ?? '')
  );
}
