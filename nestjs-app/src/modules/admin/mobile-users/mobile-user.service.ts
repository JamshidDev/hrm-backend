// Admin Mobile Users service. Laravel: MobileController (index + show).

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { MinioService } from '@/shared/minio/minio.service';
import { buildWorkerSearchCond } from '@/modules/hr/_shared/worker-search.helper';
import {
  liveness_session_photos,
  liveness_sessions,
  user_mobile_keys,
  users,
  workers,
} from '@/db/schema';
import type { MobileUserListQueryDto } from '@/modules/admin/mobile-users/dto/mobile-user.dto';

interface WorkerBrief {
  id: number;
  last_name: string | null;
  first_name: string | null;
  middle_name: string | null;
  photo: string | null;
}

@Injectable()
export class AdminMobileUserService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly minio: MinioService,
  ) {}

  // Carbon toDateTimeString() — "Y-m-d H:i:s".
  private toDateTimeString(v: string | null): string | null {
    if (!v) return null;
    const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/.exec(v);
    return m ? `${m[1]} ${m[2]}` : v;
  }

  /** GET /admin/mobile/users — Laravel: paginated UserMobileKey + user.worker. */
  async list(q: MobileUserListQueryDto) {
    const page = Math.max(1, Number(q?.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(q?.per_page ?? 10)));
    const offset = (page - 1) * perPage;

    // Laravel: whereHas('user.worker', searchByFullName) — term-split full-name.
    // workers ALIASSIZ (buildWorkerSearchCond `workers.*` ishlatadi).
    const conds: SQL[] = [];
    const workerCond = q.search ? buildWorkerSearchCond(q.search) : undefined;
    if (workerCond) {
      conds.push(
        sql`EXISTS (
          SELECT 1 FROM ${users}
          JOIN ${workers} ON ${workers.id} = ${users.worker_id}
          WHERE ${users.id} = ${user_mobile_keys.user_id}
            AND ${workerCond}
        )`,
      );
    }
    const where = conds.length ? and(...conds) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(user_mobile_keys)
        .where(where)
        .orderBy(desc(user_mobile_keys.created_at))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(user_mobile_keys).where(where),
    ]);

    const data = await this.enrichRows(rows);
    return {
      current_page: page,
      total: Number(total),
      data,
    };
  }

  /** GET /admin/mobile/users/:id — device + liveness sessions. */
  async show(id: number) {
    const [device] = await this.db
      .select()
      .from(user_mobile_keys)
      .where(eq(user_mobile_keys.id, id))
      .limit(1);
    if (!device) throw new BusinessException(404, 'not_found');

    const [enrichedDevice] = await this.enrichRows([device]);

    // Liveness sessions for this user
    const sessions = await this.db
      .select()
      .from(liveness_sessions)
      .where(eq(liveness_sessions.user_id, device.user_id));

    const sessionIds = sessions.map((s) => s.id);
    const photos = sessionIds.length
      ? await this.db
          .select()
          .from(liveness_session_photos)
          .where(
            inArray(liveness_session_photos.liveness_session_id, sessionIds),
          )
      : [];
    const photosBySession: Record<number, typeof photos> = {};
    for (const p of photos) {
      (photosBySession[p.liveness_session_id] ??= []).push(p);
    }

    // Laravel: face_status bo'lsa [refImage, liveImage], aks holda photos — barchasi fileUrl.
    const sessionItems = await Promise.all(
      sessions.map(async (item) => {
        let rawPhotos: (string | null)[] = [];
        if (item.face_status) {
          if (item.refImage) rawPhotos.push(item.refImage);
          if (item.liveImage) rawPhotos.push(item.liveImage);
        } else {
          rawPhotos = (photosBySession[item.id] ?? []).map((p) => p.photo);
        }
        const photoUrls = await Promise.all(
          rawPhotos.map((p) => this.minio.fileUrl(p)),
        );
        return {
          id: item.id,
          status: item.status,
          success: item.success,
          created_at: this.toDateTimeString(item.created_at),
          photos: photoUrls,
        };
      }),
    );

    return { device: enrichedDevice, sessions: sessionItems };
  }

  // -----------------------------------------
  // Helpers
  // -----------------------------------------

  private async enrichRows(rows: Array<typeof user_mobile_keys.$inferSelect>) {
    if (!rows.length) return [];
    const userIds = [...new Set(rows.map((r) => r.user_id))];
    const userRows = await this.db
      .select({
        id: users.id,
        uuid: users.uuid,
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
            photo: workers.photo,
          })
          .from(workers)
          .where(inArray(workers.id, workerIds))
      : [];
    const workerMap: Record<number, WorkerBrief> = {};
    for (const w of workerRows) workerMap[w.id] = w;
    const userMap: Record<number, (typeof userRows)[number]> = {};
    for (const u of userRows) userMap[u.id] = u;

    // Laravel MobileResource — {id, user(UserInfoResource), device_model,
    // device_name (ustun yo'q → null), platform, face, created_at (Y-m-d H:i:s)}.
    return Promise.all(
      rows.map(async (r) => {
        const u = userMap[r.user_id];
        const w = u?.worker_id != null ? workerMap[u.worker_id] : undefined;
        return {
          id: r.id,
          user: u
            ? {
                id: u.id,
                uuid: u.uuid,
                worker: w
                  ? {
                      id: w.id,
                      photo: await this.minio.fileUrl(w.photo),
                      last_name: w.last_name,
                      first_name: w.first_name,
                      middle_name: w.middle_name,
                    }
                  : null,
                phone: u.phone,
              }
            : null,
          device_model: r.device_model,
          device_name: null,
          platform: r.platform,
          face: r.face,
          created_at: this.toDateTimeString(r.created_at),
        };
      }),
    );
  }
}
