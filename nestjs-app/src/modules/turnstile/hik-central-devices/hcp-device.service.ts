// HCP Device service. Laravel: HikCentralController->devices/storeDevice/...
// IMPORTANT: Laravel ishlatadigan jadval — `h_c_p_devices` (HCPDevice model),
// `hik_central_devices` EMAS.

import { Injectable } from '@nestjs/common';
import { and, asc, count, eq, ilike, inArray, isNull, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { PermissionService } from '@/shared/permission/permission.service';
import { ExcelService } from '@/shared/excel/excel.service';
import {
  h_c_p_devices,
  hik_central_access_levels,
  organization_access_levels,
  organizations,
} from '@/db/schema';
import { nextId, pageOf } from '@/modules/turnstile/_shared/helpers';
import type {
  CreateHcpDeviceDto,
  QueryHcpDeviceDto,
  UpdateHcpDeviceDto,
} from '@/modules/turnstile/hik-central-devices/dto/hcp-device.dto';

@Injectable()
export class HcpDeviceService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly perms: PermissionService,
    private readonly excel: ExcelService,
  ) {}

  // Laravel: HikCentralController::devices.
  //
  // Filtrlar:
  //  - search → name ILIKE %s%
  //  - org_status='yes' or 'no' → whereHas/whereDoesntHave organization
  //  - organizations CSV → organization_id IN (...)
  //  - status='on'|'off' → boolean
  //  - attached='yes'|'no' → device_id NOT NULL / NULL
  //  - Non-Admin → device_id IN (user.organization.access_levels.devices.flatten())
  // ORDER BY name. Pagination (per_page).
  //
  // Response (HCPDevicesResource):
  //   { id, organization_id: {id,code,name}, name, ip_address, mac_address, status,
  //     updated_at (Y-m-d H:i:s), serial_number, device_id, log, config,
  //     upload_workers, device_code, contract_number, contract_date, price }
  async list(q: QueryHcpDeviceDto) {
    const { page, perPage, offset } = pageOf(q);
    const conds: any[] = [notDeleted(h_c_p_devices)];

    if (q.search) conds.push(ilike(h_c_p_devices.name, `%${q.search}%`));

    if (q.organizations) {
      const ids = q.organizations
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0);
      if (ids.length) conds.push(inArray(h_c_p_devices.organization_id, ids));
    }

    // Laravel: when('org-status' === 'yes') — kebab-case dash variant + when(org_status).
    if (q['org-status'] === 'yes' || q.org_status === 'yes') {
      conds.push(sql`${h_c_p_devices.organization_id} IS NOT NULL`);
    }
    if (q.org_status === 'no') {
      conds.push(isNull(h_c_p_devices.organization_id));
    }

    // Laravel: when(request('status'), where status === 'on') — only applied if truthy.
    if (q.status === 'on') conds.push(eq(h_c_p_devices.status, true));
    if (q.status === 'off') conds.push(eq(h_c_p_devices.status, false));

    if (q.attached === 'yes') {
      conds.push(sql`${h_c_p_devices.device_id} IS NOT NULL`);
    } else if (q.attached === 'no') {
      conds.push(isNull(h_c_p_devices.device_id));
    }

    // Non-Admin scope: device_id IN (user.org.access_levels.devices).
    const isAdmin = await this.perms.hasRole(this.ctx.user_or_fail.id, 'Admin');
    if (!isAdmin) {
      const userOrgId = this.ctx.user_or_fail.organization_id;
      let allowedDevIds: number[] = [];
      if (userOrgId != null) {
        const rows = await this.db
          .select({ devices: hik_central_access_levels.devices })
          .from(organization_access_levels)
          .innerJoin(
            hik_central_access_levels,
            and(
              eq(
                hik_central_access_levels.id,
                organization_access_levels.hik_central_access_level_id,
              ),
              sql`${hik_central_access_levels.deleted_at} IS NULL`,
            ),
          )
          .where(
            eq(
              organization_access_levels.organization_id,
              Number(userOrgId),
            ),
          );
        const set = new Set<number>();
        for (const r of rows) {
          if (r.devices) {
            const parsed = parseDevicesJson(r.devices);
            for (const id of parsed) set.add(id);
          }
        }
        allowedDevIds = [...set];
      }
      if (allowedDevIds.length === 0) {
        return { current_page: page, total: 0, data: [] };
      }
      conds.push(inArray(h_c_p_devices.device_id, allowedDevIds));
    }

    const where = and(...conds);

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: h_c_p_devices.id,
          organization_id: h_c_p_devices.organization_id,
          device_id: h_c_p_devices.device_id,
          name: h_c_p_devices.name,
          device_code: h_c_p_devices.device_code,
          serial_number: h_c_p_devices.serial_number,
          mac_address: h_c_p_devices.mac_address,
          ip_address: h_c_p_devices.ip_address,
          status: h_c_p_devices.status,
          config: h_c_p_devices.config,
          log: h_c_p_devices.log,
          upload_workers: h_c_p_devices.upload_workers,
          contract_number: h_c_p_devices.contract_number,
          contract_date: h_c_p_devices.contract_date,
          price: h_c_p_devices.price,
          updated_at: h_c_p_devices.updated_at,
        })
        .from(h_c_p_devices)
        .where(where)
        .orderBy(asc(h_c_p_devices.name))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(h_c_p_devices).where(where),
    ]);

    // Batch eager-load organizations (id, code, name).
    const orgIds = [
      ...new Set(
        rows.map((r) => r.organization_id).filter(Boolean) as number[],
      ),
    ];
    const orgs = orgIds.length
      ? await this.db
          .select({
            id: organizations.id,
            code: organizations.code,
            name: organizations.name,
          })
          .from(organizations)
          .where(inArray(organizations.id, orgIds))
      : [];
    const orgMap = new Map<number, (typeof orgs)[number]>(
      orgs.map((o) => [Number(o.id), o] as const),
    );

    return {
      current_page: page,
      total: Number(total),
      data: rows.map((r) => ({
        id: Number(r.id),
        // Laravel `organization_id` key holds OrganizationCodeResource (object).
        organization_id: r.organization_id
          ? (orgMap.get(Number(r.organization_id)) ?? null)
          : null,
        name: r.name,
        ip_address: r.ip_address,
        mac_address: r.mac_address,
        status: r.status,
        updated_at: formatLaravelTs(r.updated_at),
        serial_number: r.serial_number,
        device_id: r.device_id,
        log: r.log,
        config: r.config,
        upload_workers: r.upload_workers,
        device_code: r.device_code,
        contract_number: r.contract_number,
        contract_date: r.contract_date,
        price: r.price,
      })),
    };
  }

  // Laravel: HikCentralController::exportStatistics — organization tree Excel with
  // cumulative device/worker counts. Hierarchical level columns (C-1..C-N) + outline
  // grouping. Returns Excel Buffer for direct download.
  //
  // Steps:
  //  1) Org-scope orgs (Admin: all, Leader: subtree) ordered by _lft ASC.
  //  2) Per-org base counts: total_devices, offline_devices, total_workers, workers_without_university.
  //  3) scheduledIds = worker_position_id with schedule rows in current month.
  //  4) vacationWorkerIds = workers on vacation in current month.
  //  5) orgStats = worker_positions (is_turnstile=true) NOT scheduled NOT vacationer GROUP BY org → no_schedule_workers.
  //  6) Build tree by parent_id (orderedBy _lft), DFS flatten with cumulative counts.
  //  7) Excel rows with outline_level + bold-blue parent rows.
  async exportStatistics(q: {
    organizations?: string;
    departments?: string;
  }): Promise<Buffer> {
    // 1) Org-scope (orgScopeService.ids() approach).
    const orgIds = await this.resolveScopeOrgIds();
    if (!orgIds.length) {
      return this.excel.build({
        creator: 'HRM',
        sheets: [{ name: 'Stat', columns: [], rows: [] }],
      });
    }
    // organizations filter intersect
    let filteredOrgIds = orgIds;
    if (q.organizations) {
      const ids = q.organizations
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0);
      if (ids.length) {
        const set = new Set(ids);
        filteredOrgIds = orgIds.filter((id) => set.has(id));
      }
    }
    if (!filteredOrgIds.length) {
      return this.excel.build({
        creator: 'HRM',
        sheets: [{ name: 'Stat', columns: [], rows: [] }],
      });
    }

    // 2) Org base data (id, name, parent_id, _lft).
    const orgListRes = await this.db.execute(sql`
      SELECT id, name, parent_id, _lft
      FROM organizations
      WHERE id IN (${sql.join(filteredOrgIds.map((n) => sql`${n}`), sql`, `)})
        AND deleted_at IS NULL
      ORDER BY _lft ASC
    `);
    const orgList = ((orgListRes as any).rows ?? orgListRes) as Array<{
      id: number | string;
      name: string | null;
      parent_id: number | null;
      _lft: number;
    }>;

    // Devices per org (total + offline).
    const devCountRes = await this.db.execute(sql`
      SELECT organization_id,
             COUNT(*)::int AS total,
             SUM(CASE WHEN status = false THEN 1 ELSE 0 END)::int AS offline
      FROM h_c_p_devices
      WHERE organization_id IN (${sql.join(filteredOrgIds.map((n) => sql`${n}`), sql`, `)})
        AND deleted_at IS NULL
      GROUP BY organization_id
    `);
    const devCounts = ((devCountRes as any).rows ?? devCountRes) as Array<{
      organization_id: number | string;
      total: number;
      offline: number;
    }>;
    const devByOrg = new Map<number, { total: number; offline: number }>();
    for (const d of devCounts) {
      devByOrg.set(Number(d.organization_id), {
        total: Number(d.total),
        offline: Number(d.offline),
      });
    }

    // Workers per org (active worker_positions count).
    const wpCountRes = await this.db.execute(sql`
      SELECT organization_id, COUNT(*)::int AS total
      FROM worker_positions
      WHERE organization_id IN (${sql.join(filteredOrgIds.map((n) => sql`${n}`), sql`, `)})
        AND status = 2
        AND deleted_at IS NULL
      GROUP BY organization_id
    `);
    const wpCounts = ((wpCountRes as any).rows ?? wpCountRes) as Array<{
      organization_id: number | string;
      total: number;
    }>;
    const wpByOrg = new Map<number, number>();
    for (const w of wpCounts) {
      wpByOrg.set(Number(w.organization_id), Number(w.total));
    }

    // Workers without universities per org (NOT EXISTS worker_educations / worker_universities).
    // Laravel uses `workers.universities` relation — table is `worker_universities` (assumed).
    const wpUniRes = await this.db.execute(sql`
      SELECT wp.organization_id, COUNT(*)::int AS total
      FROM worker_positions wp
      JOIN workers w ON w.id = wp.worker_id
      WHERE wp.organization_id IN (${sql.join(filteredOrgIds.map((n) => sql`${n}`), sql`, `)})
        AND wp.status = 2
        AND wp.deleted_at IS NULL
        AND w.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM worker_universities wu
          WHERE wu.worker_id = w.id AND wu.deleted_at IS NULL
        )
      GROUP BY wp.organization_id
    `);
    const wpUniCounts = ((wpUniRes as any).rows ?? wpUniRes) as Array<{
      organization_id: number | string;
      total: number;
    }>;
    const uniByOrg = new Map<number, number>();
    for (const u of wpUniCounts) {
      uniByOrg.set(Number(u.organization_id), Number(u.total));
    }

    // 3) Workers without schedule this month per org.
    const now = new Date();
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    )
      .toISOString()
      .slice(0, 10);
    const monthEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0),
    )
      .toISOString()
      .slice(0, 10);
    const depCond = q.departments
      ? sql` AND wp.department_id IN (${sql.join(
          q.departments
            .split(',')
            .map((s) => Number(s.trim()))
            .filter((n) => Number.isInteger(n) && n > 0)
            .map((n) => sql`${n}`),
          sql`, `,
        )})`
      : sql``;
    const orgStatsRes = await this.db.execute(sql`
      SELECT wp.organization_id, COUNT(*)::int AS no_schedule_workers
      FROM worker_positions wp
      WHERE wp.organization_id IN (${sql.join(filteredOrgIds.map((n) => sql`${n}`), sql`, `)})
        AND wp.is_turnstile = true
        AND wp.status = 2
        AND wp.deleted_at IS NULL${depCond}
        AND wp.id NOT IN (
          SELECT worker_position_id FROM turnstile_worker_schedules
          WHERE deleted_at IS NULL
            AND date BETWEEN ${monthStart} AND ${monthEnd}
            AND worker_position_id IS NOT NULL
          GROUP BY worker_position_id
        )
        AND wp.worker_id NOT IN (
          SELECT worker_id FROM vacations
          WHERE deleted_at IS NULL
            AND "from" <= ${monthEnd}::date AND "to" >= ${monthStart}::date
        )
      GROUP BY wp.organization_id
    `);
    const orgStatsRows = ((orgStatsRes as any).rows ?? orgStatsRes) as Array<{
      organization_id: number | string;
      no_schedule_workers: number;
    }>;
    const scheduleByOrg = new Map<number, number>();
    for (const s of orgStatsRows) {
      scheduleByOrg.set(
        Number(s.organization_id),
        Number(s.no_schedule_workers),
      );
    }

    // 4) Build tree (parent_id chain). Roots = parent_id NULL OR parent not in scope.
    interface Node {
      id: number;
      name: string;
      total_devices: number;
      offline_devices: number;
      total_workers: number;
      workers_without_university: number;
      no_schedule_workers: number;
      children: Node[];
    }
    const inScope = new Set(orgList.map((o) => Number(o.id)));
    const nodeMap = new Map<number, Node>();
    for (const o of orgList) {
      const id = Number(o.id);
      const dev = devByOrg.get(id);
      nodeMap.set(id, {
        id,
        name: o.name ?? '',
        total_devices: dev?.total ?? 0,
        offline_devices: dev?.offline ?? 0,
        total_workers: wpByOrg.get(id) ?? 0,
        workers_without_university: uniByOrg.get(id) ?? 0,
        no_schedule_workers: scheduleByOrg.get(id) ?? 0,
        children: [],
      });
    }
    const roots: Node[] = [];
    for (const o of orgList) {
      const id = Number(o.id);
      const node = nodeMap.get(id)!;
      const pid = o.parent_id != null ? Number(o.parent_id) : null;
      if (pid != null && inScope.has(pid)) {
        nodeMap.get(pid)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    // 5) DFS flatten with cumulative counts per row.
    interface Row {
      id: number;
      level: number;
      has_child: boolean;
      name_per_level: string;
      total_devices: number;
      offline_devices: number;
      totalW: number;
      schedule: number;
      univer: number;
    }
    const rows: Row[] = [];
    let maxDepth = 1;
    const visit = (node: Node, level: number): {
      td: number;
      od: number;
      tw: number;
      sc: number;
      un: number;
    } => {
      maxDepth = Math.max(maxDepth, level);
      let td = node.total_devices;
      let od = node.offline_devices;
      let tw = node.total_workers;
      let sc = node.no_schedule_workers;
      let un = node.workers_without_university;
      // Cumulate children first (so parent row contains totals).
      for (const c of node.children) {
        const child = visit(c, level + 1);
        td += child.td;
        od += child.od;
        tw += child.tw;
        sc += child.sc;
        un += child.un;
      }
      rows.push({
        id: node.id,
        level,
        has_child: node.children.length > 0,
        name_per_level: node.name,
        total_devices: td,
        offline_devices: od,
        totalW: tw,
        schedule: sc,
        univer: un,
      });
      return { td, od, tw, sc, un };
    };
    // Process roots; rows pushed in post-order. But Laravel uses pre-order (push first, then children).
    // Re-do as pre-order to match Laravel.
    rows.length = 0;
    const preorder = (node: Node, level: number) => {
      maxDepth = Math.max(maxDepth, level);
      // Compute cumulative via post-order helper (separate pass).
      const cum = sumSubtree(node);
      rows.push({
        id: node.id,
        level,
        has_child: node.children.length > 0,
        name_per_level: node.name,
        total_devices: cum.td,
        offline_devices: cum.od,
        totalW: cum.tw,
        schedule: cum.sc,
        univer: cum.un,
      });
      for (const c of node.children) preorder(c, level + 1);
    };
    function sumSubtree(node: Node): {
      td: number; od: number; tw: number; sc: number; un: number;
    } {
      let td = node.total_devices;
      let od = node.offline_devices;
      let tw = node.total_workers;
      let sc = node.no_schedule_workers;
      let un = node.workers_without_university;
      for (const c of node.children) {
        const child = sumSubtree(c);
        td += child.td;
        od += child.od;
        tw += child.tw;
        sc += child.sc;
        un += child.un;
      }
      return { td, od, tw, sc, un };
    }
    for (const root of roots) preorder(root, 1);

    // 6) Excel columns: ID, C-1..C-N, Total Devices, Offline Devices, 1, 2, 3.
    const cols: Array<{ header: string; key: string; width: number }> = [
      { header: 'ID', key: 'id', width: 8 },
    ];
    for (let i = 1; i <= maxDepth; i++) {
      cols.push({ header: `C-${i}`, key: `name_level_${i}`, width: 30 });
    }
    cols.push({ header: 'Total Devices', key: 'total_devices', width: 14 });
    cols.push({ header: 'Offline Devices', key: 'offline_devices', width: 16 });
    cols.push({ header: '1', key: 'totalW', width: 10 });
    cols.push({ header: '2', key: 'schedule', width: 10 });
    cols.push({ header: '3', key: 'univer', width: 10 });

    return this.excel.build({
      creator: 'HRM',
      sheets: [
        {
          name: 'Stat',
          headerStyle: { bold: true },
          columns: cols,
          rowStyle: (r) =>
            r.has_child ? { bold: true, fontColor: 'FF0000FF' } : undefined,
          rows: rows.map((r) => {
            const row: Record<string, unknown> = {
              id: r.id,
              total_devices: r.total_devices,
              offline_devices: r.offline_devices,
              totalW: r.totalW,
              schedule: r.schedule,
              univer: r.univer,
              has_child: r.has_child,
            };
            for (let i = 1; i <= maxDepth; i++) {
              row[`name_level_${i}`] = i === r.level ? r.name_per_level : null;
            }
            return row;
          }),
        },
      ],
    });
  }

  // Org-scope IDs — Admin: all org IDs; otherwise user's organization subtree.
  // Laravel: Organization::leaderOrganizations($user).
  private async resolveScopeOrgIds(): Promise<number[]> {
    const userId = this.ctx.user_or_fail.id;
    const isAdmin = await this.perms.hasRole(userId, 'Admin');
    if (isAdmin) {
      const rows = await this.db
        .select({ id: organizations.id })
        .from(organizations)
        .where(notDeleted(organizations));
      return rows.map((r) => Number(r.id));
    }
    const userOrgId = this.ctx.user_or_fail.organization_id;
    if (userOrgId == null) return [];
    // Subtree: orgs with _lft >= user._lft AND _rgt <= user._rgt.
    const subtreeRes = await this.db.execute(sql`
      WITH base AS (SELECT _lft, _rgt FROM organizations WHERE id = ${Number(userOrgId)})
      SELECT o.id FROM organizations o, base b
      WHERE o._lft >= b._lft AND o._rgt <= b._rgt
        AND o.deleted_at IS NULL
    `);
    const rows = ((subtreeRes as any).rows ?? subtreeRes) as Array<{
      id: number | string;
    }>;
    return rows.map((r) => Number(r.id));
  }

  // Laravel: when($request->has('download')) — Excel::download(HCPDevicesExport).
  // 3 ustun: ID, Name, Status (Online/Offline + rang). Filterlar list() bilan bir xil
  // (search, organizations, org_status, attached, status va non-admin device scope).
  async buildDevicesExcel(q: QueryHcpDeviceDto): Promise<Buffer> {
    const conds: any[] = [notDeleted(h_c_p_devices)];

    if (q.search) conds.push(ilike(h_c_p_devices.name, `%${q.search}%`));
    if (q.organizations) {
      const ids = q.organizations
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0);
      if (ids.length) conds.push(inArray(h_c_p_devices.organization_id, ids));
    }
    if (q['org-status'] === 'yes' || q.org_status === 'yes') {
      conds.push(sql`${h_c_p_devices.organization_id} IS NOT NULL`);
    }
    if (q.org_status === 'no') {
      conds.push(isNull(h_c_p_devices.organization_id));
    }
    if (q.status === 'on') conds.push(eq(h_c_p_devices.status, true));
    if (q.status === 'off') conds.push(eq(h_c_p_devices.status, false));
    if (q.attached === 'yes') {
      conds.push(sql`${h_c_p_devices.device_id} IS NOT NULL`);
    } else if (q.attached === 'no') {
      conds.push(isNull(h_c_p_devices.device_id));
    }

    const isAdmin = await this.perms.hasRole(this.ctx.user_or_fail.id, 'Admin');
    if (!isAdmin) {
      const userOrgId = this.ctx.user_or_fail.organization_id;
      let allowedDevIds: number[] = [];
      if (userOrgId != null) {
        const rows = await this.db
          .select({ devices: hik_central_access_levels.devices })
          .from(organization_access_levels)
          .innerJoin(
            hik_central_access_levels,
            and(
              eq(
                hik_central_access_levels.id,
                organization_access_levels.hik_central_access_level_id,
              ),
              sql`${hik_central_access_levels.deleted_at} IS NULL`,
            ),
          )
          .where(
            eq(
              organization_access_levels.organization_id,
              Number(userOrgId),
            ),
          );
        const set = new Set<number>();
        for (const r of rows) {
          if (r.devices) {
            const parsed = parseDevicesJson(r.devices);
            for (const id of parsed) set.add(id);
          }
        }
        allowedDevIds = [...set];
      }
      if (allowedDevIds.length === 0) {
        return this.excel.build({
          creator: 'HRM',
          sheets: [
            {
              name: 'Devices',
              headerStyle: { bold: true },
              columns: [
                { header: 'ID', key: 'id', width: 8 },
                { header: 'Name', key: 'name', width: 40 },
                { header: 'Status', key: 'status', width: 12 },
              ],
              rows: [],
            },
          ],
        });
      }
      conds.push(inArray(h_c_p_devices.device_id, allowedDevIds));
    }

    const rows = await this.db
      .select({
        id: h_c_p_devices.id,
        name: h_c_p_devices.name,
        status: h_c_p_devices.status,
      })
      .from(h_c_p_devices)
      .where(and(...conds))
      .orderBy(asc(h_c_p_devices.name));

    return this.excel.build({
      creator: 'HRM',
      sheets: [
        {
          name: 'Devices',
          headerStyle: { bold: true },
          columns: [
            { header: 'ID', key: 'id', width: 8 },
            { header: 'Name', key: 'name', width: 40 },
            { header: 'Status', key: 'status', width: 12 },
          ],
          // Laravel: Online (yashil 05F762) / Offline (qizil F7054A) + bold.
          rowStyle: (r) =>
            r.status === 'Online'
              ? { bold: true, fontColor: 'FF05F762' }
              : { bold: true, fontColor: 'FFF7054A' },
          rows: rows.map((r) => ({
            id: Number(r.id),
            name: r.name,
            status: r.status ? 'Online' : 'Offline',
          })),
        },
      ],
    });
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

// hik_central_access_levels.devices — varchar JSON string ("[1,2,3]").
function parseDevicesJson(raw: unknown): number[] {
  if (raw == null) return [];
  let v: unknown = raw;
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(v)) return [];
  return v.map((x) => Number(x)).filter((n) => Number.isFinite(n));
}

// Laravel Carbon::format('Y-m-d H:i:s') parity.
function formatLaravelTs(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === 'string') {
    if (v.length >= 19 && v.charAt(10) === 'T') {
      return v.replace('T', ' ').slice(0, 19);
    }
    if (v.length >= 19) return v.slice(0, 19);
    return v;
  }
  if (v instanceof Date) {
    return v.toISOString().replace('T', ' ').slice(0, 19);
  }
  return String(v);
}
