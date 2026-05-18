// Polyclinic service. Laravel: OrganizationPolyclinicController.

import { Injectable } from '@nestjs/common';
import { and, asc, count, eq, isNull, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { organization_polyclinics, organizations } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import {
  CreatePolyclinicDto,
  PolyclinicListResponseDto,
  QueryPolyclinicDto,
} from '@/modules/hr/polyclinics/dto/polyclinic.dto';

@Injectable()
export class PolyclinicService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly i18n: I18nService,
  ) {}

  async findAll(filters: QueryPolyclinicDto): Promise<PolyclinicListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const orgId = this.ctx.user?.organization_id ?? 0;
    const offset = (page - 1) * perPage;

    const where = and(
      eq(organization_polyclinics.organization_id, orgId),
      isNull(organization_polyclinics.deleted_at),
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: organizations.id,
          name: organizations.name,
        })
        .from(organization_polyclinics)
        .leftJoin(
          organizations,
          eq(organizations.id, organization_polyclinics.polyclinic_id),
        )
        .where(where)
        .orderBy(asc(organization_polyclinics.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(organization_polyclinics).where(where),
    ]);

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows.map((r) => ({ id: r.id, name: r.name })),
    };
  }

  // POST /api/v1/hr/polyclinics
  async create(dto: CreatePolyclinicDto): Promise<void> {
    const orgId = this.ctx.user_or_fail.organization_id;
    if (!orgId) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.organization_not_found'),
      );
    }
    await this.db.insert(organization_polyclinics).values({
      organization_id: orgId,
      polyclinic_id: dto.polyclinic_id,
    });
  }

  // DELETE /api/v1/hr/polyclinics/{id}
  async remove(id: number): Promise<void> {
    const [row] = await this.db
      .select({ id: organization_polyclinics.id })
      .from(organization_polyclinics)
      .where(
        and(
          eq(organization_polyclinics.id, id),
          notDeleted(organization_polyclinics),
        ),
      )
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    await this.db
      .update(organization_polyclinics)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(organization_polyclinics.id, id));
  }
}
