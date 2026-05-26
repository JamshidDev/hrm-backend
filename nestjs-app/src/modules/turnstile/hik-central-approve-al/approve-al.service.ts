// Worker Turnstile Approve service. Laravel: WorkerTurnstileApproveController +
// WorkerTurnstileApproveService.

import { Injectable, Logger } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
  sql,
} from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { RequestContext } from '@/common/context/request.context';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { MinioService } from '@/shared/minio/minio.service';
import { HikCentralClient } from '@/shared/hik-central/hik-central.client';
import {
  departments,
  hik_central_access_levels,
  hik_central_departments,
  organization_access_levels,
  organizations,
  positions,
  turnstile_worker_access_levels,
  turnstile_worker_approve_worker_positions,
  turnstile_worker_approves,
  users,
  worker_access_levels,
  worker_hik_centrals,
  worker_photos,
  worker_positions,
  workers,
} from '@/db/schema';
import { nextId, pageOf } from '@/modules/turnstile/_shared/helpers';
import {
  getFullPosition,
  getShortPosition,
} from '@/modules/hr/_shared/position-helper';

@Injectable()
export class ApproveAlService {
  private readonly logger = new Logger(ApproveAlService.name);

  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
    private readonly i18n: I18nService,
    private readonly hcp: HikCentralClient,
  ) {}

  // Laravel: WorkerTurnstileApproveService::paginate.
  //
  // Filter: organization_id = user.org OR receiver_organization_id = user.org
  //         + optional search (title ILIKE %search%)
  // Eager-load: organization, receiver_organization, user (worker), receiver_user (worker)
  //
  // TurnstileApproveResource shape:
  //   { id, organization {id,name,group}, receiver_organization {id,name,group},
  //     title, description, approved, user {id, worker:{id,photo,last/first/middle}},
  //     receiver_user {...}, status: 'sended'|'received' }
  async list(q: { page?: number; per_page?: number; search?: string }) {
    const { page, perPage, offset } = pageOf(q);
    const lang = (this.ctx.lang ?? 'uz').toLowerCase();
    const userOrgId = Number(this.ctx.user_or_fail.organization_id ?? 0);

    const orgScopeCond = or(
      eq(turnstile_worker_approves.organization_id, userOrgId),
      eq(turnstile_worker_approves.receiver_organization_id, userOrgId),
    );

    const searchCond = q.search?.trim()
      ? ilike(turnstile_worker_approves.title, `%${q.search.trim()}%`)
      : undefined;

    const where = and(
      notDeleted(turnstile_worker_approves),
      orgScopeCond,
      searchCond,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: turnstile_worker_approves.id,
          organization_id: turnstile_worker_approves.organization_id,
          receiver_organization_id:
            turnstile_worker_approves.receiver_organization_id,
          title: turnstile_worker_approves.title,
          description: turnstile_worker_approves.description,
          approved: turnstile_worker_approves.approved,
          user_id: turnstile_worker_approves.user_id,
          receiver_id: turnstile_worker_approves.receiver_id,
        })
        .from(turnstile_worker_approves)
        .where(where)
        .orderBy(desc(turnstile_worker_approves.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(turnstile_worker_approves)
        .where(where),
    ]);

    // Eager-load organizations.
    const orgIds = [
      ...new Set(
        rows
          .flatMap((r) => [r.organization_id, r.receiver_organization_id])
          .filter(Boolean) as number[],
      ),
    ];
    const orgRows = orgIds.length
      ? await this.db
          .select({
            id: organizations.id,
            name: organizations.name,
            name_ru: organizations.name_ru,
            name_en: organizations.name_en,
            group: organizations.group,
          })
          .from(organizations)
          .where(inArray(organizations.id, orgIds))
      : [];
    const orgMap = new Map(orgRows.map((o) => [Number(o.id), o] as const));

    // Eager-load users + their workers (for user / receiver_user).
    const userIds = [
      ...new Set(
        rows
          .flatMap((r) => [r.user_id, r.receiver_id])
          .filter(Boolean) as number[],
      ),
    ];
    const uRows = userIds.length
      ? await this.db
          .select({ id: users.id, worker_id: users.worker_id })
          .from(users)
          .where(inArray(users.id, userIds))
      : [];
    const workerIds = uRows
      .map((u) => u.worker_id)
      .filter(Boolean) as number[];
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
    const photoUrls = await Promise.all(
      wRows.map((w) => this.minio.fileUrl(w.photo)),
    );
    const wMap = new Map(
      wRows.map(
        (w, i) =>
          [
            Number(w.id),
            {
              id: Number(w.id),
              photo: photoUrls[i],
              last_name: w.last_name,
              first_name: w.first_name,
              middle_name: w.middle_name,
            },
          ] as const,
      ),
    );
    const uMap = new Map(uRows.map((u) => [Number(u.id), u] as const));

    const localizedOrg = (
      o: (typeof orgRows)[number] | undefined,
    ): { id: number; name: string | null; group: boolean } | null => {
      if (!o) return null;
      const name =
        lang === 'ru'
          ? (o.name_ru ?? o.name)
          : lang === 'en'
            ? (o.name_en ?? o.name)
            : o.name;
      return { id: Number(o.id), name, group: !!o.group };
    };
    const userBlock = (uid: number | null) => {
      if (!uid) return null;
      const u = uMap.get(Number(uid));
      const w = u?.worker_id ? wMap.get(Number(u.worker_id)) ?? null : null;
      return { id: Number(uid), worker: w };
    };

    return {
      current_page: page,
      total: Number(total),
      data: rows.map((r) => ({
        id: Number(r.id),
        organization: localizedOrg(orgMap.get(Number(r.organization_id))),
        receiver_organization: localizedOrg(
          orgMap.get(Number(r.receiver_organization_id)),
        ),
        title: r.title,
        description: r.description,
        approved: r.approved,
        user: userBlock(r.user_id),
        receiver_user: userBlock(r.receiver_id),
        status:
          Number(r.organization_id) === userOrgId ? 'sended' : 'received',
      })),
    };
  }

  // Laravel: WorkerTurnstileApproveService::show — findOrFail with
  // worker_positions, access_levels, organization, receiver_organization.
  //
  // Response shape (TurnstileWorkerApproveResource — field order matters):
  //   { id, title, description, organization, receiver_organization,
  //     worker_positions: [{id, worker, post_name, post_short_name}],
  //     access_levels: [{id, name}] }
  //
  // worker_positions[] uses WorkerPositionMinResource:
  //   - post_name      = PositionHelper::getFullPosition  (org.full_name + dept.name + position.name)
  //   - post_short_name = PositionHelper::getShortPosition (dept.name + position.name, ucfirst)
  async show(approvalId: number) {
    const lang = (this.ctx.lang ?? 'uz').toLowerCase();
    const [row] = await this.db
      .select()
      .from(turnstile_worker_approves)
      .where(eq(turnstile_worker_approves.id, approvalId))
      .limit(1);
    if (!row) throw new BusinessException(404, this.i18n.t('messages.not_found'));

    // organizations (sender + receiver)
    const orgIds = [
      row.organization_id,
      row.receiver_organization_id,
    ].filter(Boolean) as number[];
    const orgRows = orgIds.length
      ? await this.db
          .select({
            id: organizations.id,
            name: organizations.name,
            name_ru: organizations.name_ru,
            name_en: organizations.name_en,
            group: organizations.group,
          })
          .from(organizations)
          .where(inArray(organizations.id, orgIds))
      : [];
    const orgMap = new Map(orgRows.map((o) => [Number(o.id), o] as const));
    const localizedOrg = (id: number | null) => {
      if (!id) return null;
      const o = orgMap.get(Number(id));
      if (!o) return null;
      const name =
        lang === 'ru'
          ? (o.name_ru ?? o.name)
          : lang === 'en'
            ? (o.name_en ?? o.name)
            : o.name;
      return { id: Number(o.id), name, group: !!o.group };
    };

    // worker_positions (via pivot) — eager workers + org.full_name + dept.{name,level} + position.name.
    const wpRows = await this.db
      .select({
        wp_id: worker_positions.id,
        worker_id: worker_positions.worker_id,
        organization_id: worker_positions.organization_id,
        department_id: worker_positions.department_id,
        position_id: worker_positions.position_id,
      })
      .from(turnstile_worker_approve_worker_positions)
      .innerJoin(
        worker_positions,
        eq(
          worker_positions.id,
          turnstile_worker_approve_worker_positions.worker_position_id,
        ),
      )
      .where(
        eq(
          turnstile_worker_approve_worker_positions.turnstile_worker_approve_id,
          approvalId,
        ),
      );
    const wIds = [
      ...new Set(wpRows.map((r) => r.worker_id).filter(Boolean)),
    ] as number[];
    const wpOrgIds = [
      ...new Set(wpRows.map((r) => r.organization_id).filter(Boolean)),
    ] as number[];
    const wpDepIds = [
      ...new Set(wpRows.map((r) => r.department_id).filter(Boolean)),
    ] as number[];
    const wpPosIds = [
      ...new Set(wpRows.map((r) => r.position_id).filter(Boolean)),
    ] as number[];

    const [wRows2, dRows, pRows, wpOrgRows] = await Promise.all([
      wIds.length
        ? this.db
            .select({
              id: workers.id,
              last_name: workers.last_name,
              first_name: workers.first_name,
              middle_name: workers.middle_name,
              photo: workers.photo,
            })
            .from(workers)
            .where(inArray(workers.id, wIds))
        : Promise.resolve([] as any[]),
      wpDepIds.length
        ? this.db
            .select({
              id: departments.id,
              name: departments.name,
              level: departments.level,
            })
            .from(departments)
            .where(inArray(departments.id, wpDepIds))
        : Promise.resolve([] as any[]),
      wpPosIds.length
        ? this.db
            .select({ id: positions.id, name: positions.name })
            .from(positions)
            .where(inArray(positions.id, wpPosIds))
        : Promise.resolve([] as any[]),
      wpOrgIds.length
        ? this.db
            .select({
              id: organizations.id,
              full_name: organizations.full_name,
            })
            .from(organizations)
            .where(inArray(organizations.id, wpOrgIds))
        : Promise.resolve([] as any[]),
    ]);
    const wPhotoUrls = await Promise.all(
      (wRows2 as any[]).map((w) => this.minio.fileUrl(w.photo)),
    );
    const wMap = new Map(
      (wRows2 as any[]).map(
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
    const dMap = new Map(
      (dRows as any[]).map((d) => [Number(d.id), d] as const),
    );
    const pMap = new Map(
      (pRows as any[]).map((p) => [Number(p.id), p] as const),
    );
    const wpOrgFullMap = new Map(
      (wpOrgRows as any[]).map(
        (o) => [Number(o.id), o.full_name as string | null] as const,
      ),
    );

    // access_levels (via pivot)
    const alRows = await this.db
      .select({
        id: hik_central_access_levels.id,
        name: hik_central_access_levels.name,
      })
      .from(turnstile_worker_access_levels)
      .innerJoin(
        hik_central_access_levels,
        eq(
          hik_central_access_levels.id,
          turnstile_worker_access_levels.hik_central_access_level_id,
        ),
      )
      .where(
        eq(
          turnstile_worker_access_levels.turnstile_worker_approve_id,
          approvalId,
        ),
      );

    // Field order matches Laravel TurnstileWorkerApproveResource exactly.
    return {
      id: Number(row.id),
      title: row.title,
      description: row.description,
      organization: localizedOrg(row.organization_id),
      receiver_organization: localizedOrg(row.receiver_organization_id),
      worker_positions: wpRows.map((r) => {
        const pos = r.position_id ? pMap.get(Number(r.position_id)) : null;
        const dep = r.department_id ? dMap.get(Number(r.department_id)) : null;
        const orgFull = r.organization_id
          ? wpOrgFullMap.get(Number(r.organization_id)) ?? null
          : null;
        const wpShape = {
          position_name: pos?.name ?? null,
          department_name: dep?.name ?? null,
          department_level: dep?.level ?? null,
          organization_full_name: orgFull,
        };
        return {
          id: Number(r.wp_id),
          worker: r.worker_id ? wMap.get(Number(r.worker_id)) ?? null : null,
          post_name: getFullPosition(wpShape),
          post_short_name: getShortPosition(wpShape),
        };
      }),
      access_levels: alRows.map((a) => ({ id: Number(a.id), name: a.name })),
    };
  }

  // Laravel: store — create OR update by approval_id, then sync pivots.
  async create(body: {
    receiver_organization_id?: number | string;
    title?: string;
    description?: string;
    worker_position_ids?: number[];
    access_levels?: number[];
    approval_id?: number;
  }) {
    const receiverOrgId = Number(body.receiver_organization_id);
    const userOrgId = Number(this.ctx.user_or_fail.organization_id ?? 0);
    const userId = Number(this.ctx.user_or_fail.id);

    if (!receiverOrgId || !body.title) {
      throw new BusinessException(422, 'receiver_organization_id and title required');
    }
    // Laravel: receiver_organization === user.org → 422 receiver_organization_is_you
    if (receiverOrgId === userOrgId) {
      throw new BusinessException(
        422,
        this.i18n.t('messages.turnstile.receiver_organization_is_you'),
      );
    }

    let approvalId: number;
    if (body.approval_id) {
      const [existing] = await this.db
        .select({
          id: turnstile_worker_approves.id,
          approved: turnstile_worker_approves.approved,
        })
        .from(turnstile_worker_approves)
        .where(eq(turnstile_worker_approves.id, Number(body.approval_id)))
        .limit(1);
      if (!existing) {
        throw new BusinessException(404, this.i18n.t('messages.not_found'));
      }
      if (Number(existing.approved) === 2) {
        throw new BusinessException(
          400,
          this.i18n.t('messages.turnstile.approved_dont_edit'),
        );
      }
      approvalId = Number(existing.id);
      await this.db
        .update(turnstile_worker_approves)
        .set({
          receiver_organization_id: receiverOrgId,
          title: body.title,
          description: body.description ?? null,
          organization_id: userOrgId,
          user_id: userId,
          updated_at: sql`NOW()`,
        } as any)
        .where(eq(turnstile_worker_approves.id, approvalId));
    } else {
      approvalId = await nextId(this.db, turnstile_worker_approves);
      await this.db.insert(turnstile_worker_approves).values({
        id: approvalId,
        organization_id: userOrgId,
        user_id: userId,
        receiver_organization_id: receiverOrgId,
        title: body.title,
        description: body.description ?? null,
        approved: 1,
        created_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      } as any);
    }

    // Sync pivots (delete-then-insert).
    const wpIds = (body.worker_position_ids ?? [])
      .map((n) => Number(n))
      .filter((n) => Number.isInteger(n) && n > 0);
    const alIds = (body.access_levels ?? [])
      .map((n) => Number(n))
      .filter((n) => Number.isInteger(n) && n > 0);
    await Promise.all([
      this.db
        .delete(turnstile_worker_approve_worker_positions)
        .where(
          eq(
            turnstile_worker_approve_worker_positions.turnstile_worker_approve_id,
            approvalId,
          ),
        ),
      this.db
        .delete(turnstile_worker_access_levels)
        .where(
          eq(
            turnstile_worker_access_levels.turnstile_worker_approve_id,
            approvalId,
          ),
        ),
    ]);
    if (wpIds.length) {
      await this.db
        .insert(turnstile_worker_approve_worker_positions)
        .values(
          wpIds.map((wp) => ({
            turnstile_worker_approve_id: approvalId,
            worker_position_id: wp,
          })),
        );
    }
    if (alIds.length) {
      await this.db.insert(turnstile_worker_access_levels).values(
        alIds.map((al) => ({
          turnstile_worker_approve_id: approvalId,
          hik_central_access_level_id: al,
        })),
      );
    }
    return { id: approvalId };
  }

  // Update — alias for create with approval_id (Laravel `store` handles both).
  async update(id: number, body: Record<string, unknown>) {
    return this.create({ ...(body as any), approval_id: id });
  }

  // Laravel: destroy — reject if approved === 2 (approved_dont_delete).
  async remove(id: number) {
    const [row] = await this.db
      .select({ approved: turnstile_worker_approves.approved })
      .from(turnstile_worker_approves)
      .where(eq(turnstile_worker_approves.id, id))
      .limit(1);
    if (!row) throw new BusinessException(404, this.i18n.t('messages.not_found'));
    if (Number(row.approved) === 2) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.turnstile.approved_dont_delete'),
      );
    }
    await this.db
      .update(turnstile_worker_approves)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(turnstile_worker_approves.id, id));
  }

  // Laravel: approve (POST /approve-al/approved/{id}).
  //   status='approved' → approved=2 + dispatch HCP sync job
  //   else              → approved=3 (rejected)
  //
  // Laravel uses ShouldQueue → endpoint returns immediately, HCP sync runs in
  // background. Bu yerda ham fire-and-forget pattern: status'ni update qilamiz,
  // response qaytaramiz, HCP sync ni `setImmediate` orqali keyinroq ishga tushiramiz.
  async approve(approvalId: number, body: { status?: string }) {
    const status = String(body.status ?? '').toLowerCase();
    const approved = status === 'approved' ? 2 : 3;
    const [row] = await this.db
      .select({ id: turnstile_worker_approves.id })
      .from(turnstile_worker_approves)
      .where(eq(turnstile_worker_approves.id, approvalId))
      .limit(1);
    if (!row) throw new BusinessException(404, this.i18n.t('messages.not_found'));
    await this.db
      .update(turnstile_worker_approves)
      .set({ approved, updated_at: sql`NOW()` } as any)
      .where(eq(turnstile_worker_approves.id, approvalId));

    if (status === 'approved') {
      // Fire-and-forget HCP sync (Laravel: ApprovedWorkersToAccessLevelJob::dispatch).
      // Endpoint doesn't await — errors are logged but don't fail the request.
      setImmediate(() => {
        this.dispatchHcpSync(approvalId).catch((e) => {
          this.logger.error(
            `HCP sync failed for approval ${approvalId}`,
            (e as Error).stack ?? e,
          );
        });
      });
    }
  }

  // Laravel: ApprovedWorkersToAccessLevelJob::handle.
  //
  // Algorithm:
  //   1) Load worker_positions (with worker + photos) + access_levels for approval.
  //   2) For each worker_position:
  //      a. Take worker's LAST photo (worker_photos ORDER BY id DESC LIMIT 1).
  //      b. Convert to base64 (download from MinIO).
  //      c. Call HCP addWorkerToServer → returns personId.
  //      d. Upsert worker_hik_centrals (worker_id, hik_central_key=1, person_id).
  //      e. For each access_level: upsert worker_access_levels.
  //      f. Collect personIds.
  //   3) For each access_level: attachWorkerToAccessLevel(personIds, al.hcid).
  private async dispatchHcpSync(approvalId: number): Promise<void> {
    // Default endTime = +2 years (Laravel: now()->addYear(2)).
    const endTime = new Date();
    endTime.setUTCFullYear(endTime.getUTCFullYear() + 2);
    const endTimeStr = endTime.toISOString().slice(0, 19).replace('T', ' ');

    // 1) Load worker_positions via pivot + their worker.
    const wpRows = await this.db
      .select({
        wp_id: worker_positions.id,
        worker_id: worker_positions.worker_id,
        department_id: worker_positions.department_id,
      })
      .from(turnstile_worker_approve_worker_positions)
      .innerJoin(
        worker_positions,
        eq(
          worker_positions.id,
          turnstile_worker_approve_worker_positions.worker_position_id,
        ),
      )
      .where(
        eq(
          turnstile_worker_approve_worker_positions.turnstile_worker_approve_id,
          approvalId,
        ),
      );
    if (!wpRows.length) return;

    const workerIds = [
      ...new Set(wpRows.map((r) => r.worker_id).filter(Boolean)),
    ] as number[];
    if (!workerIds.length) return;

    const [wRows, alRows] = await Promise.all([
      this.db
        .select({
          id: workers.id,
          last_name: workers.last_name,
          first_name: workers.first_name,
          middle_name: workers.middle_name,
          sex: workers.sex,
        })
        .from(workers)
        .where(inArray(workers.id, workerIds)),
      // 2) Load approval's access_levels with their HCP id (hik_central_access_levels.hik_central_access_level_id).
      this.db
        .select({
          id: hik_central_access_levels.id,
          hcid: hik_central_access_levels.hik_central_access_level_id,
        })
        .from(turnstile_worker_access_levels)
        .innerJoin(
          hik_central_access_levels,
          eq(
            hik_central_access_levels.id,
            turnstile_worker_access_levels.hik_central_access_level_id,
          ),
        )
        .where(
          eq(
            turnstile_worker_access_levels.turnstile_worker_approve_id,
            approvalId,
          ),
        ),
    ]);
    if (!alRows.length) return;
    const wMap = new Map(wRows.map((w) => [Number(w.id), w] as const));

    // Per-worker: last photo.
    const lastPhotos = await this.db
      .select({
        id: worker_photos.id,
        worker_id: worker_photos.worker_id,
        photo: worker_photos.photo,
      })
      .from(worker_photos)
      .where(
        and(
          inArray(worker_photos.worker_id, workerIds),
          notDeleted(worker_photos),
        ),
      )
      .orderBy(asc(worker_photos.worker_id), desc(worker_photos.id));
    const lastPhotoByWorker = new Map<
      number,
      { id: number; photo: string | null }
    >();
    for (const p of lastPhotos) {
      const wid = Number(p.worker_id);
      if (!lastPhotoByWorker.has(wid)) {
        lastPhotoByWorker.set(wid, { id: Number(p.id), photo: p.photo });
      }
    }

    // orgIndexCode — Laravel hardcodes "1" (root org) in the job; no per-dept mapping here.
    // (hik_central_departments is a separate mapping but the job doesn't use it.)
    void hik_central_departments; // imported but unused in this code path
    const ORG_INDEX_CODE = '1';

    const personIds: string[] = [];

    // 3) Per-worker: addWorkerToServer + upsert worker_hik_centrals + upsert worker_access_levels.
    for (const wp of wpRows) {
      const workerId = Number(wp.worker_id);
      const worker = wMap.get(workerId);
      const lastPhoto = lastPhotoByWorker.get(workerId);
      if (!worker || !lastPhoto?.photo) continue;

      // Convert photo to base64 (download from MinIO).
      let base64: string;
      try {
        const buf = await this.minio.getObject(lastPhoto.photo);
        base64 = buf.toString('base64');
      } catch (e) {
        this.logger.warn(
          `MinIO download failed for worker ${workerId} photo ${lastPhoto.photo}`,
          (e as Error).message,
        );
        continue;
      }

      const orgIndexCode = ORG_INDEX_CODE;

      const res = await this.hcp.addWorkerToServer(
        {
          id: worker.id,
          last_name: worker.last_name,
          first_name: worker.first_name,
          middle_name: worker.middle_name,
          sex: worker.sex,
        },
        base64,
        endTimeStr,
        orgIndexCode,
      );
      if (!res.status || !res.personId) {
        this.logger.warn(
          `HCP addWorkerToServer failed for worker ${workerId}: ${res.msg ?? 'no personId'}`,
        );
        continue;
      }
      const personId = Number(res.personId);

      // Upsert worker_hik_centrals (unique: worker_id + hik_central_key + person_id).
      const [existingHcp] = await this.db
        .select({ id: worker_hik_centrals.id })
        .from(worker_hik_centrals)
        .where(
          and(
            eq(worker_hik_centrals.worker_id, workerId),
            eq(worker_hik_centrals.hik_central_key, 1),
            eq(worker_hik_centrals.hik_central_person_id, personId),
          ),
        )
        .limit(1);
      let hcpId: number;
      if (existingHcp) {
        hcpId = Number(existingHcp.id);
        await this.db
          .update(worker_hik_centrals)
          .set({
            worker_photo_id: lastPhoto.id,
            updated_at: sql`NOW()`,
          } as any)
          .where(eq(worker_hik_centrals.id, hcpId));
      } else {
        hcpId = await nextId(this.db, worker_hik_centrals);
        await this.db.insert(worker_hik_centrals).values({
          id: hcpId,
          worker_id: workerId,
          hik_central_key: 1,
          hik_central_person_id: personId,
          worker_photo_id: lastPhoto.id,
          created_at: sql`NOW()`,
          updated_at: sql`NOW()`,
        } as any);
      }

      // Upsert worker_access_levels for each access_level.
      for (const al of alRows) {
        const [existingWal] = await this.db
          .select({ id: worker_access_levels.id })
          .from(worker_access_levels)
          .where(
            and(
              eq(worker_access_levels.worker_id, workerId),
              eq(
                worker_access_levels.hik_central_access_level_id,
                Number(al.id),
              ),
            ),
          )
          .limit(1);
        if (existingWal) {
          await this.db
            .update(worker_access_levels)
            .set({
              worker_hik_central_id: hcpId,
              worker_photo_id: lastPhoto.id,
              hik_central_key: 1,
              hik_central_person_id: personId,
              to: endTimeStr,
              updated_at: sql`NOW()`,
            } as any)
            .where(eq(worker_access_levels.id, existingWal.id));
        } else {
          const walId = await nextId(this.db, worker_access_levels);
          await this.db.insert(worker_access_levels).values({
            id: walId,
            worker_id: workerId,
            worker_hik_central_id: hcpId,
            worker_photo_id: lastPhoto.id,
            hik_central_key: 1,
            hik_central_person_id: personId,
            hik_central_access_level_id: Number(al.id),
            to: endTimeStr,
            created_at: sql`NOW()`,
            updated_at: sql`NOW()`,
          } as any);
        }
      }
      personIds.push(String(personId));
    }

    // 4) For each access_level: attach all collected personIds in HCP.
    if (personIds.length) {
      for (const al of alRows) {
        try {
          await this.hcp.attachWorkerToAccessLevel(
            personIds,
            String(al.hcid),
          );
        } catch (e) {
          this.logger.warn(
            `HCP attach failed for access_level ${al.id}: ${(e as Error).message}`,
          );
        }
      }
    }
  }

  // Laravel: accessLevels — HikCentralAccessLevel::select(id, name), optionally
  // filtered by organization_id via OrganizationAccessLevel join.
  async accessLevels(q: { organization_id?: number | string }) {
    const orgId = Number(q.organization_id ?? 0);
    if (orgId) {
      const oal = await this.db
        .select({
          hik_central_access_level_id:
            organization_access_levels.hik_central_access_level_id,
        })
        .from(organization_access_levels)
        .where(eq(organization_access_levels.organization_id, orgId));
      if (!oal.length) return [];
      const ids = oal.map((o) => o.hik_central_access_level_id);
      return this.db
        .select({
          id: hik_central_access_levels.id,
          name: hik_central_access_levels.name,
        })
        .from(hik_central_access_levels)
        .where(
          and(
            inArray(hik_central_access_levels.id, ids),
            notDeleted(hik_central_access_levels),
          ),
        );
    }
    return this.db
      .select({
        id: hik_central_access_levels.id,
        name: hik_central_access_levels.name,
      })
      .from(hik_central_access_levels)
      .where(notDeleted(hik_central_access_levels));
  }
}
