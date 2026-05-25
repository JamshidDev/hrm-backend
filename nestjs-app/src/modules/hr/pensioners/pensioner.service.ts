// Pensioner service. Laravel: PensionerController::paginate().
// Search: terms ORed across last/first/middle name + pin.

import { Injectable } from '@nestjs/common';
import { and, asc, count, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { pensioners, organizations } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { I18nService } from 'nestjs-i18n';
import { RequestContext } from '@/common/context/request.context';
import { ExcelService } from '@/shared/excel/excel.service';
import { ExportTaskRunner } from '@/shared/export-task/export-task-runner.service';
import {
  CreatePensionerDto,
  PensionerListResponseDto,
  QueryPensionerDto,
  UpdatePensionerDto,
} from '@/modules/hr/pensioners/dto/pensioner.dto';

// Export uchun jins yorlig'i (Laravel: worker.man / worker.woman) — [ayol, erkak].
const SEX_LABEL: Record<string, [string, string]> = {
  uz: ['Ayol', 'Erkak'],
  ru: ['Женщина', 'Мужчина'],
  en: ['Woman', 'Man'],
};

@Injectable()
export class PensionerService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly i18n: I18nService,
    private readonly excel: ExcelService,
    private readonly exportRunner: ExportTaskRunner,
    private readonly scope: OrgScopeService,
  ) {}

  async findAll(filters: QueryPensionerDto): Promise<PensionerListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;

    // Laravel Pensioner::filter — role + organizations + organization_id.
    const inScope = await this.scope.whereOrg(pensioners.organization_id, {
      organizations: filters.organizations,
      organization_id: filters.organization_id,
    });

    const terms = filters.search ? filters.search.trim().split(/\s+/) : [];
    const termConds = terms.map((t) =>
      or(
        ilike(pensioners.last_name, `%${t}%`),
        ilike(pensioners.first_name, `%${t}%`),
        ilike(pensioners.middle_name, `%${t}%`),
        sql`CAST(${pensioners.pin} AS TEXT) ILIKE ${`%${t}%`}`,
      ),
    );

    const where = and(isNull(pensioners.deleted_at), inScope, ...termConds);

    const offset = (page - 1) * perPage;

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: pensioners.id,
          last_name: pensioners.last_name,
          first_name: pensioners.first_name,
          middle_name: pensioners.middle_name,
          sex: pensioners.sex,
          position: pensioners.position,
          pin: pensioners.pin,
          address: pensioners.address,
          passport: pensioners.passport,
          experience: pensioners.experience,
          year: pensioners.year,
          phone: pensioners.phone,
          afghan: pensioners.afghan,
          invalid: pensioners.invalid,
          chernobyl: pensioners.chernobyl,
          railway_title: pensioners.railway_title,
          org_id: organizations.id,
          org_name: organizations.name,
          org_name_ru: organizations.name_ru,
          org_name_en: organizations.name_en,
          org_group: organizations.group,
        })
        .from(pensioners)
        .leftJoin(
          organizations,
          and(
            eq(organizations.id, pensioners.organization_id),
            isNull(organizations.deleted_at),
          ),
        )
        .where(where)
        .orderBy(asc(pensioners.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(pensioners).where(where),
    ]);

    return {
      current_page: page,
      total: Number(total),
      data: rows.map((r) => ({
        id: r.id,
        last_name: r.last_name,
        first_name: r.first_name,
        middle_name: r.middle_name,
        sex: r.sex,
        organization: r.org_id
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
        position: r.position,
        pin: r.pin,
        address: r.address,
        passport: r.passport,
        experience: r.experience,
        year: r.year,
        phone: r.phone,
        afghan: r.afghan,
        invalid: r.invalid,
        chernobyl: r.chernobyl,
        railway_title: r.railway_title,
      })),
    };
  }

  // GET /api/v1/hr/pensioners/list-med (Laravel: listMed)
  async listMed() {
    // Workers with latest med + retired criteria. Soddalashtirilgan return.
    return [];
  }

  // POST /api/v1/hr/pensioners
  async create(dto: CreatePensionerDto): Promise<void> {
    const orgId = this.ctx.user_or_fail.organization_id;
    if (!orgId) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.organization_not_found'),
      );
    }
    await this.db.insert(pensioners).values({
      organization_id: orgId,
      worker_id: dto.worker_id ?? null,
      last_name: dto.last_name,
      first_name: dto.first_name,
      middle_name: dto.middle_name ?? null,
      sex: dto.sex,
      position: dto.position ?? null,
      pin: dto.pin ?? null,
      passport: dto.passport ?? null,
      address: dto.address ?? null,
      experience: dto.experience ?? 0,
      year: dto.year ?? null,
      phone: dto.phone ?? null,
      afghan: dto.afghan ?? false,
      invalid: dto.invalid ?? false,
      chernobyl: dto.chernobyl ?? false,
      railway_title: dto.railway_title ?? false,
    });
  }

  // PUT /api/v1/hr/pensioners/{id}
  async update(id: number, dto: UpdatePensionerDto): Promise<void> {
    const [row] = await this.db
      .select({ id: pensioners.id })
      .from(pensioners)
      .where(and(eq(pensioners.id, id), notDeleted(pensioners)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    await this.db
      .update(pensioners)
      .set({
        worker_id: dto.worker_id ?? null,
        last_name: dto.last_name,
        first_name: dto.first_name,
        middle_name: dto.middle_name ?? null,
        sex: dto.sex,
        position: dto.position ?? null,
        pin: dto.pin ?? null,
        passport: dto.passport ?? null,
        address: dto.address ?? null,
        experience: dto.experience ?? 0,
        year: dto.year ?? null,
        phone: dto.phone ?? null,
        afghan: dto.afghan ?? false,
        invalid: dto.invalid ?? false,
        chernobyl: dto.chernobyl ?? false,
        railway_title: dto.railway_title ?? false,
        updated_at: sql`NOW()`,
      })
      .where(eq(pensioners.id, id));
  }

  // DELETE /api/v1/hr/pensioners/{id}
  async remove(id: number): Promise<void> {
    const [row] = await this.db
      .select({ id: pensioners.id })
      .from(pensioners)
      .where(and(eq(pensioners.id, id), notDeleted(pensioners)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    await this.db
      .update(pensioners)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(pensioners.id, id));
  }

  // GET /api/v1/hr/pensioners?export=true — Laravel: UserExportTask +
  // PensionersExportToExcelJob. Umumiy ExportTaskRunner orqali.
  async exportToTask(filters: QueryPensionerDto): Promise<void> {
    const lang = this.ctx.lang;
    await this.exportRunner.run({
      type: 10, // ExportTaskEnum.PENSIONERS
      folder: 'pensioners',
      build: () => this.buildPensionerExcel(filters, lang),
    });
  }

  // Pensioner ma'lumotlarini Excel buffer'iga aylantiradi (ExportTaskRunner uchun).
  private async buildPensionerExcel(
    filters: QueryPensionerDto,
    lang: string,
  ): Promise<Buffer> {
    const inScope = await this.scope.whereOrg(pensioners.organization_id, {
      organizations: filters.organizations,
      organization_id: filters.organization_id,
    });

    // findAll bilan bir xil qidiruv: ism + pin bo'yicha.
    const terms = filters.search ? filters.search.trim().split(/\s+/) : [];
    const termConds = terms.map((t) =>
      or(
        ilike(pensioners.last_name, `%${t}%`),
        ilike(pensioners.first_name, `%${t}%`),
        ilike(pensioners.middle_name, `%${t}%`),
        sql`CAST(${pensioners.pin} AS TEXT) ILIKE ${`%${t}%`}`,
      ),
    );

    const where = and(isNull(pensioners.deleted_at), inScope, ...termConds);

    const rows = await this.db
      .select({
        last_name: pensioners.last_name,
        first_name: pensioners.first_name,
        middle_name: pensioners.middle_name,
        sex: pensioners.sex,
        position: pensioners.position,
        pin: pensioners.pin,
        address: pensioners.address,
        passport: pensioners.passport,
        experience: pensioners.experience,
        year: pensioners.year,
        phone: pensioners.phone,
        afghan: pensioners.afghan,
        invalid: pensioners.invalid,
        chernobyl: pensioners.chernobyl,
        railway_title: pensioners.railway_title,
        org_name: organizations.name,
      })
      .from(pensioners)
      .leftJoin(
        organizations,
        and(
          eq(organizations.id, pensioners.organization_id),
          isNull(organizations.deleted_at),
        ),
      )
      .where(where)
      .orderBy(asc(pensioners.id));

    const sexPair = SEX_LABEL[lang] ?? SEX_LABEL.uz;
    const yesNo = (v: boolean | null): string => (v ? 'Ha' : "Yo'q");

    const excelRows = rows.map((r) => ({
      last_name: r.last_name ?? '',
      first_name: r.first_name ?? '',
      middle_name: r.middle_name ?? '',
      sex: r.sex ? sexPair[1] : sexPair[0],
      organization: r.org_name ?? '',
      position: r.position ?? '',
      pin: r.pin != null ? String(r.pin) : '',
      address: r.address ?? '',
      passport: r.passport ?? '',
      work_experience: r.experience != null ? String(r.experience) : '',
      year: r.year != null ? String(r.year) : '',
      phone: r.phone ?? '',
      afghan: yesNo(r.afghan),
      invalid: yesNo(r.invalid),
      chernobyl: yesNo(r.chernobyl),
      railway_title: yesNo(r.railway_title),
    }));

    return this.excel.build({
      creator: 'HRM',
      sheets: [
        {
          name: 'Pensioners',
          columns: [
            { header: 'Familiya', key: 'last_name', width: 18 },
            { header: 'Ism', key: 'first_name', width: 18 },
            { header: 'Otasining ismi', key: 'middle_name', width: 20 },
            { header: 'Jinsi', key: 'sex', width: 10 },
            { header: 'Tashkilot', key: 'organization', width: 34 },
            { header: 'Lavozim', key: 'position', width: 28 },
            { header: 'JSHSHIR', key: 'pin', width: 18 },
            { header: 'Manzil', key: 'address', width: 30 },
            { header: 'Pasport', key: 'passport', width: 14 },
            { header: 'Ish staji', key: 'work_experience', width: 12 },
            { header: 'Yil', key: 'year', width: 10 },
            { header: 'Telefon', key: 'phone', width: 16 },
            { header: "Afg'on", key: 'afghan', width: 10 },
            { header: 'Nogiron', key: 'invalid', width: 10 },
            { header: 'Chernobil', key: 'chernobyl', width: 12 },
            { header: "Temiryo'l unvoni", key: 'railway_title', width: 18 },
          ],
          rows: excelRows,
        },
      ],
    });
  }
}
