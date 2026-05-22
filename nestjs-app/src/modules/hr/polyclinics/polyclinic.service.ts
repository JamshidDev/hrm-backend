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
  // Laravel: $org->polyclinics()->sync(merge(mavjud, request->polyclinics)) —
  // mavjudlar saqlanadi, yangilari qo'shiladi (idempotent — dublikat qo'shilmaydi).
  async create(dto: CreatePolyclinicDto): Promise<void> {
    const orgId = this.ctx.user_or_fail.organization_id;
    if (!orgId) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.organization_not_found'),
      );
    }

    // Tashkilotning hozirgi (o'chirilmagan) poliklinikalari.
    const existing = await this.db
      .select({ pid: organization_polyclinics.polyclinic_id })
      .from(organization_polyclinics)
      .where(
        and(
          eq(organization_polyclinics.organization_id, orgId),
          notDeleted(organization_polyclinics),
        ),
      );
    const existingSet = new Set(existing.map((e) => e.pid));

    // Faqat hali bog'lanmagan poliklinikalarni qo'shamiz.
    const toAdd = [...new Set(dto.polyclinics)].filter(
      (id) => !existingSet.has(id),
    );
    if (toAdd.length > 0) {
      await this.db.insert(organization_polyclinics).values(
        toAdd.map((pid) => ({
          organization_id: orgId,
          polyclinic_id: pid,
          created_at: sql`NOW()`,
          updated_at: sql`NOW()`,
        })),
      );
    }
  }

  // DELETE /api/v1/hr/polyclinics/{id}
  // {id} — poliklinika id'si (index `id` sifatida shuni qaytaradi —
  // OrganizationPolyclinicResource: `polyclinic->id`).
  // Joriy tashkilot bilan bog'lanish butunlay o'chiriladi (Laravel: forceDelete).
  async remove(id: number): Promise<void> {
    const orgId = this.ctx.user_or_fail.organization_id ?? 0;
    await this.db
      .delete(organization_polyclinics)
      .where(
        and(
          eq(organization_polyclinics.organization_id, orgId),
          eq(organization_polyclinics.polyclinic_id, id),
        ),
      );
  }
}
