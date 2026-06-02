// Med workers service. Laravel: Med/MedController (workers, polyclinics, dashboard, organizations).
// Poliklinika kontekstidagi tibbiy ko'rikdan o'tgan xodimlar ro'yxati va statistika.

import { Injectable } from '@nestjs/common';
import { and, asc, count, eq, gte, inArray, isNull, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { I18nService } from 'nestjs-i18n';
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
  workers,
  worker_positions,
  departments,
  positions as positionsTable,
  vacations,
} from '@/db/schema';
import { buildWorkerSearchCond } from '@/modules/hr/_shared/worker-search.helper';
import { getShortPosition } from '@/modules/hr/_shared/position-helper';
import {
  pageOf,
  polyclinicOrgIds,
  POLYCLINIC_ORG_IDS,
} from '@/modules/med/_shared/helpers';
import type { QueryMedWorkersDto } from '@/modules/med/med-workers/dto/med-workers.dto';

// Laravel Modules\HR\Enums\MedStatusEnum::get — 1=one, 2=two, else "".
const MED_STATUS_LABELS: Record<number, string> = {
  1: 'messages.worker.med.one',
  2: 'messages.worker.med.two',
};

@Injectable()
export class MedWorkersService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
    private readonly permissions: PermissionService,
    private readonly i18n: I18nService,
  ) {}

  /**
   * GET /api/v1/med/workers — Laravel `MedController::index`.
   * OrganizationPolyclinic(polyclinic_id=user org) → org id'lar; Med whereIn(org) +
   * organizations filtri + search(worker fullname) + whereCurrent(true) → orderBy('to').
   * → PaginateResource(MedResource): {worker, organization, position, status, days, vacation...}.
   */
  async workers(filters: QueryMedWorkersDto) {
    const { page, perPage, offset } = pageOf(filters);
    const lang = this.ctx.lang;
    const orgIds = await polyclinicOrgIds(
      this.db,
      this.ctx.user_or_fail.organization_id,
    );
    if (orgIds.length === 0) {
      return { current_page: page, total: 0, data: [] };
    }

    // Laravel scopeSearch — request has 'search' → whereHas('worker', SearchByFullName).
    const searchCond = filters.search
      ? buildWorkerSearchCond(filters.search)
      : undefined;

    const where = and(
      notDeleted(meds),
      eq(meds.current, true),
      inArray(meds.organization_id, orgIds),
      // Laravel: when(request('organizations'), fn => where('organization_id', $id)).
      filters.organizations
        ? eq(meds.organization_id, filters.organizations)
        : undefined,
      searchCond,
    );

    // MedResource organization (meds.organization_id) — worker_position'inkidan farqli.
    const medOrg = alias(organizations, 'med_org');

    const listQuery = this.db
      .select({
        id: meds.id,
        status: meds.status,
        from: meds.from,
        to: meds.to,
        file: meds.file,
        comment: meds.comment,
        current: meds.current,
        w_id: workers.id,
        w_photo: workers.photo,
        w_last: workers.last_name,
        w_first: workers.first_name,
        w_middle: workers.middle_name,
        o_id: medOrg.id,
        o_name: medOrg.name,
        o_name_ru: medOrg.name_ru,
        o_name_en: medOrg.name_en,
        o_group: medOrg.group,
        wp_dept_name: departments.name,
        wp_dept_level: departments.level,
        wp_pos_name: positionsTable.name,
      })
      .from(meds)
      .leftJoin(workers, eq(workers.id, meds.worker_id))
      .leftJoin(medOrg, eq(medOrg.id, meds.organization_id))
      .leftJoin(
        worker_positions,
        eq(worker_positions.id, meds.worker_position_id),
      )
      .leftJoin(departments, eq(departments.id, worker_positions.department_id))
      .leftJoin(
        positionsTable,
        eq(positionsTable.id, worker_positions.position_id),
      )
      .where(where)
      .orderBy(asc(meds.to))
      .limit(perPage)
      .offset(offset);

    // count — search bo'lsa worker join kerak (whereHas('worker')).
    const countQuery = searchCond
      ? this.db
          .select({ total: count() })
          .from(meds)
          .leftJoin(workers, eq(workers.id, meds.worker_id))
          .where(where)
      : this.db.select({ total: count() }).from(meds).where(where);

    const [rows, [{ total }]] = await Promise.all([listQuery, countQuery]);

    // worker.currentVacation — hasOne(Vacation)->whereDate('to','>=',today): batch.
    const today = this.todayStr();
    const workerIds = [
      ...new Set(rows.map((r) => r.w_id).filter((v): v is number => v != null)),
    ];
    const vacRows = workerIds.length
      ? await this.db
          .select({ worker_id: vacations.worker_id, to: vacations.to })
          .from(vacations)
          .where(
            and(
              notDeleted(vacations),
              inArray(vacations.worker_id, workerIds),
              gte(vacations.to, today),
            ),
          )
          .orderBy(asc(vacations.id))
      : [];
    const vacMap = new Map<number, string | null>();
    for (const v of vacRows) {
      if (v.worker_id != null && !vacMap.has(v.worker_id)) {
        vacMap.set(v.worker_id, v.to);
      }
    }

    return {
      current_page: page,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => ({
          id: r.id,
          worker: r.w_id
            ? {
                id: r.w_id,
                photo: await this.minio.fileUrl(r.w_photo),
                last_name: r.w_last,
                first_name: r.w_first,
                middle_name: r.w_middle,
              }
            : null,
          organization: r.o_id
            ? { id: r.o_id, name: this.orgName(r, lang), group: r.o_group }
            : null,
          position: getShortPosition({
            position_name: r.wp_pos_name,
            department_name: r.wp_dept_name,
            department_level: r.wp_dept_level,
            organization_full_name: null,
          }),
          status: { id: r.status, name: this.medStatusName(r.status, lang) },
          from: r.from,
          to: r.to,
          days: this.medDays(r.to),
          file: await this.minio.fileUrl(r.file),
          comment: r.comment,
          current: r.current,
          vacation: r.w_id ? (vacMap.get(r.w_id) ?? null) : null,
        })),
      ),
    };
  }

  // Laravel OrganizationListResource — ru→name_ru, en→name_en, default→name.
  private orgName(
    o: {
      o_name: string | null;
      o_name_ru: string | null;
      o_name_en: string | null;
    },
    lang: string,
  ): string | null {
    if (lang === 'ru') return o.o_name_ru;
    if (lang === 'en') return o.o_name_en;
    return o.o_name;
  }

  // Laravel MedStatusEnum::get — id => tarjima (topilmasa "").
  private medStatusName(id: number | null, lang: string): string {
    const key = id != null ? MED_STATUS_LABELS[id] : undefined;
    if (!key) return '';
    const v = this.i18n.t(key, { lang });
    return typeof v === 'string' ? v : '';
  }

  // Laravel MedResource days — `to` kelajakda bo'lsa musbat, o'tgan bo'lsa manfiy (kun).
  private medDays(toStr: string | null): number {
    if (!toStr) return 0;
    const to = new Date(`${toStr}T00:00:00`);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((to.getTime() - today.getTime()) / 86400000);
  }

  // Bugungi sana (Y-m-d, lokal) — currentVacation `to >= today` uchun.
  private todayStr(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
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
