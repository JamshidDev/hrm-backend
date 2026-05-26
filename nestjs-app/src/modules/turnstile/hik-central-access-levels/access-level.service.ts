// HikCentral AccessLevel service. Laravel: HikCentralAccessLevelService.

import { Injectable, Logger } from '@nestjs/common';
import { and, count, desc, eq, ilike, inArray, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import {
  h_c_p_devices,
  hik_central_access_level_devices,
  hik_central_access_levels,
  hik_central_departments,
  hik_central_devices,
  organization_access_levels,
} from '@/db/schema';
import { HikCentralClient } from '@/shared/hik-central/hik-central.client';
import { nextId, pageOf } from '@/modules/turnstile/_shared/helpers';
import type {
  AttachAccessLevelToOrgDto,
  QueryAccessLevelDto,
  UpdateAccessLevelDto,
} from '@/modules/turnstile/hik-central-access-levels/dto/access-level.dto';

@Injectable()
export class AccessLevelService {
  private readonly logger = new Logger(AccessLevelService.name);

  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly hcp: HikCentralClient,
  ) {}

  // GET /api/v1/turnstile/hik-central/access-levels-sync
  //
  // Laravel: HikCentralAccessLevelService::syncAccessLevels
  //   1) hcp.devices() — HCP'dan barcha qurilmalar (paginated), HCPDevice upsert
  //   2) hcp.accessLevels() — privilege groupslar (2 sahifa), parse qilamiz
  //   3) DELETE access_levels / hik_central_devices not in latest snapshot
  //   4) UPSERT hik_central_access_levels + hik_central_devices
  //   5) TRUNCATE pivot, INSERT pivotData
  //   6) syncDepartments — orgList'dan departmentlar
  async syncAccessLevels(): Promise<void> {
    await this.syncHcpDevices();
    const res = await this.hcp.accessLevels();
    if (!res.status) {
      throw new BusinessException(500, 'messages.server_error');
    }

    const accessLevelIds: number[] = [];
    const deviceIds: number[] = [];
    const accessLevelsData: Array<{
      hik_central_access_level_id: number;
      hik_central_key: number;
      name: string;
      description: string | null;
      devices_count: number;
    }> = [];
    const devicesData: Array<{
      hik_central_device_id: number;
      name: string;
      area_name: string | null;
      status: boolean;
    }> = [];
    const pivotData: Array<{
      hik_central_access_level_id: number;
      hik_central_device_id: number;
    }> = [];

    for (const page of res.data ?? []) {
      for (const item of page) {
        const alId = Number(item.privilegeGroupId);
        accessLevelIds.push(alId);
        accessLevelsData.push({
          hik_central_access_level_id: alId,
          hik_central_key: 1,
          name: item.privilegeGroupName,
          description: item.description ?? null,
          devices_count: (item.ElementList ?? []).length,
        });
        for (const el of item.ElementList ?? []) {
          const dev = el.Element;
          const devId = Number(dev.ID);
          deviceIds.push(devId);
          devicesData.push({
            hik_central_device_id: devId,
            name: dev.BaseInfo.Name,
            area_name: dev.BaseInfo.AreaName ?? null,
            // Laravel: str_contains($name, '_en') — kirish suffix.
            status: dev.BaseInfo.Name.includes('_en'),
          });
          pivotData.push({
            hik_central_access_level_id: alId,
            hik_central_device_id: devId,
          });
        }
      }
    }

    // 3) Soft-delete orphan access_levels (Laravel `delete()` uses SoftDeletes).
    if (accessLevelIds.length) {
      await this.db.execute(sql`
        UPDATE hik_central_access_levels
        SET deleted_at = NOW()
        WHERE hik_central_access_level_id NOT IN (${sqlIdList(accessLevelIds)})
          AND deleted_at IS NULL
      `);
    }
    if (deviceIds.length) {
      await this.db.execute(sql`
        UPDATE hik_central_devices
        SET deleted_at = NOW()
        WHERE hik_central_device_id NOT IN (${sqlIdList(deviceIds)})
          AND deleted_at IS NULL
      `);
    }

    // 4) UPSERT access_levels (by hik_central_access_level_id+hik_central_key).
    if (accessLevelsData.length) {
      const values = accessLevelsData
        .map((d) => sql`(
          ${d.hik_central_access_level_id}, ${d.hik_central_key},
          ${d.name}, ${d.description}, ${d.devices_count}, NOW(), NOW()
        )`);
      await this.db.execute(sql`
        INSERT INTO hik_central_access_levels
          (hik_central_access_level_id, hik_central_key, name, description, devices_count, created_at, updated_at)
        VALUES ${sql.join(values, sql`, `)}
        ON CONFLICT (hik_central_key, hik_central_access_level_id)
        DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          devices_count = EXCLUDED.devices_count,
          updated_at = NOW(),
          deleted_at = NULL
      `);
    }

    // UPSERT hik_central_devices (dedupe by hik_central_device_id).
    if (devicesData.length) {
      const uniq = new Map<number, (typeof devicesData)[number]>();
      for (const d of devicesData) uniq.set(d.hik_central_device_id, d);
      const values = [...uniq.values()].map(
        (d) => sql`(
          ${d.name}, ${d.hik_central_device_id}, ${d.area_name},
          ${d.status}, NOW(), NOW()
        )`,
      );
      await this.db.execute(sql`
        INSERT INTO hik_central_devices
          (name, hik_central_device_id, area_name, status, created_at, updated_at)
        VALUES ${sql.join(values, sql`, `)}
        ON CONFLICT (hik_central_device_id)
        DO UPDATE SET
          name = EXCLUDED.name,
          area_name = EXCLUDED.area_name,
          status = EXCLUDED.status,
          updated_at = NOW(),
          deleted_at = NULL
      `);
    }

    // 5) Resolve internal IDs uchun (hik_central_access_level_id → DB id).
    const alMap = new Map<number, number>();
    if (accessLevelIds.length) {
      const rows = await this.db
        .select({
          id: hik_central_access_levels.id,
          ext: hik_central_access_levels.hik_central_access_level_id,
        })
        .from(hik_central_access_levels)
        .where(
          inArray(hik_central_access_levels.hik_central_access_level_id, accessLevelIds),
        );
      for (const r of rows) {
        if (r.ext != null) alMap.set(Number(r.ext), Number(r.id));
      }
    }
    const devMap = new Map<number, number>();
    if (deviceIds.length) {
      const rows = await this.db
        .select({
          id: hik_central_devices.id,
          ext: hik_central_devices.hik_central_device_id,
        })
        .from(hik_central_devices)
        .where(inArray(hik_central_devices.hik_central_device_id, deviceIds));
      for (const r of rows) {
        if (r.ext != null) devMap.set(Number(r.ext), Number(r.id));
      }
    }

    // Pivot: TRUNCATE + INSERT.
    await this.db.execute(sql`TRUNCATE TABLE hik_central_access_level_devices`);
    const pivotInsert: Array<{
      hik_central_access_level_id: number;
      hik_central_device_id: number;
    }> = [];
    for (const p of pivotData) {
      const al = alMap.get(p.hik_central_access_level_id);
      const dv = devMap.get(p.hik_central_device_id);
      if (al && dv)
        pivotInsert.push({
          hik_central_access_level_id: al,
          hik_central_device_id: dv,
        });
    }
    if (pivotInsert.length) {
      // Batch 500.
      for (let i = 0; i < pivotInsert.length; i += 500) {
        const chunk = pivotInsert.slice(i, i + 500);
        await this.db.insert(hik_central_access_level_devices).values(chunk);
      }
    }

    // 6) Departments sync.
    await this.syncDepartments();
  }

  // Laravel: HikCentralService::devices — paginated upsert into h_c_p_devices.
  private async syncHcpDevices(): Promise<void> {
    const pageSize = 500;
    const probe = await this.hcp.devicesList(1, 1);
    if (!probe.status || !probe.total) return;
    const total = probe.total;
    const pages = Math.ceil(total / pageSize);

    const seen: number[] = [];
    const devices: Array<{
      device_id: number;
      name: string;
      serial_number: string;
      status: boolean;
    }> = [];

    for (let p = 1; p <= pages; p++) {
      const r = await this.hcp.devicesList(p, pageSize);
      if (!r.status || !r.list?.length) continue;
      for (const it of r.list) {
        const id = Number(it.acsDevIndexCode);
        seen.push(id);
        devices.push({
          device_id: id,
          name: it.acsDevName,
          serial_number: it.acsDevCode,
          status: it.status === 1,
        });
      }
    }

    if (devices.length) {
      const values = devices.map(
        (d) => sql`(
          ${d.device_id}, ${d.name}, ${d.serial_number}, ${d.status}, NOW(), NOW(), NULL
        )`,
      );
      await this.db.execute(sql`
        INSERT INTO h_c_p_devices
          (device_id, name, serial_number, status, created_at, updated_at, deleted_at)
        VALUES ${sql.join(values, sql`, `)}
        ON CONFLICT (device_id)
        DO UPDATE SET
          name = EXCLUDED.name,
          serial_number = EXCLUDED.serial_number,
          status = EXCLUDED.status,
          updated_at = NOW(),
          deleted_at = NULL
      `);
    }

    // Soft-delete devices not in snapshot.
    if (seen.length) {
      await this.db.execute(sql`
        UPDATE h_c_p_devices
        SET deleted_at = NOW()
        WHERE device_id NOT IN (${sqlIdList(seen)})
          AND deleted_at IS NULL
      `);
    }
  }

  // Laravel: HikCentralAccessLevelService::syncDepartments — orgList 2 pages.
  private async syncDepartments(): Promise<void> {
    const all = new Map<number, string>();
    for (const page of [1, 2]) {
      const r = await this.hcp.groups(page);
      if (!r.status || typeof r.msg === 'string') {
        throw new BusinessException(
          500,
          typeof r.msg === 'string' ? r.msg : 'messages.server_error',
        );
      }
      for (const item of r.msg.list ?? []) {
        const id = Number(item.orgIndexCode);
        if (Number.isFinite(id)) all.set(id, item.orgName);
      }
    }
    if (!all.size) return;

    const values = [...all.entries()].map(
      ([id, name]) => sql`(${name}, ${id}, NOW(), NOW())`,
    );
    await this.db.execute(sql`
      INSERT INTO hik_central_departments
        (name, hik_central_department_id, created_at, updated_at)
      VALUES ${sql.join(values, sql`, `)}
      ON CONFLICT (hik_central_department_id)
      DO UPDATE SET
        name = EXCLUDED.name,
        updated_at = NOW(),
        deleted_at = NULL
    `);
  }

  // Laravel: paginate — list of AccessLevelResource:
  // { id, hik_server, name, description, devices_count, department, devices }.
  async list(q: QueryAccessLevelDto) {
    const { page, perPage, offset } = pageOf(q);
    const conds: any[] = [notDeleted(hik_central_access_levels)];
    if (q.search)
      conds.push(ilike(hik_central_access_levels.name, `%${q.search}%`));
    const where = and(...conds);
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(hik_central_access_levels)
        .where(where)
        .orderBy(desc(hik_central_access_levels.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(hik_central_access_levels)
        .where(where),
    ]);

    // Batch-load departments + devices.
    const deptIds = [
      ...new Set(
        rows
          .map((r) => r.hik_central_department_id)
          .filter(Boolean) as number[],
      ),
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
    // varchar'da JSON string sifatida saqlanadi ("[1840,1841]") — parse qilamiz.
    const parseDeviceIds = (raw: unknown): number[] => {
      if (Array.isArray(raw)) {
        return raw.map((v) => Number(v)).filter((n) => Number.isFinite(n));
      }
      if (typeof raw === 'string' && raw.trim()) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return parsed.map((v) => Number(v)).filter((n) => Number.isFinite(n));
          }
        } catch {
          // fall through
        }
      }
      return [];
    };
    const allDeviceIds = new Set<number>();
    const perRowIds = new Map<number, number[]>();
    for (const r of rows) {
      const ids = parseDeviceIds(r.devices);
      perRowIds.set(r.id, ids);
      for (const id of ids) allDeviceIds.add(id);
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
        // Laravel: $devicesCache->whereIn('device_id', $this->devices) — devicesCache
        // PG natural order'ini saqlaydi. JSON array order'ini emas, devRows order'ini ishlatamiz.
        const ids = new Set(perRowIds.get(r.id) ?? []);
        const myDevs = devRows
          .filter((d) => ids.has(Number(d.device_id)))
          .map((d) => ({
            id: d.device_id,
            name: d.name,
            status: d.status ? 1 : 2,
          }));
        return {
          id: r.id,
          hik_server: 'isup.das-uty.uz',
          name: r.name,
          description: (r as any).description ?? null,
          devices_count: myDevs.length,
          department: r.hik_central_department_id
            ? (deptMap.get(r.hik_central_department_id) ?? null)
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
        .select({
          id: hik_central_departments.id,
          name: hik_central_departments.name,
        })
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
      devices: devRows.map((d) => ({
        id: d.device_id,
        name: d.name,
        status: Boolean(d.status),
      })),
    };
  }

  // PUT /api/v1/turnstile/hik-central/access-levels/{id}
  //
  // Laravel: HikCentralAccessLevelService::update
  //   1) findOrFail(id) — AccessLevel mavjudligini tekshirish (404 yo'q bo'lsa)
  //   2) UPSERT organization_access_levels (organization_id=1, hik_central_access_level_id=id)
  //   3) UPDATE hik_central_access_levels SET hik_central_department_id, devices
  //
  // Eslatma: `devices` jadvalda varchar (JSON string) sifatida saqlanadi.
  // Eloquent avtomatik stringify qiladi, biz qo'lda JSON.stringify ishlatamiz.
  async update(id: number, dto: UpdateAccessLevelDto) {
    const [row] = await this.db
      .select({ id: hik_central_access_levels.id })
      .from(hik_central_access_levels)
      .where(eq(hik_central_access_levels.id, id))
      .limit(1);
    if (!row) throw new BusinessException(404, 'messages.not_found');

    // Laravel updateOrCreate — Org 1 uchun ushbu access-level pivot bo'lmasa yaratiladi.
    await this.upsertOrgAccessLevel(1, id);

    await this.db
      .update(hik_central_access_levels)
      .set({
        hik_central_department_id: dto.hik_central_department_id,
        devices: JSON.stringify(dto.devices ?? []),
        updated_at: sql`NOW()`,
      })
      .where(eq(hik_central_access_levels.id, id));
  }

  // Laravel `OrganizationAccessLevel::updateOrCreate` parity — agar yozuv bor
  // bo'lsa hech narsa qilmaydi, yo'q bo'lsa yangi ID bilan yaratadi.
  private async upsertOrgAccessLevel(orgId: number, alId: number): Promise<void> {
    const existing = await this.db
      .select({ id: organization_access_levels.id })
      .from(organization_access_levels)
      .where(
        and(
          eq(organization_access_levels.organization_id, orgId),
          eq(organization_access_levels.hik_central_access_level_id, alId),
        ),
      )
      .limit(1);
    if (existing.length > 0) return;

    const nextRowId = await nextId(this.db, organization_access_levels);
    await this.db.insert(organization_access_levels).values({
      id: nextRowId,
      organization_id: orgId,
      hik_central_access_level_id: alId,
    });
  }

  // Laravel: AccessLevelMinResource — flat list of {id, name}.
  async organizationAccessLevels(organizationId: number) {
    if (!organizationId)
      return [] as Array<{ id: number; name: string | null }>;
    const orgAcLevels = await this.db
      .select({
        hik_central_access_level_id:
          organization_access_levels.hik_central_access_level_id,
      })
      .from(organization_access_levels)
      .where(eq(organization_access_levels.organization_id, organizationId));
    if (!orgAcLevels.length) return [];
    const ids = orgAcLevels.map((o) => o.hik_central_access_level_id);
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

  // Laravel: AccessLevelMinResource collection — {id, name}, orderByDesc id.
  // Filters by user's accessible AL list when user is not Admin (Helper::userAccessLevels).
  // For NestJS — return all (Admin) by default.
  async allAccessLevels(q: QueryAccessLevelDto) {
    const conds: any[] = [notDeleted(hik_central_access_levels)];
    if (q.search)
      conds.push(ilike(hik_central_access_levels.name, `%${q.search}%`));
    const where = and(...conds);
    return this.db
      .select({
        id: hik_central_access_levels.id,
        name: hik_central_access_levels.name,
      })
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
      .where(
        eq(organization_access_levels.organization_id, dto.organization_id),
      );
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

// number[] → SQL `1, 2, 3` fragmenti.
function sqlIdList(ids: number[]): ReturnType<typeof sql.join> {
  return sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  );
}
