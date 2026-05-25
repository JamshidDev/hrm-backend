// Med workers service. Laravel: Med/MedController (workers, polyclinics, dashboard, organizations).
// Poliklinika kontekstidagi tibbiy ko'rikdan o'tgan xodimlar ro'yxati va statistika.

import { Injectable } from '@nestjs/common';
import { and, asc, count, eq, inArray, isNull, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import { PermissionService } from '@/shared/permission/permission.service';
import {
  meds,
  organizations,
  organization_polyclinics,
  sended_workers,
} from '@/db/schema';
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
    private readonly permissions: PermissionService,
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
        rows.map(async (r) => ({
          ...r,
          file: await this.minio.fileUrl(r.file),
        })),
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

  // GET /api/v1/med/dashboard — Laravel: MedController::dashboard.
  // {sendedWorkers, medCount, polyclinics, sendedWorkersByYear}.
  async dashboard() {
    const userOrgId = this.ctx.user_or_fail.organization_id;
    // Laravel filter() → QueryHelper::childIds — ruxsat etilgan org id lar.
    const scopeOrgIds = await this.resolveScopeOrgIds();
    const orgScope = scopeOrgIds.length
      ? inArray(sended_workers.organization_id, scopeOrgIds)
      : sql`false`;
    const medOrgScope = scopeOrgIds.length
      ? inArray(meds.organization_id, scopeOrgIds)
      : sql`false`;

    const [[sendedWorkers], [sendedWorkersByYear], [medCount], [polyclinics]] =
      await Promise.all([
        // status IS NULL — hali ko'rikdan o'tmaganlar.
        this.db
          .select({ c: count() })
          .from(sended_workers)
          .where(
            and(
              notDeleted(sended_workers),
              isNull(sended_workers.status),
              orgScope,
            ),
          ),
        // confirmation = SUCCESS(3) — yil bo'yicha tasdiqlanganlar.
        this.db
          .select({ c: count() })
          .from(sended_workers)
          .where(
            and(
              notDeleted(sended_workers),
              eq(sended_workers.confirmation, 3),
              orgScope,
            ),
          ),
        // current = true va `to` 15 kundan kam qolgan tibbiy ko'riklar.
        this.db
          .select({ c: count() })
          .from(meds)
          .where(
            and(
              notDeleted(meds),
              eq(meds.current, true),
              // Laravel: where('to','<', now()->addDays(15)) — `to` (date) ustuni
              // bilan taqqoslashda sana-only bo'ladi → CURRENT_DATE + 15 kun.
              sql`${meds.to} < CURRENT_DATE + INTERVAL '15 days'`,
              medOrgScope,
            ),
          ),
        // polyclinics — faqat joriy user org'i.
        this.db
          .select({ c: count() })
          .from(organization_polyclinics)
          .where(
            userOrgId
              ? eq(organization_polyclinics.organization_id, userOrgId)
              : sql`false`,
          ),
      ]);

    return {
      sendedWorkers: Number(sendedWorkers?.c ?? 0),
      medCount: Number(medCount?.c ?? 0),
      polyclinics: Number(polyclinics?.c ?? 0),
      sendedWorkersByYear: Number(sendedWorkersByYear?.c ?? 0),
    };
  }

  // Laravel QueryHelper::childIds — ruxsat etilgan organization id lar.
  // admin → barcha (o'chirilmagan) org; leader → subtree; default → o'zining org'i.
  private async resolveScopeOrgIds(): Promise<number[]> {
    const userId = this.ctx.user_or_fail.id;
    const orgId = this.ctx.user_or_fail.organization_id;
    const perms = await this.permissions.getUserPermissions(userId);

    if (perms.has('organization-admin')) {
      // Laravel: (new Organization)->select('id') — SoftDelete global scope bilan.
      const rows = await this.db
        .select({ id: organizations.id })
        .from(organizations)
        .where(isNull(organizations.deleted_at));
      return rows.map((r) => r.id);
    }

    if (perms.has('organization-leader') && orgId) {
      // descendantsAndSelf — NestedSet: _lft BETWEEN self._lft AND self._rgt.
      const [self] = await this.db
        .select({ lft: organizations._lft, rgt: organizations._rgt })
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);
      if (!self) return [orgId];
      const rows = await this.db
        .select({ id: organizations.id })
        .from(organizations)
        .where(
          and(
            isNull(organizations.deleted_at),
            sql`${organizations._lft} BETWEEN ${self.lft} AND ${self.rgt}`,
          ),
        );
      return rows.map((r) => r.id);
    }

    return orgId ? [orgId] : [];
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
