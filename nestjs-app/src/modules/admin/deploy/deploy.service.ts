// Admin Deploy service. Laravel: DeployController + DeployService.
// 4 endpoint: index, logBackend (store), uploadFrontend (upload), publish.
// File upload + frontend backup operations — stub (deployment-specific).

import { Injectable } from '@nestjs/common';
import { count, desc, eq, inArray, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { RequestContext } from '@/common/context/request.context';
import { deploy_logs, users, workers } from '@/db/schema';
import type {
  DeployListQueryDto,
  DeployPublishDto,
  DeployStoreDto,
  DeployUploadDto,
} from '@/modules/admin/deploy/dto/deploy.dto';

interface WorkerBrief {
  id: number;
  last_name: string | null;
  first_name: string | null;
  middle_name: string | null;
}

@Injectable()
export class DeployService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
  ) {}

  /** GET /admin/deploy/logs — paginated. */
  async list(q: DeployListQueryDto) {
    const page = Math.max(1, Number(q?.page ?? 1));
    const perPage = Math.min(1000, Math.max(1, Number(q?.per_page ?? 10)));
    const offset = (page - 1) * perPage;

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(deploy_logs)
        .orderBy(desc(deploy_logs.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(deploy_logs),
    ]);

    const data = await this.enrichRows(rows);
    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data,
    };
  }

  /** POST /admin/deploy/logs — backend deploy log + auto version bump. */
  async logBackend(dto: DeployStoreDto) {
    const userId = this.ctx.user?.id;
    if (!userId) throw new BusinessException(401, 'unauthorized');

    const nextVersion = await this.nextVersion();
    const [row] = await this.db
      .insert(deploy_logs)
      .values({
        user_id: userId,
        type: 'back',
        changes: dto.changes,
        version: nextVersion,
        published: dto.published ?? false,
        created_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      })
      .returning();
    return { id: row.id, version: row.version };
  }

  /**
   * POST /admin/deploy/upload — Laravel: backupCurrentFrontend + zip extract.
   * Stub: deployment-specific (kept simple — log only, no file ops).
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async uploadFrontend(_dto: DeployUploadDto) {
    return { success: true, stub: true, message: 'Frontend upload stub' };
  }

  /** PUT /admin/deploy/publish/:id — update published flag. */
  async publish(id: number, dto: DeployPublishDto) {
    const [row] = await this.db
      .update(deploy_logs)
      .set({ published: dto.published, updated_at: sql`NOW()` })
      .where(eq(deploy_logs.id, id))
      .returning({ id: deploy_logs.id });
    if (!row) throw new BusinessException(404, 'not_found');
  }

  // -----------------------------------------
  // Helpers
  // -----------------------------------------

  /** Laravel VersionService.nextVersion — patch bump 0-9 → minor → major. */
  private async nextVersion(): Promise<string> {
    const [last] = await this.db
      .select({ version: deploy_logs.version })
      .from(deploy_logs)
      .orderBy(desc(deploy_logs.version))
      .limit(1);
    if (!last) return '1.0.0';
    return this.bump(last.version);
  }

  private bump(version: string): string {
    const parts = version.split('.').map((p) => Number.parseInt(p, 10));
    if (parts.length !== 3 || parts.some(Number.isNaN)) return '1.0.0';
    let [major, minor, patch] = parts;
    if (patch >= 9) {
      patch = 0;
      minor++;
    } else {
      patch++;
    }
    if (minor > 9) {
      minor = 0;
      major++;
    }
    return `${major}.${minor}.${patch}`;
  }

  private async enrichRows(rows: Array<typeof deploy_logs.$inferSelect>) {
    if (!rows.length) return [];
    const userIds = [...new Set(rows.map((r) => r.user_id))];
    const userRows = await this.db
      .select({
        id: users.id,
        phone: users.phone,
        worker_id: users.worker_id,
      })
      .from(users)
      .where(inArray(users.id, userIds));
    const workerIds = userRows
      .map((u) => u.worker_id)
      .filter((x): x is number => x != null);
    const workerRows: WorkerBrief[] = workerIds.length
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
    const userMap: Record<number, (typeof userRows)[number]> = {};
    for (const u of userRows) userMap[u.id] = u;
    const workerMap: Record<number, WorkerBrief> = {};
    for (const w of workerRows) workerMap[w.id] = w;

    return rows.map((r) => {
      const u = userMap[r.user_id];
      const w = u?.worker_id != null ? workerMap[u.worker_id] : undefined;
      return {
        id: r.id,
        user: u
          ? {
              id: u.id,
              phone: u.phone,
              worker: w
                ? {
                    id: w.id,
                    last_name: w.last_name,
                    first_name: w.first_name,
                    middle_name: w.middle_name,
                  }
                : null,
            }
          : null,
        changes: r.changes,
        version: r.version,
        type: r.type,
        published: r.published,
        created_at: r.created_at,
      };
    });
  }
}
