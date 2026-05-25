// HikCentral Telegram service.
// Laravel: TelegramPhotoController + UserDeviceNotifyController.

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import {
  h_c_p_devices,
  turnstile_telegram_photos,
  user_telegrams,
  user_turnstile_devices,
  users,
  workers,
} from '@/db/schema';
import { pageOf } from '@/modules/turnstile/_shared/helpers';

@Injectable()
export class TelegramService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  // Laravel: TelegramPhotoController::index — paginated turnstile_telegram_photos.
  async listPhotos(q: { page?: number; per_page?: number; search?: string }) {
    const { page, perPage, offset } = pageOf(q);
    const where = notDeleted(turnstile_telegram_photos);
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(turnstile_telegram_photos)
        .where(where)
        .orderBy(desc(turnstile_telegram_photos.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(turnstile_telegram_photos)
        .where(where),
    ]);
    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows,
    };
  }

  // Laravel: updatePhotos — re-sync workers' photos via HCP. Stub.
  async updatePhotos() {
    return { synced: true };
  }

  // Laravel: UserDeviceNotifyController::users — users with telegram + worker.
  async telegramUsers(q: {
    page?: number;
    per_page?: number;
    search?: string;
  }) {
    const { page, perPage, offset } = pageOf(q);
    const where = and(notDeleted(users), sql`${users.worker_id} IS NOT NULL`);
    const [uRows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: users.id,
          phone: users.phone,
          worker_id: users.worker_id,
        })
        .from(users)
        .innerJoin(user_telegrams, eq(user_telegrams.user_id, users.id))
        .where(where)
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(users)
        .innerJoin(user_telegrams, eq(user_telegrams.user_id, users.id))
        .where(where),
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
      wRows.map((w) => [w.id, w] as const),
    );
    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: uRows.map((u) => ({
        id: u.id,
        phone: u.phone,
        worker: u.worker_id ? (wMap.get(u.worker_id) ?? null) : null,
      })),
    };
  }

  // Laravel: UserDeviceNotifyController::index — distinct users from
  // user_turnstile_devices with device count.
  async telegramList(q: { page?: number; per_page?: number }) {
    const { page, perPage, offset } = pageOf(q);
    const [uRows, [{ total }]] = await Promise.all([
      this.db
        .selectDistinct({ user_id: user_turnstile_devices.user_id })
        .from(user_turnstile_devices)
        .limit(perPage)
        .offset(offset),
      this.db
        .select({
          total: sql<number>`COUNT(DISTINCT ${user_turnstile_devices.user_id})::int`,
        })
        .from(user_turnstile_devices),
    ]);
    if (!uRows.length) {
      return {
        current_page: page,
        per_page: perPage,
        total: Number(total),
        data: [],
      };
    }
    const userIds = uRows.map((u) => u.user_id);
    const uList = await this.db
      .select()
      .from(users)
      .where(inArray(users.id, userIds));
    const counts = await this.db
      .select({ user_id: user_turnstile_devices.user_id, total: count() })
      .from(user_turnstile_devices)
      .where(inArray(user_turnstile_devices.user_id, userIds))
      .groupBy(user_turnstile_devices.user_id);
    const cMap = new Map<number, number>(
      counts.map((c) => [c.user_id, Number(c.total)] as const),
    );
    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: uList.map((u) => ({
        id: u.id,
        phone: u.phone,
        hcp_devices_count: cMap.get(u.id) ?? 0,
      })),
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
