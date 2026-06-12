// OrganizationPhone service. Laravel: Structure/OrganizationPhoneController.

import { Injectable } from '@nestjs/common';
import { and, asc, count, eq, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { organization_phones } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { RequestContext } from '@/common/context/request.context';
import {
  CreateOrganizationPhoneDto,
  QueryOrganizationPhoneDto,
  UpdateOrganizationPhoneDto,
} from '@/modules/hr/organization-phones/dto/organization-phone.dto';

@Injectable()
export class OrganizationPhoneService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly scope: OrgScopeService,
  ) {}

  // GET /api/v1/hr/organization-phones
  async findAll(filters: QueryOrganizationPhoneDto) {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;

    // Laravel OrganizationPhone::scopeFilter → QueryHelper::filterByOrganizations
    // (rol/org-scope: childIds + organizations + organization_id).
    const inScope = await this.scope.whereOrg(
      organization_phones.organization_id,
      {
        organizations: (filters as { organizations?: string }).organizations,
        organization_id: filters.organization_id,
      },
    );

    const where = and(notDeleted(organization_phones), inScope);

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(organization_phones)
        .where(where)
        .orderBy(asc(organization_phones.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(organization_phones).where(where),
    ]);

    return {
      current_page: page,
      total: Number(total),
      data: rows,
    };
  }

  // GET /api/v1/hr/organization-phones-list — for current user organization.
  async list() {
    const orgId = this.ctx.user_or_fail.organization_id;
    if (!orgId) return [];
    return this.db
      .select()
      .from(organization_phones)
      .where(
        and(
          eq(organization_phones.organization_id, orgId),
          notDeleted(organization_phones),
        ),
      )
      .orderBy(asc(organization_phones.id));
  }

  // POST /api/v1/hr/organization-phones
  async create(dto: CreateOrganizationPhoneDto): Promise<void> {
    const orgId = this.ctx.user_or_fail.organization_id;
    if (!orgId) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.organization_not_found'),
      );
    }
    for (const phone of dto.phones) {
      const phoneNum = Number(phone);
      const [existing] = await this.db
        .select({ id: organization_phones.id })
        .from(organization_phones)
        .where(
          and(
            eq(organization_phones.organization_id, orgId),
            eq(organization_phones.phone, phoneNum),
            notDeleted(organization_phones),
          ),
        )
        .limit(1);
      if (!existing) {
        await this.db.insert(organization_phones).values({
          organization_id: orgId,
          phone: phoneNum,
        });
      }
    }
  }

  // PUT /api/v1/hr/organization-phones/{id}
  async update(id: number, dto: UpdateOrganizationPhoneDto): Promise<void> {
    const [row] = await this.db
      .select()
      .from(organization_phones)
      .where(
        and(eq(organization_phones.id, id), notDeleted(organization_phones)),
      )
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    // Laravel: forceDelete duplicate before update.
    await this.db
      .delete(organization_phones)
      .where(
        and(
          eq(organization_phones.organization_id, row.organization_id),
          eq(organization_phones.phone, Number(dto.phone)),
        ),
      );
    await this.db
      .update(organization_phones)
      .set({ phone: Number(dto.phone), updated_at: sql`NOW()` })
      .where(eq(organization_phones.id, id));
  }

  // DELETE /api/v1/hr/organization-phones/{id}
  async remove(id: number): Promise<void> {
    const [row] = await this.db
      .select({ id: organization_phones.id })
      .from(organization_phones)
      .where(
        and(eq(organization_phones.id, id), notDeleted(organization_phones)),
      )
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    await this.db
      .update(organization_phones)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(organization_phones.id, id));
  }
}
