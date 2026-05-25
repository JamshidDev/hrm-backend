// Worker Turnstile Approve service. Laravel: WorkerTurnstileApproveController.

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import {
  hik_central_access_levels,
  organization_access_levels,
  turnstile_worker_approves,
} from '@/db/schema';
import { nextId, pageOf } from '@/modules/turnstile/_shared/helpers';

@Injectable()
export class ApproveAlService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  async list(q: { page?: number; per_page?: number }) {
    const { page, perPage, offset } = pageOf(q);
    const where = notDeleted(turnstile_worker_approves);
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
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
    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows,
    };
  }

  // Laravel: findOrFail → 404 if not found.
  async show(id: number) {
    const [row] = await this.db
      .select()
      .from(turnstile_worker_approves)
      .where(eq(turnstile_worker_approves.id, id))
      .limit(1);
    if (!row) throw new BusinessException(404, 'not_found');
    return row;
  }

  async create(body: Record<string, unknown>) {
    const id = await nextId(this.db, turnstile_worker_approves);
    await this.db
      .insert(turnstile_worker_approves)
      .values({ id, ...(body as any) });
    return { id };
  }

  async update(id: number, body: Record<string, unknown>) {
    await this.db
      .update(turnstile_worker_approves)
      .set({ ...body, updated_at: sql`NOW()` })
      .where(eq(turnstile_worker_approves.id, id));
  }

  async remove(id: number) {
    await this.db
      .update(turnstile_worker_approves)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(turnstile_worker_approves.id, id));
  }

  async approve(approvalId: number, body: Record<string, unknown>) {
    await this.db
      .update(turnstile_worker_approves)
      .set({
        approved: Number((body as any).status ?? (body as any).approved ?? 2),
        approved_comment: (body as any).comment ?? null,
        updated_at: sql`NOW()`,
      })
      .where(eq(turnstile_worker_approves.id, approvalId));
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
