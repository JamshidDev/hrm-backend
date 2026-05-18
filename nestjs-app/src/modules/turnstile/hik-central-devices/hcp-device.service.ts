// HCP Device service. Laravel: HikCentralController->devices/storeDevice/...
// IMPORTANT: Laravel ishlatadigan jadval — `h_c_p_devices` (HCPDevice model),
// `hik_central_devices` EMAS.

import { Injectable } from '@nestjs/common';
import { and, count, eq, ilike, inArray, isNull, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { h_c_p_devices, organizations } from '@/db/schema';
import { nextId, pageOf } from '@/modules/turnstile/_shared/helpers';
import type {
  CreateHcpDeviceDto,
  QueryHcpDeviceDto,
  UpdateHcpDeviceDto,
} from '@/modules/turnstile/hik-central-devices/dto/hcp-device.dto';

@Injectable()
export class HcpDeviceService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  async list(q: QueryHcpDeviceDto) {
    const { page, perPage, offset } = pageOf(q);
    const conds: any[] = [notDeleted(h_c_p_devices)];
    if (q.search) conds.push(ilike(h_c_p_devices.name, `%${q.search}%`));
    if (q.organizations) {
      const ids = q.organizations.split(',').map(Number).filter(Boolean);
      if (ids.length) conds.push(inArray(h_c_p_devices.organization_id, ids));
    }
    if (q.status === 'on') conds.push(eq(h_c_p_devices.status, true));
    if (q.status === 'off') conds.push(eq(h_c_p_devices.status, false));
    if (q.org_status === 'yes') conds.push(sql`${h_c_p_devices.organization_id} IS NOT NULL`);
    if (q.org_status === 'no') conds.push(isNull(h_c_p_devices.organization_id));
    if (q.attached === 'yes') conds.push(sql`${h_c_p_devices.device_id} IS NOT NULL`);
    if (q.attached === 'no') conds.push(isNull(h_c_p_devices.device_id));
    const where = and(...conds);
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(h_c_p_devices)
        .where(where)
        .orderBy(h_c_p_devices.name)
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(h_c_p_devices).where(where),
    ]);
    const orgIds = [...new Set(rows.map((r) => r.organization_id).filter(Boolean) as number[])];
    const orgs = orgIds.length
      ? await this.db
          .select({ id: organizations.id, name: organizations.name })
          .from(organizations)
          .where(inArray(organizations.id, orgIds))
      : [];
    const orgMap = new Map<number, (typeof orgs)[number]>(orgs.map((o) => [o.id, o] as const));
    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows.map((r) => ({
        ...r,
        organization: r.organization_id ? orgMap.get(r.organization_id) ?? null : null,
      })),
    };
  }

  // Laravel: exportStatistics — Excel export. Return URL stub.
  exportStatistics() {
    return { url: '', exported: true };
  }

  async create(dto: CreateHcpDeviceDto) {
    if (!dto.organization_id) {
      throw new BusinessException(422, 'organization_id is required');
    }
    const id = await nextId(this.db, h_c_p_devices);
    await this.db.insert(h_c_p_devices).values({
      id,
      organization_id: dto.organization_id,
      name: dto.name ?? '',
      device_code: dto.device_code ?? null,
      ip_address: dto.ip_address ?? null,
      mac_address: dto.mac_address ?? null,
      config: dto.config ?? false,
      log: dto.log ?? false,
      upload_workers: dto.upload_workers ?? false,
      contract_number: dto.contract_number ?? null,
      contract_date: dto.contract_date ?? null,
      price: dto.price ?? null,
    } as any);
  }

  async update(deviceId: number, dto: UpdateHcpDeviceDto) {
    // Laravel: if device_id provided & duplicates exist — forceDelete the other.
    if (dto.device_id) {
      const [dup] = await this.db
        .select({ id: h_c_p_devices.id })
        .from(h_c_p_devices)
        .where(eq(h_c_p_devices.device_id, Number(dto.device_id)))
        .limit(1);
      if (dup && dup.id !== deviceId) {
        await this.db.delete(h_c_p_devices).where(eq(h_c_p_devices.id, dup.id));
      }
    }
    await this.db
      .update(h_c_p_devices)
      .set({ ...dto, updated_at: sql`NOW()` } as any)
      .where(eq(h_c_p_devices.id, deviceId));
  }

  // Laravel: deleteDevice — forceDelete (hard delete).
  async remove(deviceId: number) {
    await this.db.delete(h_c_p_devices).where(eq(h_c_p_devices.id, deviceId));
  }

  // Laravel: refreshDevices — calls external HCP service. Stub.
  async refresh() {
    return { refreshed: true };
  }
}
