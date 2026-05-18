// Med workers service. Laravel: Med/MedController (workers, polyclinics, dashboard, organizations).
// Poliklinika kontekstidagi tibbiy ko'rikdan o'tgan xodimlar ro'yxati va statistika.

import { Injectable } from '@nestjs/common';
import { and, asc, count, eq, inArray, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import { meds, organizations } from '@/db/schema';
import {
  pageOf,
  polyclinicOrgIds,
  POLYCLINIC_ORG_IDS,
} from '@/modules/med/_shared/helpers';
import type { QueryMedWorkersDto } from '@/modules/med/med-workers/dto/med-workers.dto';

@Injectable()
export class MedWorkersService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
  ) {}

  // GET /api/v1/med/workers — joriy poliklinikaga tegishli, current=true tibbiy yozuvlar.
  async workers(filters: QueryMedWorkersDto) {
    const { page, perPage, offset } = pageOf(filters);
    const orgIds = await polyclinicOrgIds(
      this.db,
      this.ctx.user_or_fail.organization_id,
    );
    if (orgIds.length === 0) {
      return { current_page: page, per_page: perPage, total: 0, data: [] };
    }

    const where = and(
      notDeleted(meds),
      eq(meds.current, true),
      inArray(meds.organization_id, orgIds),
      filters.organization_id
        ? eq(meds.organization_id, filters.organization_id)
        : undefined,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(meds)
        .where(where)
        .orderBy(asc(meds.to))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(meds).where(where),
    ]);

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => ({ ...r, file: await this.minio.fileUrl(r.file) })),
      ),
    };
  }

  // GET /api/v1/med/polyclinics — qattiq belgilangan poliklinika tashkilotlari.
  async polyclinics() {
    return this.db
      .select({
        id: organizations.id,
        name: organizations.name,
        group: organizations.group,
      })
      .from(organizations)
      .where(
        and(
          inArray(organizations.id, [...POLYCLINIC_ORG_IDS]),
          notDeleted(organizations),
        ),
      );
  }

  // GET /api/v1/med/dashboard — joriy poliklinika bo'yicha statistika.
  async dashboard() {
    const orgIds = await polyclinicOrgIds(
      this.db,
      this.ctx.user_or_fail.organization_id,
    );
    if (orgIds.length === 0) {
      return { total: 0, finished: 0, pending: 0 };
    }
    const [stats] = await this.db
      .select({
        total: count(),
        finished: sql<number>`COALESCE(SUM(CASE WHEN ${meds.to} <= CURRENT_DATE THEN 1 ELSE 0 END), 0)::int`,
        pending: sql<number>`COALESCE(SUM(CASE WHEN ${meds.to} > CURRENT_DATE THEN 1 ELSE 0 END), 0)::int`,
      })
      .from(meds)
      .where(
        and(
          notDeleted(meds),
          eq(meds.current, true),
          inArray(meds.organization_id, orgIds),
        ),
      );
    return {
      total: Number(stats?.total ?? 0),
      finished: Number(stats?.finished ?? 0),
      pending: Number(stats?.pending ?? 0),
    };
  }

  // GET /api/v1/med/organizations — joriy poliklinikaga biriktirilgan tashkilotlar.
  async organizations() {
    const orgIds = await polyclinicOrgIds(
      this.db,
      this.ctx.user_or_fail.organization_id,
    );
    if (orgIds.length === 0) return [];
    return this.db
      .select({
        id: organizations.id,
        name: organizations.name,
        group: organizations.group,
      })
      .from(organizations)
      .where(and(inArray(organizations.id, orgIds), notDeleted(organizations)));
  }
}
