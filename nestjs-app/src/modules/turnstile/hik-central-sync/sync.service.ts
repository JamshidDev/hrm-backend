// HikCentral Sync service. Laravel: HikCentralSyncController.

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import {
  h_c_p_device_events,
  h_c_p_devices,
  sync_h_c_p_access_logs,
  sync_offline_devices,
  users,
  workers,
} from '@/db/schema';
import { pageOf } from '@/modules/turnstile/_shared/helpers';

@Injectable()
export class SyncService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  // Laravel: index — paginated sync logs with user.worker eager load.
  async list(q: { page?: number; per_page?: number }) {
    const { page, perPage, offset } = pageOf(q);
    const where = notDeleted(sync_h_c_p_access_logs);
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(sync_h_c_p_access_logs)
        .where(where)
        .orderBy(desc(sync_h_c_p_access_logs.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(sync_h_c_p_access_logs).where(where),
    ]);
    const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean) as number[])];
    const uRows = userIds.length
      ? await this.db
          .select({ id: users.id, worker_id: users.worker_id })
          .from(users)
          .where(inArray(users.id, userIds))
      : [];
    const workerIds = uRows.map((u) => u.worker_id).filter(Boolean) as number[];
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
    const uMap = new Map<number, (typeof uRows)[number]>(uRows.map((u) => [u.id, u] as const));
    const wMap = new Map<number, (typeof wRows)[number]>(wRows.map((w) => [w.id, w] as const));
    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows.map((r) => {
        const u = r.user_id ? uMap.get(r.user_id) ?? null : null;
        const w = u?.worker_id ? wMap.get(u.worker_id) ?? null : null;
        return { ...r, user: u ? { ...u, worker: w } : null };
      }),
    };
  }

  // Laravel: show — sync_events array (each: {device, start_time, end_time, events_count}).
  async show(syncId: number) {
    const events = await this.db
      .select()
      .from(h_c_p_device_events)
      .where(
        and(
          eq(h_c_p_device_events.sync_h_c_p_access_log_id, syncId),
          notDeleted(h_c_p_device_events),
        ),
      );
    if (!events.length) return [];
    const deviceIds = [...new Set(events.map((e) => e.hik_central_device_id))];
    const devs = deviceIds.length
      ? await this.db
          .select()
          .from(h_c_p_devices)
          .where(inArray(h_c_p_devices.device_id, deviceIds))
      : [];
    const dMap = new Map<number, (typeof devs)[number]>(devs.map((d) => [Number(d.device_id), d] as const));
    return events.map((e) => ({
      device: dMap.get(Number(e.hik_central_device_id)) ?? null,
      start_time: e.start_time,
      end_time: e.end_time,
      events_count: e.events_count,
    }));
  }

  // Laravel: offlineDevices — { devices: [...] } wrapper.
  async offlineDevices(syncId: number) {
    const rows = await this.db
      .select()
      .from(sync_offline_devices)
      .where(eq(sync_offline_devices.sync_h_c_p_access_log_id, syncId));
    return { devices: rows };
  }
}
