// HikCentral Telegram service.
// Laravel: TelegramPhotoController + UserDeviceNotifyController.

import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { and, count, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import { HikCentralClient } from '@/shared/hik-central/hik-central.client';
import {
  h_c_p_devices,
  hik_central_access_levels,
  hik_central_departments,
  turnstile_telegram_photos,
  user_telegrams,
  user_turnstile_devices,
  users,
  worker_access_levels,
  worker_hik_centrals,
  worker_photos,
  workers,
} from '@/db/schema';
import { nextId, pageOf } from '@/modules/turnstile/_shared/helpers';
import { buildWorkerSearchCond } from '@/modules/hr/_shared/worker-search.helper';

interface ListPhotosQuery {
  page?: number;
  per_page?: number;
  search?: string;
  status?: number | string;
  departments?: string;
  organizations?: string;
  organization_id?: number;
}

interface UpdatePhotosBody {
  ids: number[];
  status: number;
  comment?: string | null;
  access_level_ids?: number[];
  to?: string | null;
}

@Injectable()
export class TelegramService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly scope: OrgScopeService,
    private readonly minio: MinioService,
    private readonly hcp: HikCentralClient,
    private readonly ctx: RequestContext,
    private readonly i18n: I18nService,
  ) {}

  // Laravel: TelegramPhotoController::index — paginated turnstile_telegram_photos.
  //
  // Worker scope: worker_positions.filter($user) JOIN with status=ACTIVE +
  //   organization_id NOT IN [1, 19] + departments filter (Laravel custom).
  // Photo filter:
  //   - search → workers.searchByFullName
  //   - status → where status=$status
  //   - status===2 → where status=2 (redundant)
  //   - status!=2 → where status != 2 (DEFAULT: exclude status=2 rows!)
  //
  // Response: TurnstileTelegramPhotoResource
  //   { id, worker:{id,photo,last,first,middle}, photo (file_url),
  //     person_id (hcp_person_id if status===2 else null), error, status, created_at }
  async listPhotos(q: ListPhotosQuery) {
    const { page, perPage, offset } = pageOf(q);

    // 1) Worker scope subquery — active position, organization NOT IN [1,19], scope + departments.
    const ids = await this.scope.ids();
    if (ids.length === 0) {
      return { current_page: page, total: 0, data: [] };
    }
    const orgList = sql.join(ids.map((n) => sql`${n}`), sql`, `);
    let extraOrgs: number[] | null = null;
    if (q.organizations) {
      extraOrgs = q.organizations
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0);
    }
    const extraOrgCond =
      extraOrgs && extraOrgs.length > 0
        ? sql` AND wp.organization_id IN (${sql.join(extraOrgs.map((n) => sql`${n}`), sql`, `)})`
        : sql``;
    const orgIdCond =
      q.organization_id != null && Number(q.organization_id) > 0
        ? sql` AND wp.organization_id = ${Number(q.organization_id)}`
        : sql``;
    let depIds: number[] | null = null;
    if (q.departments) {
      depIds = q.departments
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0);
    }
    const depCond =
      depIds && depIds.length > 0
        ? sql` AND wp.department_id IN (${sql.join(depIds.map((n) => sql`${n}`), sql`, `)})`
        : sql``;

    const workerIdsSubq = sql`
      SELECT DISTINCT wp.worker_id FROM worker_positions wp
      WHERE wp.deleted_at IS NULL
        AND wp.status = 2
        AND wp.organization_id NOT IN (1, 19)
        AND wp.organization_id IN (${orgList})${extraOrgCond}${orgIdCond}${depCond}
    `;

    // 2) Status filter logic (Laravel quirky):
    //   - status param explicitly === 2 → only status=2
    //   - any other status param → where status=$status (one filter)
    //   - PLUS: final `when(status===2, ..., status!=2)` — DEFAULT excludes status=2
    const statusNum =
      q.status !== undefined && q.status !== null && q.status !== ''
        ? Number(q.status)
        : null;
    const statusConds: any[] = [];
    if (statusNum !== null) {
      statusConds.push(eq(turnstile_telegram_photos.status, statusNum));
    }
    // Final status === 2 check
    if (statusNum === 2) {
      statusConds.push(eq(turnstile_telegram_photos.status, 2));
    } else {
      statusConds.push(ne(turnstile_telegram_photos.status, 2));
    }

    // 3) Search filter (Laravel: whereHas worker searchByFullName)
    const searchCond = buildWorkerSearchCond(q.search);
    let searchWorkerIds: number[] | null = null;
    if (searchCond) {
      const rows = await this.db
        .select({ id: workers.id })
        .from(workers)
        .where(searchCond);
      searchWorkerIds = rows.map((r) => Number(r.id));
      if (!searchWorkerIds.length) {
        return { current_page: page, total: 0, data: [] };
      }
    }

    const conds: any[] = [
      notDeleted(turnstile_telegram_photos),
      sql`${turnstile_telegram_photos.worker_id} IN (${workerIdsSubq})`,
      ...statusConds,
    ];
    if (searchWorkerIds) {
      conds.push(inArray(turnstile_telegram_photos.worker_id, searchWorkerIds));
    }
    const whereExpr = and(...conds);

    // 4) List + total in parallel
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: turnstile_telegram_photos.id,
          worker_id: turnstile_telegram_photos.worker_id,
          hcp_person_id: turnstile_telegram_photos.hcp_person_id,
          photo: turnstile_telegram_photos.photo,
          status: turnstile_telegram_photos.status,
          error: turnstile_telegram_photos.error,
          created_at: turnstile_telegram_photos.created_at,
        })
        .from(turnstile_telegram_photos)
        .where(whereExpr)
        .orderBy(desc(turnstile_telegram_photos.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(turnstile_telegram_photos)
        .where(whereExpr),
    ]);

    if (rows.length === 0) {
      return { current_page: page, total: Number(total), data: [] };
    }

    // 5) Eager-load worker + photo URLs
    const wIds = [...new Set(rows.map((r) => Number(r.worker_id)))];
    const wRows = await this.db
      .select({
        id: workers.id,
        photo: workers.photo,
        last_name: workers.last_name,
        first_name: workers.first_name,
        middle_name: workers.middle_name,
      })
      .from(workers)
      .where(inArray(workers.id, wIds));
    const wPhotoUrls = await Promise.all(
      wRows.map((w) => this.minio.fileUrl(w.photo)),
    );
    const wMap = new Map(
      wRows.map(
        (w, i) =>
          [
            Number(w.id),
            {
              id: Number(w.id),
              photo: wPhotoUrls[i],
              last_name: w.last_name,
              first_name: w.first_name,
              middle_name: w.middle_name,
            },
          ] as const,
      ),
    );

    // 6) Photo file URLs (turnstile/telegram/photos/*.jpg)
    const photoUrls = await Promise.all(rows.map((r) => this.minio.fileUrl(r.photo)));

    // 7) Build response (TurnstileTelegramPhotoResource shape)
    return {
      current_page: page,
      total: Number(total),
      data: rows.map((r, i) => ({
        id: Number(r.id),
        worker: wMap.get(Number(r.worker_id)) ?? null,
        photo: photoUrls[i],
        person_id: r.status === 2 ? Number(r.hcp_person_id) : null,
        error: r.error,
        status: r.status,
        created_at: r.created_at,
      })),
    };
  }

  // Laravel: TelegramPhotoController::updatePhotos.
  //
  //  status=3 (reject): bulk update photos with status=3 + error=comment, return.
  //  status=2 (accept):
  //   - validate <= 5 access_level_ids (unless user.id === 1)
  //   - load TurnstileTelegramPhoto + worker
  //   - if count(photos) < 4 → applyPhotoUpdates (HCP calls per photo).
  async updatePhotos(body: UpdatePhotosBody): Promise<void> {
    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      throw new BusinessException(422, 'ids array required');
    }
    if (body.status === undefined || body.status === null) {
      throw new BusinessException(422, 'status required');
    }
    const ids = body.ids.map(Number).filter(Number.isFinite);

    // Branch: status=3 → bulk reject + comment.
    if (Number(body.status) === 3) {
      await this.db
        .update(turnstile_telegram_photos)
        .set({
          status: 3,
          error: body.comment ?? null,
          updated_at: sql`NOW()`,
        })
        .where(inArray(turnstile_telegram_photos.id, ids));
      return;
    }

    // status === 2 (accept): validate access_level_ids size.
    const userId = this.ctx.user_or_fail.id;
    const accessLevelIds = (body.access_level_ids ?? []).map(Number).filter(
      Number.isFinite,
    );
    if (accessLevelIds.length > 5 && Number(userId) !== 1) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.turnstile.max_access_level_5', {
          lang: this.ctx.lang,
        }),
      );
    }

    // Load photos + worker fields needed for HCP.
    const photos = await this.db
      .select({
        id: turnstile_telegram_photos.id,
        worker_id: turnstile_telegram_photos.worker_id,
        hcp_person_id: turnstile_telegram_photos.hcp_person_id,
        photo: turnstile_telegram_photos.photo,
        w_id: workers.id,
        w_last_name: workers.last_name,
        w_first_name: workers.first_name,
        w_middle_name: workers.middle_name,
        w_sex: workers.sex,
        w_card: workers.card,
      })
      .from(turnstile_telegram_photos)
      .leftJoin(workers, eq(workers.id, turnstile_telegram_photos.worker_id))
      .where(inArray(turnstile_telegram_photos.id, ids));

    // Laravel guard: only proceed if < 4 photos selected (mass-update safety).
    if (photos.length >= 4) return;

    await this.applyPhotoUpdates(photos, accessLevelIds, body.to ?? null);
  }

  // For each photo: download from MinIO → base64 (compress if >200KB) → call HCP.
  private async applyPhotoUpdates(
    photos: Array<{
      id: number;
      worker_id: number;
      hcp_person_id: number | null;
      photo: string;
      w_id: number | null;
      w_last_name: string | null;
      w_first_name: string | null;
      w_middle_name: string | null;
      w_sex: boolean | null;
      w_card: number | null;
    }>,
    accessLevelIds: number[],
    to: string | null,
  ): Promise<void> {
    // Pre-load HCP access_levels + department info (used in both branches).
    let accessLevels: Array<{
      id: number;
      hik_central_access_level_id: number | null;
      hik_central_department_id: number | null;
    }> = [];
    if (accessLevelIds.length) {
      accessLevels = await this.db
        .select({
          id: hik_central_access_levels.id,
          hik_central_access_level_id:
            hik_central_access_levels.hik_central_access_level_id,
          hik_central_department_id:
            hik_central_access_levels.hik_central_department_id,
        })
        .from(hik_central_access_levels)
        .where(inArray(hik_central_access_levels.id, accessLevelIds));
    }

    const nowDb = sql`NOW()`;

    for (const ph of photos) {
      // Download photo → base64.
      const photoUrl = await this.minio.fileUrl(ph.photo);
      if (!photoUrl) {
        await this.db
          .update(turnstile_telegram_photos)
          .set({ status: 4, error: 'photo url missing', updated_at: nowDb })
          .where(eq(turnstile_telegram_photos.id, ph.id));
        continue;
      }
      let base64: string;
      try {
        const fetched = await fetch(photoUrl);
        if (!fetched.ok) throw new Error(`status ${fetched.status}`);
        const buf = Buffer.from(await fetched.arrayBuffer());
        base64 = buf.toString('base64');
      } catch (e) {
        await this.db
          .update(turnstile_telegram_photos)
          .set({
            status: 4,
            error: (e as Error).message?.slice(0, 255) ?? 'fetch failed',
            updated_at: nowDb,
          })
          .where(eq(turnstile_telegram_photos.id, ph.id));
        continue;
      }

      // Create WorkerPhoto record (mirror of telegram photo path).
      const newPhotoId = await nextId(this.db, worker_photos);
      await this.db.insert(worker_photos).values({
        id: newPhotoId,
        worker_id: ph.worker_id,
        photo: ph.photo,
      } as any);

      // Branch A: no existing HCP person → addWorkerToServer + attach.
      if (!ph.hcp_person_id) {
        let departmentHcpId = '1';
        const firstAl = accessLevels[0];
        if (firstAl?.hik_central_department_id) {
          const [dep] = await this.db
            .select({
              hik_central_department_id:
                hik_central_departments.hik_central_department_id,
            })
            .from(hik_central_departments)
            .where(
              eq(
                hik_central_departments.id,
                Number(firstAl.hik_central_department_id),
              ),
            )
            .limit(1);
          if (dep?.hik_central_department_id) {
            departmentHcpId = String(dep.hik_central_department_id);
          }
        }

        const res = await this.hcp.addWorkerToServer(
          {
            id: ph.worker_id,
            last_name: ph.w_last_name,
            first_name: ph.w_first_name,
            middle_name: ph.w_middle_name,
            sex: ph.w_sex,
            card: ph.w_card,
          },
          base64,
          to,
          departmentHcpId,
        );
        if (!res.status) {
          await this.db
            .update(turnstile_telegram_photos)
            .set({
              status: 4,
              error: (res.msg ?? 'Error').slice(0, 255),
              updated_at: nowDb,
            })
            .where(eq(turnstile_telegram_photos.id, ph.id));
          continue;
        }
        const newPersonId = res.personId;
        const toStr =
          to ??
          new Date(
            new Date().getFullYear() + 2,
            new Date().getMonth(),
            new Date().getDate(),
          )
            .toISOString()
            .replace('T', ' ')
            .slice(0, 19);

        // Upsert WorkerHikCentral.
        const [existing] = await this.db
          .select({ id: worker_hik_centrals.id })
          .from(worker_hik_centrals)
          .where(
            and(
              eq(worker_hik_centrals.worker_id, ph.worker_id),
              eq(worker_hik_centrals.hik_central_key, 1),
              eq(
                worker_hik_centrals.hik_central_person_id,
                Number(newPersonId),
              ),
            ),
          )
          .limit(1);
        let whId: number;
        if (existing) {
          whId = Number(existing.id);
          await this.db
            .update(worker_hik_centrals)
            .set({
              worker_photo_id: newPhotoId,
              to: toStr,
              updated_at: nowDb,
            })
            .where(eq(worker_hik_centrals.id, whId));
        } else {
          whId = await nextId(this.db, worker_hik_centrals);
          await this.db.insert(worker_hik_centrals).values({
            id: whId,
            worker_id: ph.worker_id,
            hik_central_key: 1,
            hik_central_person_id: Number(newPersonId),
            worker_photo_id: newPhotoId,
            to: toStr,
            created_at: nowDb,
            updated_at: nowDb,
          } as any);
        }

        // Attach each access_level via HCP.
        await this.attachWorkersToAccessLevels(
          accessLevels,
          String(newPersonId),
          whId,
          ph.worker_id,
        );

        await this.db
          .update(turnstile_telegram_photos)
          .set({
            status: 2,
            error: null,
            hcp_person_id: Number(newPersonId),
            updated_at: nowDb,
          })
          .where(eq(turnstile_telegram_photos.id, ph.id));
        continue;
      }

      // Branch B: existing HCP person → updatePersonFace + (optionally) attach.
      const res = await this.hcp.updatePersonFace(ph.hcp_person_id, base64);
      if (Number(res.code) !== 0) {
        await this.db
          .update(turnstile_telegram_photos)
          .set({
            status: 4,
            error: (res.msg ?? 'Error').slice(0, 255),
            updated_at: nowDb,
          })
          .where(eq(turnstile_telegram_photos.id, ph.id));
        continue;
      }
      await this.db
        .update(turnstile_telegram_photos)
        .set({ status: 2, error: null, updated_at: nowDb })
        .where(eq(turnstile_telegram_photos.id, ph.id));

      if (accessLevelIds.length) {
        // Find existing WorkerHikCentral by hik_central_person_id.
        const [wh] = await this.db
          .select({ id: worker_hik_centrals.id })
          .from(worker_hik_centrals)
          .where(
            eq(worker_hik_centrals.hik_central_person_id, ph.hcp_person_id),
          )
          .limit(1);
        if (wh) {
          await this.db
            .update(worker_hik_centrals)
            .set({ worker_photo_id: newPhotoId, updated_at: nowDb })
            .where(eq(worker_hik_centrals.id, Number(wh.id)));
          await this.attachWorkersToAccessLevels(
            accessLevels,
            String(ph.hcp_person_id),
            Number(wh.id),
            ph.worker_id,
          );
        }
      }
    }
  }

  // Laravel: HikCentralWorkerService::attachWorkersToAccessLevels (status='attach' branch).
  // Per access_level: call HCP attachWorkerToAccessLevel → upsert worker_access_levels row.
  private async attachWorkersToAccessLevels(
    accessLevels: Array<{
      id: number;
      hik_central_access_level_id: number | null;
    }>,
    hcpPersonId: string,
    workerHikCentralId: number,
    workerId: number,
  ): Promise<void> {
    for (const al of accessLevels) {
      if (!al.hik_central_access_level_id) continue;
      const res = await this.hcp.attachWorkerToAccessLevel(
        [hcpPersonId],
        al.hik_central_access_level_id,
      );
      if (!res.status) {
        await this.db
          .delete(worker_access_levels)
          .where(
            and(
              eq(worker_access_levels.worker_id, workerId),
              eq(worker_access_levels.hik_central_access_level_id, al.id),
            ),
          );
        continue;
      }
      const [existing] = await this.db
        .select({ id: worker_access_levels.id })
        .from(worker_access_levels)
        .where(
          and(
            eq(worker_access_levels.worker_id, workerId),
            eq(worker_access_levels.hik_central_access_level_id, al.id),
          ),
        )
        .limit(1);
      if (existing) {
        await this.db
          .update(worker_access_levels)
          .set({
            worker_hik_central_id: workerHikCentralId,
            hik_central_key: 1,
            hik_central_person_id: Number(hcpPersonId),
            status: 1,
            updated_at: sql`NOW()`,
          })
          .where(eq(worker_access_levels.id, Number(existing.id)));
      } else {
        const walId = await nextId(this.db, worker_access_levels);
        await this.db.insert(worker_access_levels).values({
          id: walId,
          worker_id: workerId,
          hik_central_access_level_id: al.id,
          worker_hik_central_id: workerHikCentralId,
          hik_central_key: 1,
          hik_central_person_id: Number(hcpPersonId),
          status: 1,
        } as any);
      }
    }
  }

  // Laravel: UserDeviceNotifyController::users — users with telegram + worker.
  //
  //   User::query()
  //     ->whereHas('telegram')
  //     ->whereHas('worker')
  //     ->with(['worker:id,last_name,first_name,middle_name'])
  //     ->when(search, whereHas worker SearchByFullName)
  //     ->paginate(per_page=50)
  //
  // Response (Turnstile/UserWorkerResource — FLAT shape, not nested):
  //   { id, last_name, first_name, middle_name }
  async telegramUsers(q: {
    page?: number;
    per_page?: number;
    search?: string;
  }) {
    const { page, perPage, offset } = pageOf({ page: q.page, per_page: q.per_page ?? 50 });

    // search filter — Worker::searchByFullName via worker_id subquery.
    let searchWorkerIds: number[] | null = null;
    if (q.search?.trim()) {
      const cond = buildWorkerSearchCond(q.search);
      if (cond) {
        const rows = await this.db
          .select({ id: workers.id })
          .from(workers)
          .where(cond);
        searchWorkerIds = rows.map((r) => Number(r.id));
        if (!searchWorkerIds.length) {
          return { current_page: page, total: 0, data: [] };
        }
      }
    }

    const conds: any[] = [
      notDeleted(users),
      sql`${users.worker_id} IS NOT NULL`,
      sql`EXISTS (SELECT 1 FROM user_telegrams ut WHERE ut.user_id = ${users.id} AND ut.deleted_at IS NULL)`,
      sql`EXISTS (SELECT 1 FROM workers w WHERE w.id = ${users.worker_id} AND w.deleted_at IS NULL)`,
    ];
    if (searchWorkerIds) {
      conds.push(inArray(users.worker_id, searchWorkerIds));
    }
    const where = and(...conds);

    const [uRows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: users.id,
          worker_id: users.worker_id,
        })
        .from(users)
        .where(where)
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(users).where(where),
    ]);
    const workerIds = uRows.map((u) => u.worker_id!).filter(Boolean);
    const wRows = workerIds.length
      ? await this.db
          .select({
            id: workers.id,
            last_name: workers.last_name,
            first_name: workers.first_name,
            middle_name: workers.middle_name,
          })
          .from(workers)
          .where(inArray(workers.id, workerIds))
      : [];
    const wMap = new Map<number, (typeof wRows)[number]>(
      wRows.map((w) => [Number(w.id), w] as const),
    );
    return {
      current_page: page,
      total: Number(total),
      data: uRows.map((u) => {
        const w = u.worker_id ? wMap.get(Number(u.worker_id)) : null;
        return {
          id: Number(u.id),
          last_name: w?.last_name ?? null,
          first_name: w?.first_name ?? null,
          middle_name: w?.middle_name ?? null,
        };
      }),
    };
  }

  // Laravel: UserDeviceNotifyController::index — distinct users with HCP devices.
  //
  //   User::select('users.*')
  //     ->join('user_turnstile_devices as utd', 'utd.user_id', '=', 'users.id')
  //     ->withCount('hcp_devices')
  //     ->groupBy('users.id')
  //     ->with(['worker:id,last_name,first_name,middle_name,photo'])
  //     ->paginate(per_page)
  //
  // Response (UserDevicesResource):
  //   { id, worker: {id,photo,last,first,middle}, devices_count }
  async telegramList(q: { page?: number; per_page?: number }) {
    const { page, perPage, offset } = pageOf(q);
    const [uRows, [{ total }]] = await Promise.all([
      this.db
        .selectDistinct({ user_id: user_turnstile_devices.user_id })
        .from(user_turnstile_devices)
        .orderBy(user_turnstile_devices.user_id)
        .limit(perPage)
        .offset(offset),
      this.db
        .select({
          total: sql<number>`COUNT(DISTINCT ${user_turnstile_devices.user_id})::int`,
        })
        .from(user_turnstile_devices),
    ]);
    if (!uRows.length) {
      return { current_page: page, total: Number(total), data: [] };
    }
    const userIds = uRows.map((u) => u.user_id);

    // Users + worker eager-load.
    const uList = await this.db
      .select({
        id: users.id,
        worker_id: users.worker_id,
      })
      .from(users)
      .where(inArray(users.id, userIds));
    const workerIds = uList.map((u) => u.worker_id).filter(Boolean) as number[];
    const wRows = workerIds.length
      ? await this.db
          .select({
            id: workers.id,
            last_name: workers.last_name,
            first_name: workers.first_name,
            middle_name: workers.middle_name,
            photo: workers.photo,
          })
          .from(workers)
          .where(inArray(workers.id, workerIds))
      : [];
    const wPhotoUrls = await Promise.all(
      wRows.map((w) => this.minio.fileUrl(w.photo)),
    );
    const wMap = new Map(
      wRows.map(
        (w, i) =>
          [
            Number(w.id),
            {
              id: Number(w.id),
              photo: wPhotoUrls[i],
              last_name: w.last_name,
              first_name: w.first_name,
              middle_name: w.middle_name,
            },
          ] as const,
      ),
    );
    const uMap = new Map<number, (typeof uList)[number]>(
      uList.map((u) => [Number(u.id), u] as const),
    );

    // hcp_devices count per user.
    const counts = await this.db
      .select({ user_id: user_turnstile_devices.user_id, total: count() })
      .from(user_turnstile_devices)
      .where(inArray(user_turnstile_devices.user_id, userIds))
      .groupBy(user_turnstile_devices.user_id);
    const cMap = new Map<number, number>(
      counts.map((c) => [Number(c.user_id), Number(c.total)] as const),
    );

    return {
      current_page: page,
      total: Number(total),
      // Order preserved by the initial selectDistinct.
      data: userIds.map((uid) => {
        const u = uMap.get(Number(uid));
        const w = u?.worker_id ? wMap.get(Number(u.worker_id)) ?? null : null;
        return {
          id: Number(uid),
          worker: w,
          devices_count: cMap.get(Number(uid)) ?? 0,
        };
      }),
    };
  }

  // Laravel: store — replace user's device list.
  async telegramStore(body: { user_id?: number; devices?: number[] }) {
    if (!body.user_id) throw new BusinessException(422, 'user_id is required');
    if (!Array.isArray(body.devices)) {
      throw new BusinessException(422, 'devices array is required');
    }
    await this.db
      .delete(user_turnstile_devices)
      .where(eq(user_turnstile_devices.user_id, body.user_id));
    if (body.devices.length) {
      await this.db.insert(user_turnstile_devices).values(
        body.devices.map((d) => ({
          user_id: body.user_id!,
          hik_central_device_id: Number(d),
        })),
      );
    }
  }

  // Laravel: edit — devices owned by user, returned as {id: device_id, name}.
  async telegramEdit(userId: number) {
    const deviceIds = await this.db
      .select({
        hik_central_device_id: user_turnstile_devices.hik_central_device_id,
      })
      .from(user_turnstile_devices)
      .where(eq(user_turnstile_devices.user_id, userId));
    if (!deviceIds.length) return [];
    const hcDevIds = deviceIds.map((d) => d.hik_central_device_id);
    const devs = await this.db
      .select({ id: h_c_p_devices.device_id, name: h_c_p_devices.name })
      .from(h_c_p_devices)
      .where(inArray(h_c_p_devices.device_id, hcDevIds));
    return devs;
  }

  async telegramDestroy(userId: number) {
    await this.db
      .delete(user_turnstile_devices)
      .where(eq(user_turnstile_devices.user_id, userId));
  }

  // Laravel: devices() — all HCP devices as {id, name, status: 1|2}.
  async allDevices() {
    const rows = await this.db
      .select({
        device_id: h_c_p_devices.device_id,
        name: h_c_p_devices.name,
        status: h_c_p_devices.status,
      })
      .from(h_c_p_devices)
      .where(notDeleted(h_c_p_devices));
    return {
      devices: rows.map((r) => ({
        id: r.device_id,
        name: r.name,
        status: r.status ? 1 : 2,
      })),
    };
  }
}
