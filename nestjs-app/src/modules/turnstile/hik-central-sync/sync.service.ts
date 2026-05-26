// HikCentral Sync service. Laravel: HikCentralSyncController.

import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { and, asc, count, desc, eq, inArray } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import { sql } from 'drizzle-orm';
import {
  h_c_p_device_events,
  hik_central_access_level_devices,
  hik_central_devices,
  organization_access_levels,
  sync_h_c_p_access_logs,
  sync_offline_devices,
  users,
  workers,
} from '@/db/schema';
import { pageOf } from '@/modules/turnstile/_shared/helpers';

// Laravel SyncTypeEnum: 1→one (Tizim/System), 2→two (Foydalanuvchi/User).
const SYNC_TYPE_KEYS: Record<number, string> = { 1: 'one', 2: 'two' };

@Injectable()
export class SyncService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
    private readonly i18n: I18nService,
  ) {}

  // Laravel: HikCentralSyncController::index — paginated sync_h_c_p_access_logs
  // ordered by id DESC, with user.worker.
  //
  // Frontend qo'shimcha filtrlar (Laravel'da yo'q — bizning yangi feature):
  //  - organizations CSV → users.organization_id IN (...) — sync'ni yaratuvchi user
  //    qaysi org'da bo'lganligi.
  //  - access_levels CSV → EXISTS h_c_p_device_events ... JOIN hik_central_access_level_devices
  //    AL ichida bo'lgan device hodisalari mavjudligi.
  //
  // Response (SyncAccessLogResource):
  //   { id, created_at, updated_at, sync_events_count, status, error, day,
  //     user: { id, worker: {id,photo,last,first,middle} },
  //     type: { id, name } }
  async list(q: {
    page?: number;
    per_page?: number;
    organizations?: string;
    access_levels?: string;
  }) {
    const { page, perPage, offset } = pageOf(q);
    const conds: any[] = [notDeleted(sync_h_c_p_access_logs)];

    // 1) organizations filter — user.organization_id IN (csv).
    if (q.organizations) {
      const orgIds = q.organizations
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0);
      if (orgIds.length) {
        conds.push(
          sql`${sync_h_c_p_access_logs.user_id} IN (
            SELECT id FROM users
            WHERE organization_id IN (${sql.join(orgIds.map((n) => sql`${n}`), sql`, `)})
              AND deleted_at IS NULL
          )`,
        );
      }
    }

    // NOTE: `access_levels` filter Laravel'da yo'q (silent-ignore) — parity uchun
    // shu yerda ham qo'llanmaydi. h_c_p_device_events (22M+ qator) jadvalida
    // hik_central_device_id ustuniga INDEX yo'q, shu sababli filter seq-scan qilib
    // 7-10s davom etardi. Performance > yangi feature.

    const where = and(...conds);
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: sync_h_c_p_access_logs.id,
          status: sync_h_c_p_access_logs.status,
          error: sync_h_c_p_access_logs.error,
          created_at: sync_h_c_p_access_logs.created_at,
          updated_at: sync_h_c_p_access_logs.updated_at,
          user_id: sync_h_c_p_access_logs.user_id,
          type: sync_h_c_p_access_logs.type,
          day: sync_h_c_p_access_logs.day,
          events_count: sync_h_c_p_access_logs.events_count,
        })
        .from(sync_h_c_p_access_logs)
        .where(where)
        .orderBy(desc(sync_h_c_p_access_logs.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(sync_h_c_p_access_logs)
        .where(where),
    ]);

    // Batch users + workers + photo URLs.
    const userIds = [
      ...new Set(rows.map((r) => r.user_id).filter(Boolean) as number[]),
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
    const uMap = new Map<number, (typeof uRows)[number]>(
      uRows.map((u) => [Number(u.id), u] as const),
    );

    const lang = this.ctx.lang;
    const syncTypeName = (t: number): string => {
      const key = SYNC_TYPE_KEYS[t];
      if (!key) return '';
      const label = this.i18n.t(`messages.turnstile.sync_type.${key}`, {
        lang,
      });
      return typeof label === 'string' ? label : '';
    };

    return {
      current_page: page,
      total: Number(total),
      data: rows.map((r) => {
        const u = r.user_id ? uMap.get(Number(r.user_id)) ?? null : null;
        const w = u?.worker_id ? wMap.get(Number(u.worker_id)) ?? null : null;
        return {
          id: Number(r.id),
          created_at: r.created_at,
          updated_at: r.updated_at,
          sync_events_count: Number(r.events_count ?? 0),
          status: r.status,
          error: r.error,
          day: r.day,
          user: u ? { id: Number(u.id), worker: w } : null,
          type: {
            id: r.type,
            name: syncTypeName(Number(r.type)),
          },
        };
      }),
    };
  }

  // Laravel: HikCentralSyncController::show — sync_events array per HCP device.
  //
  // Laravel `sync_events` HasMany filterlaydi: user.organization.access_levels.areas
  // dan kelgan `hik_central_device_id` ro'yxati bilan whereIn.
  // device relation: HikCentralDevice (hik_central_devices.id) — internal id.
  //
  // Response item:
  //   { device: { id, name, area_name, last_sync }, start_time, end_time, events_count }
  async show(syncId: number) {
    // 1) User'ning organization'idan ruxsat etilgan device ID'lar:
    //    organization_access_levels → hik_central_access_level_devices.hik_central_device_id
    const userOrgId = this.ctx.user_or_fail.organization_id;
    let allowedDeviceIds: number[] = [];
    if (userOrgId != null) {
      const oalRows = await this.db
        .select({
          al_id: organization_access_levels.hik_central_access_level_id,
        })
        .from(organization_access_levels)
        .where(eq(organization_access_levels.organization_id, Number(userOrgId)));
      const alIds = oalRows.map((r) => Number(r.al_id));
      if (alIds.length) {
        const devRows = await this.db
          .select({
            dev_id: hik_central_access_level_devices.hik_central_device_id,
          })
          .from(hik_central_access_level_devices)
          .where(
            inArray(
              hik_central_access_level_devices.hik_central_access_level_id,
              alIds,
            ),
          );
        allowedDeviceIds = [...new Set(devRows.map((r) => Number(r.dev_id)))];
      }
    }
    if (!allowedDeviceIds.length) return [];

    // 2) sync_events filtrlangan device_id bo'yicha.
    const events = await this.db
      .select()
      .from(h_c_p_device_events)
      .where(
        and(
          eq(h_c_p_device_events.sync_h_c_p_access_log_id, syncId),
          inArray(h_c_p_device_events.hik_central_device_id, allowedDeviceIds),
          notDeleted(h_c_p_device_events),
        ),
      )
      .orderBy(asc(h_c_p_device_events.id));
    if (!events.length) return [];

    // 3) device eager-load — hik_central_devices.id by hik_central_device_id (internal).
    const deviceIds = [
      ...new Set(events.map((e) => Number(e.hik_central_device_id))),
    ];
    const devs = await this.db
      .select({
        id: hik_central_devices.id,
        name: hik_central_devices.name,
        area_name: hik_central_devices.area_name,
        last_sync: hik_central_devices.last_sync,
      })
      .from(hik_central_devices)
      .where(inArray(hik_central_devices.id, deviceIds));
    const dMap = new Map<number, (typeof devs)[number]>(
      devs.map((d) => [Number(d.id), d] as const),
    );

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
