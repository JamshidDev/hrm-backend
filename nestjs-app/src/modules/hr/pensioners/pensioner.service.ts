// Pensioner service. Laravel: PensionerController::paginate().
// Search: terms ORed across last/first/middle name + pin.

import { Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  sql,
} from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { pensioners, organizations, meds } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { I18nService } from 'nestjs-i18n';
import { RequestContext } from '@/common/context/request.context';
import {
  CreatePensionerDto,
  PensionerListResponseDto,
  QueryPensionerDto,
  UpdatePensionerDto,
} from '@/modules/hr/pensioners/dto/pensioner.dto';

@Injectable()
export class PensionerService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly i18n: I18nService,
  ) {}

  async findAll(filters: QueryPensionerDto): Promise<PensionerListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;

    const orgIds = filters.organizations
      ? filters.organizations.split(',').map((s) => Number(s)).filter((n) => !Number.isNaN(n))
      : [];

    const terms = filters.search ? filters.search.trim().split(/\s+/) : [];
    const termConds = terms.map((t) =>
      or(
        ilike(pensioners.last_name, `%${t}%`),
        ilike(pensioners.first_name, `%${t}%`),
        ilike(pensioners.middle_name, `%${t}%`),
        sql`CAST(${pensioners.pin} AS TEXT) ILIKE ${`%${t}%`}`,
      ),
    );

    const where = and(
      isNull(pensioners.deleted_at),
      filters.organization_id
        ? eq(pensioners.organization_id, filters.organization_id)
        : undefined,
      orgIds.length > 0 ? inArray(pensioners.organization_id, orgIds) : undefined,
      ...termConds,
    );

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
        .leftJoin(organizations, eq(organizations.id, pensioners.organization_id))
        .where(where)
        .orderBy(asc(pensioners.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(pensioners).where(where),
    ]);

    return {
      current_page: page,
      per_page: perPage,
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
}
