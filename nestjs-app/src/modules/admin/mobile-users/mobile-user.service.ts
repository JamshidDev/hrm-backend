// Admin Mobile Users service. Laravel: MobileController (index + show).

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
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
  constructor(@InjectDb() private readonly db: DataSource) {}

  /** GET /admin/mobile/users — Laravel: paginated UserMobileKey + user.worker. */
  async list(q: MobileUserListQueryDto) {
    const page = Math.max(1, Number(q?.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(q?.per_page ?? 10)));
    const offset = (page - 1) * perPage;

    // search worker fullName orqali — SQL subquery (parametr limitidan qutulish uchun)
    const conds: SQL[] = [];
    if (q.search) {
      const pattern = `%${q.search}%`;
      conds.push(
        sql`EXISTS (
          SELECT 1 FROM ${users} u
          JOIN ${workers} w ON w.id = u.worker_id
          WHERE u.id = ${user_mobile_keys.user_id}
            AND (
              w.last_name ILIKE ${pattern}
              OR w.first_name ILIKE ${pattern}
              OR w.middle_name ILIKE ${pattern}
            )
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
      per_page: perPage,
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

    const sessionItems = sessions.map((item) => {
      let sessionPhotos: (string | null)[] = [];
      if (item.face_status) {
        if (item.refImage) sessionPhotos.push(item.refImage);
        if (item.liveImage) sessionPhotos.push(item.liveImage);
      } else {
        sessionPhotos = (photosBySession[item.id] ?? []).map((p) => p.photo);
      }
      return {
        id: item.id,
        status: item.status,
        success: item.success,
        created_at: item.created_at,
        photos: sessionPhotos,
      };
    });

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

    return rows.map((r) => {
      const u = userMap[r.user_id];
      const w = u?.worker_id != null ? workerMap[u.worker_id] : undefined;
      return {
        id: r.id,
        device_model: r.device_model,
        device_uuid: r.device_uuid,
        platform: r.platform,
        face: r.face,
        created_at: r.created_at,
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
                    photo: w.photo,
                  }
                : null,
            }
          : null,
      };
    });
  }
}
