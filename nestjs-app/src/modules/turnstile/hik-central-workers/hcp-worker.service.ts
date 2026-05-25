// HCP Worker service. Laravel: HikCentralWorkerController + HikCentralController
// (workers section), TurnstileController (addedLogs, invalidWorkersByHcp).

import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import {
  export_worker_errors,
  export_worker_to_hik_central_jobs,
  hcp_added_worker_logs,
  hik_central_access_levels,
  organization_access_levels,
  worker_hik_centrals,
  workers,
} from '@/db/schema';
import { nextId, pageOf } from '@/modules/turnstile/_shared/helpers';
import type {
  AddHcpWorkerDto,
  QueryHcpWorkerDto,
  SyncWorkersToHcpDto,
} from '@/modules/turnstile/hik-central-workers/dto/hcp-worker.dto';

@Injectable()
export class HcpWorkerService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
  ) {}

  // Laravel: HikCentralWorkerController::index — list of worker_hik_centrals.
  async list(q: QueryHcpWorkerDto) {
    const { page, perPage, offset } = pageOf(q);
    const where = notDeleted(worker_hik_centrals);
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(worker_hik_centrals)
        .where(where)
        .orderBy(desc(worker_hik_centrals.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(worker_hik_centrals).where(where),
    ]);
    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows,
    };
  }

  // Laravel: HikCentralWorkerController::showAccessLevels — worker_hik_centrals
  // for given worker_id.
  async showAccessLevels(q: { worker_id?: number }) {
    if (!q.worker_id) return [];
    return this.db
      .select()
      .from(worker_hik_centrals)
      .where(eq(worker_hik_centrals.worker_id, Number(q.worker_id)));
  }

  // Laravel: HikCentralWorkerController::showErrorAL — workers with HCP AC errors.
  async showErrorAL(q: QueryHcpWorkerDto) {
    const { page, perPage, offset } = pageOf(q);
    const conds: any[] = [notDeleted(export_worker_errors)];
    if (q.job_id) {
      conds.push(
        eq(
          export_worker_errors.export_worker_to_hik_central_job_id,
          Number(q.job_id),
        ),
      );
    }
    const where = and(...conds);
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(export_worker_errors)
        .where(where)
        .orderBy(desc(export_worker_errors.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(export_worker_errors)
        .where(where),
    ]);
    return this.attachWorker(rows, page, perPage, Number(total));
  }

  // Laravel: HikCentralController::accessLevels (workers/access-levels route).
  async accessLevels() {
    return this.db
      .select({
        id: hik_central_access_levels.id,
        name: hik_central_access_levels.name,
      })
      .from(hik_central_access_levels)
      .where(notDeleted(hik_central_access_levels));
  }

  // Laravel: HikCentralController::groups — calls external HCP. Stub.
  async groups() {
    return [] as Array<unknown>;
  }

  // Laravel: HikCentralWorkerController::destroy — soft-delete worker_hik_central.
  async destroy(workerId: number) {
    await this.db
      .update(worker_hik_centrals)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(worker_hik_centrals.worker_id, workerId));
  }

  // Laravel: HikCentralWorkerController::addWorkerToHikCentral — upserts row.
  async addWorker(dto: AddHcpWorkerDto) {
    const [existing] = await this.db
      .select({ id: worker_hik_centrals.id })
      .from(worker_hik_centrals)
      .where(eq(worker_hik_centrals.worker_id, dto.worker_id))
      .limit(1);
    if (existing) return { id: existing.id, restored: true };
    const id = await nextId(this.db, worker_hik_centrals);
    await this.db
      .insert(worker_hik_centrals)
      .values({ id, worker_id: dto.worker_id } as any);
    return { id };
  }

  // Laravel: external face/access-level updates. Stubs.
  async updateFace() {
    return { face_updated: true };
  }
  async refreshAccessLevel() {
    return { refreshed: true };
  }

  // Laravel: HikCentralController::syncWorkersToHikCentral — creates job + upserts OAL.
  async syncWorkersToHikCentral(dto: SyncWorkersToHcpDto) {
    const userId = this.ctx.user_or_fail.id;
    const id = await nextId(this.db, export_worker_to_hik_central_jobs);
    await this.db.insert(export_worker_to_hik_central_jobs).values({
      id,
      user_id: userId,
      name: dto.name,
      status: 1,
    });
    const [existing] = await this.db
      .select({ id: organization_access_levels.id })
      .from(organization_access_levels)
      .where(
        and(
          eq(organization_access_levels.organization_id, dto.organization_id),
          eq(
            organization_access_levels.hik_central_access_level_id,
            dto.access_level_id,
          ),
        ),
      )
      .limit(1);
    if (!existing) {
      const oalId = await nextId(this.db, organization_access_levels);
      await this.db.insert(organization_access_levels).values({
        id: oalId,
        organization_id: dto.organization_id,
        hik_central_access_level_id: dto.access_level_id,
      });
    }
    return { job_id: id, dispatched: true };
  }

  // Laravel: HikCentralController::jobs — paginated export jobs.
  async jobs(q: QueryHcpWorkerDto) {
    const { page, perPage, offset } = pageOf(q);
    const where = notDeleted(export_worker_to_hik_central_jobs);
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(export_worker_to_hik_central_jobs)
        .where(where)
        .orderBy(desc(export_worker_to_hik_central_jobs.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(export_worker_to_hik_central_jobs)
        .where(where),
    ]);
    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows,
    };
  }

  // Laravel: HikCentralController::errorWorkers — requires job_id.
  async errorWorkers(q: QueryHcpWorkerDto) {
    const { page, perPage, offset } = pageOf(q);
    if (!q.job_id) throw new BusinessException(422, 'job_id is required');
    const where = and(
      eq(
        export_worker_errors.export_worker_to_hik_central_job_id,
        Number(q.job_id),
      ),
      notDeleted(export_worker_errors),
    );
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(export_worker_errors)
        .where(where)
        .orderBy(desc(export_worker_errors.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(export_worker_errors)
        .where(where),
    ]);
    return this.attachWorker(rows, page, perPage, Number(total));
  }

  // Laravel: TurnstileController::addedLogs — workers added to HCP audit log.
  async addedLogs(q: QueryHcpWorkerDto) {
    const { page, perPage, offset } = pageOf(q);
    const where = notDeleted(hcp_added_worker_logs);
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(hcp_added_worker_logs)
        .where(where)
        .orderBy(desc(hcp_added_worker_logs.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(hcp_added_worker_logs)
        .where(where),
    ]);
    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows,
    };
  }

  // Laravel: TurnstileController::invalidWorkersByHcp.
  // Returns `{ time, data: paginate-result }` where source is Cache('hcp_invalid_workers').
  // No cache here — empty.
  async invalidWorkersByHcp() {
    return {
      time: new Date().toISOString().replace('T', ' ').slice(0, 19),
      data: {
        current_page: 1,
        per_page: 10,
        total: 0,
        data: [] as Array<unknown>,
      },
    };
  }

  // ---------- helpers ----------
  private async attachWorker<T extends { worker_id: number }>(
    rows: T[],
    page: number,
    perPage: number,
    total: number,
  ) {
    const workerIds = [
      ...new Set(rows.map((r) => r.worker_id).filter(Boolean)),
    ];
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
    const wMap = new Map<number, (typeof wRows)[number]>(
      wRows.map((w) => [w.id, w] as const),
    );
    return {
      current_page: page,
      per_page: perPage,
      total,
      data: rows.map((r) => ({ ...r, worker: wMap.get(r.worker_id) ?? null })),
    };
  }
}
