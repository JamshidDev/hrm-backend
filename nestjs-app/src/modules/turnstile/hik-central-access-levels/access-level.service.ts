// HikCentral AccessLevel service. Laravel: HikCentralAccessLevelService.

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, ilike, inArray, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import {
  h_c_p_devices,
  hik_central_access_levels,
  hik_central_departments,
  organization_access_levels,
} from '@/db/schema';
import { nextId, pageOf } from '@/modules/turnstile/_shared/helpers';
import type {
  AttachAccessLevelToOrgDto,
  QueryAccessLevelDto,
  UpdateAccessLevelDto,
} from '@/modules/turnstile/hik-central-access-levels/dto/access-level.dto';

@Injectable()
export class AccessLevelService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  // Laravel: syncAccessLevels — external HCP call. Stub here.
  async syncAccessLevels() {
    return { synced: true };
  }

  // Laravel: paginate — list of AccessLevelResource:
  // { id, hik_server, name, description, devices_count, department, devices }.
  async list(q: QueryAccessLevelDto) {
    const { page, perPage, offset } = pageOf(q);
    const conds: any[] = [notDeleted(hik_central_access_levels)];
    if (q.search) conds.push(ilike(hik_central_access_levels.name, `%${q.search}%`));
    const where = and(...conds);
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(hik_central_access_levels)
        .where(where)
        .orderBy(desc(hik_central_access_levels.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(hik_central_access_levels).where(where),
    ]);

    // Batch-load departments + devices.
    const deptIds = [
      ...new Set(rows.map((r) => r.hik_central_department_id).filter(Boolean) as number[]),
    ];
    const deptRows = deptIds.length
      ? await this.db
          .select({
            id: hik_central_departments.id,
            name: hik_central_departments.name,
          })
          .from(hik_central_departments)
          .where(inArray(hik_central_departments.id, deptIds))
      : [];
    const deptMap = new Map<number, (typeof deptRows)[number]>(
      deptRows.map((d) => [d.id, d] as const),
    );

    // Laravel: $devicesCache->whereIn('device_id', $this->devices) — devices field
    // is a JSON array of HCP device_id values.
    const allDeviceIds = new Set<number>();
    for (const r of rows) {
      const ids = (r.devices ?? []) as unknown;
      if (Array.isArray(ids)) {
        for (const id of ids) {
          const n = Number(id);
          if (n) allDeviceIds.add(n);
        }
      }
    }
    const devRows = allDeviceIds.size
      ? await this.db
          .select({
            device_id: h_c_p_devices.device_id,
            name: h_c_p_devices.name,
            status: h_c_p_devices.status,
          })
          .from(h_c_p_devices)
          .where(inArray(h_c_p_devices.device_id, [...allDeviceIds]))
      : [];
    const devMap = new Map<number, (typeof devRows)[number]>(
      devRows.map((d) => [Number(d.device_id), d] as const),
    );

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows.map((r) => {
        const devicesList = (r.devices ?? []) as unknown;
        const myDevs = Array.isArray(devicesList)
          ? (devicesList
              .map((id) => devMap.get(Number(id)))
              .filter((d): d is NonNullable<typeof d> => Boolean(d))
              .map((d) => ({
                id: d.device_id,
                name: d.name,
                status: d.status ? 1 : 2,
              })))
          : [];
        return {
          id: r.id,
          hik_server: 'isup.das-uty.uz',
          name: r.name,
          description: (r as any).description ?? null,
          devices_count: myDevs.length,
          department: r.hik_central_department_id
            ? deptMap.get(r.hik_central_department_id) ?? null
            : null,
          devices: myDevs,
        };
      }),
    };
  }

  // Laravel: { departments: [{id, name}], devices: [{id, name, status: bool}] }.
  // departments — HikCentralDepartment, devices — HCPDevice (h_c_p_devices).
  async departments() {
    const [deptRows, devRows] = await Promise.all([
      this.db
        .select({ id: hik_central_departments.id, name: hik_central_departments.name })
        .from(hik_central_departments)
        .where(notDeleted(hik_central_departments)),
      this.db
        .select({
          device_id: h_c_p_devices.device_id,
          name: h_c_p_devices.name,
          status: h_c_p_devices.status,
        })
        .from(h_c_p_devices)
        .where(notDeleted(h_c_p_devices)),
    ]);
    return {
      departments: deptRows,
      // Laravel returns `status` as bool (truthy in PHP, not 1|2).
      devices: devRows.map((d) => ({ id: d.device_id, name: d.name, status: Boolean(d.status) })),
    };
  }

  async update(id: number, dto: UpdateAccessLevelDto) {
    const [row] = await this.db
      .select({ id: hik_central_access_levels.id })
      .from(hik_central_access_levels)
      .where(eq(hik_central_access_levels.id, id))
      .limit(1);
    if (!row) throw new BusinessException(404, 'not_found');
    const data: Record<string, unknown> = { updated_at: sql`NOW()` };
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.devices !== undefined) data.devices = dto.devices;
    await this.db
      .update(hik_central_access_levels)
      .set(data)
      .where(eq(hik_central_access_levels.id, id));
  }

  // Laravel: AccessLevelMinResource — flat list of {id, name}.
  async organizationAccessLevels(organizationId: number) {
    if (!organizationId) return [] as Array<{ id: number; name: string | null }>;
    const orgAcLevels = await this.db
      .select({
        hik_central_access_level_id: organization_access_levels.hik_central_access_level_id,
      })
      .from(organization_access_levels)
      .where(eq(organization_access_levels.organization_id, organizationId));
    if (!orgAcLevels.length) return [];
    const ids = orgAcLevels.map((o) => o.hik_central_access_level_id);
    return this.db
      .select({ id: hik_central_access_levels.id, name: hik_central_access_levels.name })
      .from(hik_central_access_levels)
      .where(
        and(
          inArray(hik_central_access_levels.id, ids),
          notDeleted(hik_central_access_levels),
        ),
      );
  }

  // Laravel: AccessLevelMinResource collection — {id, name}, orderByDesc id.
  // Filters by user's accessible AL list when user is not Admin (Helper::userAccessLevels).
  // For NestJS — return all (Admin) by default.
  async allAccessLevels(q: QueryAccessLevelDto) {
    const conds: any[] = [notDeleted(hik_central_access_levels)];
    if (q.search) conds.push(ilike(hik_central_access_levels.name, `%${q.search}%`));
    const where = and(...conds);
    return this.db
      .select({ id: hik_central_access_levels.id, name: hik_central_access_levels.name })
      .from(hik_central_access_levels)
      .where(where)
      .orderBy(desc(hik_central_access_levels.id));
  }

  // Laravel: organization->access_levels()->sync(access_levels[]).
  async attachToOrganization(dto: AttachAccessLevelToOrgDto) {
    if (!dto.organization_id) {
      throw new BusinessException(422, 'organization_id is required');
    }
    await this.db
      .delete(organization_access_levels)
      .where(eq(organization_access_levels.organization_id, dto.organization_id));
    if (dto.access_level_ids?.length) {
      let baseId = await nextId(this.db, organization_access_levels);
      const values = dto.access_level_ids.map((alId) => ({
        id: baseId++,
        organization_id: dto.organization_id,
        hik_central_access_level_id: alId,
      }));
      await this.db.insert(organization_access_levels).values(values);
    }
  }
}
