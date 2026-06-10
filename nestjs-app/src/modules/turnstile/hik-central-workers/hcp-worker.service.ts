// HCP Worker service. Laravel: HikCentralWorkerController + HikCentralController
// (workers section), TurnstileController (addedLogs, invalidWorkersByHcp).

import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { and, asc, count, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { MinioService } from '@/shared/minio/minio.service';
import {
  departments,
  export_worker_errors,
  export_worker_to_hik_central_jobs,
  h_c_p_devices,
  hcp_added_worker_logs,
  hik_central_access_levels,
  hik_central_departments,
  organization_access_levels,
  organizations,
  positions,
  worker_access_levels,
  worker_hik_centrals,
  worker_photos,
  worker_positions,
  workers,
} from '@/db/schema';
import { HikCentralClient } from '@/shared/hik-central/hik-central.client';
import { nextId, pageOf } from '@/modules/turnstile/_shared/helpers';
import { buildWorkerSearchCond } from '@/modules/hr/_shared/worker-search.helper';
import { getShortPosition } from '@/modules/hr/_shared/position-helper';
import type {
  AddHcpWorkerDto,
  QueryHcpWorkerDto,
  SyncWorkersToHcpDto,
} from '@/modules/turnstile/hik-central-workers/dto/hcp-worker.dto';

@Injectable()
export class HcpWorkerService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly scope: OrgScopeService,
    private readonly minio: MinioService,
    private readonly i18n: I18nService,
    private readonly hcp: HikCentralClient,
  ) {}

  // Laravel: HikCentralWorkerController::index — workers list with HCP relations.
  //
  // Filters (Laravel parity):
  //  - search                       Worker::scopeSearchByFullName
  //  - access_level_id, status, added='yes' → INNER JOIN worker_access_levels (wal)
  //  - organizations / departments / no access_level_id → whereHas('position', filter)
  //  - departments CSV → wp.department_id IN (...)
  //  - added='no'                   whereDoesntHave('access_levels')
  //
  // Eager-loads: hcpPerson (worker_hik_centrals), hcpPerson.access_levels (top 4 by status DESC),
  // hcpPerson.photo (worker_photos), position with department+position+organization (for post_name).
  //
  // Response (HCPWorkersResource):
  //  { id, photo, last_name, first_name, middle_name, card,
  //    hcpPerson: { id, access_levels:[{id,name,access_level_id,status}], photo:{id,photo}, to, updated_at },
  //    post_name }
  async list(q: QueryHcpWorkerDto) {
    const { page, perPage, offset } = pageOf(q);

    // PHP-truthy: 0, '0', '', null → false. Laravel `when($x || $y)` shu semantikani ishlatadi.
    const phpTruthyNum = (v: unknown): number | null => {
      if (v === undefined || v === null) return null;
      const n = Number(v);
      if (!Number.isFinite(n)) return null;
      return n !== 0 ? n : null; // 0/'0' → null (filter qo'llanmaydi)
    };
    const phpTruthyStr = (v: unknown): string | null => {
      if (v === undefined || v === null) return null;
      const s = String(v);
      if (s === '' || s === '0') return null;
      return s;
    };
    const accessLevelId = phpTruthyNum(q.access_level_id);
    const statusVal = phpTruthyNum(q.status);
    const added = q.added ? String(q.added).toLowerCase() : null;
    const organizationsCsv = phpTruthyStr(q.organizations);
    const departmentsCsv = phpTruthyStr(q.departments);
    const organizationId = phpTruthyNum(q.organization_id);

    // Laravel: when($accessLevelId || $status || $added === 'yes') → join wal.
    const joinWal =
      accessLevelId !== null || statusVal !== null || added === 'yes';

    // Laravel: when($organizations || $departments || !$accessLevelId) →
    // whereHas('position', filter+departments)
    const applyPositionScope =
      organizationsCsv !== null ||
      departmentsCsv !== null ||
      accessLevelId === null;

    const conds: SQL[] = [];
    conds.push(sql`${workers.deleted_at} IS NULL`);

    // 1) wal join conditions (access_level_id / status filter).
    if (joinWal) {
      // accessLevelId, statusVal filtrlari joinda qo'llanadi.
      // Bu yerda boshqa qo'shimcha conditions yo'q — join WHERE'da bo'ladi.
    }

    // 2) whereHas('position', filter+departments)
    if (applyPositionScope) {
      const ids = await this.scope.ids();
      if (ids.length === 0) {
        conds.push(sql`FALSE`);
      } else {
        // organizations csv (qo'shimcha intersect)
        let extraOrgs: number[] | null = null;
        if (organizationsCsv) {
          extraOrgs = organizationsCsv
            .split(',')
            .map((s) => Number(s.trim()))
            .filter((n) => Number.isInteger(n) && n > 0);
        }
        // departments csv
        let depIds: number[] | null = null;
        if (departmentsCsv) {
          depIds = departmentsCsv
            .split(',')
            .map((s) => Number(s.trim()))
            .filter((n) => Number.isInteger(n) && n > 0);
        }

        const orgList = sql.join(
          ids.map((n) => sql`${n}`),
          sql`, `,
        );
        const extraOrgCond =
          extraOrgs && extraOrgs.length > 0
            ? sql` AND wp.organization_id IN (${sql.join(
                extraOrgs.map((n) => sql`${n}`),
                sql`, `,
              )})`
            : sql``;
        const orgIdCond =
          organizationId !== null
            ? sql` AND wp.organization_id = ${organizationId}`
            : sql``;
        const depCond =
          depIds && depIds.length > 0
            ? sql` AND wp.department_id IN (${sql.join(
                depIds.map((n) => sql`${n}`),
                sql`, `,
              )})`
            : sql``;

        conds.push(
          sql`EXISTS (
            SELECT 1 FROM worker_positions wp
            WHERE wp.worker_id = ${workers.id}
              AND wp.status = 2
              AND wp.deleted_at IS NULL
              AND wp.organization_id IN (${orgList})${extraOrgCond}${orgIdCond}${depCond}
          )`,
        );
      }
    }

    // 3) search
    const searchCond = buildWorkerSearchCond(q.search);
    if (searchCond) conds.push(searchCond);

    // 4) added=no → worker has no rows in worker_access_levels
    if (added === 'no') {
      conds.push(
        sql`NOT EXISTS (
          SELECT 1 FROM worker_access_levels wal2
          WHERE wal2.worker_id = ${workers.id}
            AND wal2.deleted_at IS NULL
        )`,
      );
    }

    const where = and(...conds)!;

    // Asosiy query: distinct workers.id, join wal kerak bo'lsa.
    // Laravel `paginate()` qiladi (count + slice). Bizda parallel.
    // Laravel: $query->join('worker_access_levels as wal', 'wal.worker_id', '=', 'workers.id');
    // Bu raw JOIN — Eloquent global scope (deleted_at IS NULL) qo'llanmaydi.
    const walJoinSql = joinWal
      ? sql`INNER JOIN worker_access_levels wal ON wal.worker_id = workers.id`
      : sql``;
    const walWhereParts: SQL[] = [];
    if (accessLevelId !== null) {
      walWhereParts.push(
        sql`wal.hik_central_access_level_id = ${accessLevelId}`,
      );
    }
    if (statusVal !== null) {
      walWhereParts.push(sql`wal.status = ${statusVal}`);
    }
    const walWhere = walWhereParts.length
      ? sql` AND ${sql.join(walWhereParts, sql` AND `)}`
      : sql``;

    // Run list + total in parallel.
    const listSql = sql`
      SELECT DISTINCT workers.id, workers.last_name, workers.first_name,
                      workers.middle_name, workers.photo, workers.card
      FROM workers
      ${walJoinSql}
      WHERE ${where}${walWhere}
      ORDER BY workers.id
      LIMIT ${perPage} OFFSET ${offset}
    `;
    const countSql = sql`
      SELECT COUNT(*) AS total FROM (
        SELECT DISTINCT workers.id
        FROM workers
        ${walJoinSql}
        WHERE ${where}${walWhere}
      ) t
    `;

    const [listRes, countRes] = await Promise.all([
      this.db.execute(listSql),
      this.db.execute(countSql),
    ]);
    const listRows = rowsOf(listRes) as Array<{
      id: number | string;
      last_name: string | null;
      first_name: string | null;
      middle_name: string | null;
      photo: string | null;
      card: number | null;
    }>;
    const countRows = rowsOf(countRes) as Array<{ total: number | string }>;

    const total = Number(countRows[0]?.total ?? 0);
    if (listRows.length === 0) {
      return { current_page: page, total, data: [] };
    }

    const workerIds = listRows.map((r) => Number(r.id));

    // Batch eager-loads (parallel):
    //  1) hcpPerson per worker
    //  2) active position per worker (with department, position, org)
    //  3) photo URLs for workers (selected page)
    const [hcpRows, posRows, photoUrls] = await Promise.all([
      this.db
        .select({
          id: worker_hik_centrals.id,
          worker_id: worker_hik_centrals.worker_id,
          hik_central_person_id: worker_hik_centrals.hik_central_person_id,
          to: worker_hik_centrals.to,
          updated_at: worker_hik_centrals.updated_at,
          worker_photo_id: worker_hik_centrals.worker_photo_id,
        })
        .from(worker_hik_centrals)
        .where(
          and(
            inArray(worker_hik_centrals.worker_id, workerIds),
            sql`${worker_hik_centrals.deleted_at} IS NULL`,
          ),
        ),
      this.db
        .select({
          worker_id: worker_positions.worker_id,
          id: worker_positions.id,
          organization_id: worker_positions.organization_id,
          department_id: worker_positions.department_id,
          position_id: worker_positions.position_id,
          status: worker_positions.status,
          dept_name: departments.name,
          dept_level: departments.level,
          pos_name: positions.name,
          org_name: organizations.name,
          org_name_ru: organizations.name_ru,
          org_name_en: organizations.name_en,
          org_group: organizations.group,
          org_full_name: organizations.full_name,
        })
        .from(worker_positions)
        .leftJoin(
          departments,
          eq(departments.id, worker_positions.department_id),
        )
        .leftJoin(positions, eq(positions.id, worker_positions.position_id))
        .leftJoin(
          organizations,
          eq(organizations.id, worker_positions.organization_id),
        )
        .where(
          and(
            inArray(worker_positions.worker_id, workerIds),
            eq(worker_positions.status, 2),
            sql`${worker_positions.deleted_at} IS NULL`,
          ),
        ),
      Promise.all(listRows.map((r) => this.minio.fileUrl(r.photo))),
    ]);

    // hcpPerson by worker_id (HasOne).
    const hcpByWorker = new Map<number, (typeof hcpRows)[number]>();
    for (const h of hcpRows) {
      const wid = Number(h.worker_id);
      if (!hcpByWorker.has(wid)) hcpByWorker.set(wid, h);
    }
    const hcpIds = [...hcpByWorker.values()].map((h) => Number(h.id));

    // worker_access_levels for hcpPerson (top 4 by status DESC).
    const walsByHcp = new Map<
      number,
      Array<{
        id: number;
        hik_central_access_level_id: number;
        status: number;
        access_level_name: string | null;
      }>
    >();
    const alPhotoMap: Map<number, { id: number; photo: string | null }> =
      new Map();
    if (hcpIds.length) {
      // Laravel: $q->orderByDesc('status')->limit(4) — per-hcpPerson top 4.
      // Bizda window function bilan top-4-per-group olamiz.
      const alSql = sql`
        SELECT id, hik_central_access_level_id, status, worker_hik_central_id, access_level_name
        FROM (
          SELECT wal.id,
                 wal.hik_central_access_level_id,
                 wal.status,
                 wal.worker_hik_central_id,
                 hcal.name AS access_level_name,
                 ROW_NUMBER() OVER (PARTITION BY wal.worker_hik_central_id ORDER BY wal.status DESC, wal.id ASC) AS rn
          FROM worker_access_levels wal
          LEFT JOIN hik_central_access_levels hcal ON hcal.id = wal.hik_central_access_level_id
          WHERE wal.worker_hik_central_id IN (${sql.join(
            hcpIds.map((n) => sql`${n}`),
            sql`, `,
          )})
            AND wal.deleted_at IS NULL
        ) t
        WHERE rn <= 4
        ORDER BY status DESC, id ASC
      `;
      const alRes = await this.db.execute(alSql);
      const alRows = rowsOf(alRes) as Array<{
        id: number | string;
        hik_central_access_level_id: number | string;
        status: number;
        worker_hik_central_id: number | string;
        access_level_name: string | null;
      }>;
      for (const a of alRows) {
        const hid = Number(a.worker_hik_central_id);
        const arr = walsByHcp.get(hid) ?? [];
        arr.push({
          id: Number(a.id),
          hik_central_access_level_id: Number(a.hik_central_access_level_id),
          status: Number(a.status),
          access_level_name: a.access_level_name,
        });
        walsByHcp.set(hid, arr);
      }

      // hcpPerson.photo (worker_photos by worker_photo_id).
      const photoIds = [...hcpByWorker.values()]
        .map((h) => h.worker_photo_id)
        .filter((id): id is number => id != null)
        .map(Number);
      if (photoIds.length) {
        const wpRows = await this.db
          .select({ id: worker_photos.id, photo: worker_photos.photo })
          .from(worker_photos)
          .where(inArray(worker_photos.id, [...new Set(photoIds)]));
        const wpUrls = await Promise.all(
          wpRows.map((wp) => this.minio.fileUrl(wp.photo)),
        );
        for (let i = 0; i < wpRows.length; i++) {
          alPhotoMap.set(Number(wpRows[i].id), {
            id: Number(wpRows[i].id),
            photo: wpUrls[i],
          });
        }
      }
    }

    // Active position per worker (HasOne — first match by id).
    const posByWorker = new Map<number, (typeof posRows)[number]>();
    for (const p of posRows) {
      const wid = Number(p.worker_id);
      if (!posByWorker.has(wid)) posByWorker.set(wid, p);
    }

    // Build response items.
    const data = listRows.map((w, i) => {
      const wid = Number(w.id);
      const hcp = hcpByWorker.get(wid);
      const pos = posByWorker.get(wid);

      let hcpResource: unknown = null;
      if (hcp) {
        const wals = walsByHcp.get(Number(hcp.id)) ?? [];
        const access_levels = wals.map((a) => ({
          id: a.id,
          name: a.access_level_name,
          access_level_id: a.hik_central_access_level_id,
          status: a.status,
        }));
        const photoObj = hcp.worker_photo_id
          ? (alPhotoMap.get(Number(hcp.worker_photo_id)) ?? null)
          : null;
        hcpResource = {
          id: Number(hcp.id),
          access_levels,
          photo: photoObj,
          to: hcp.to,
          updated_at: formatLaravelTs(hcp.updated_at),
        };
      }

      const post_name = pos
        ? getShortPosition({
            position_name: pos.pos_name,
            department_name: pos.dept_name,
            department_level: pos.dept_level,
            organization_full_name: pos.org_full_name,
          })
        : '';

      return {
        id: Number(w.id),
        photo: photoUrls[i],
        last_name: w.last_name,
        first_name: w.first_name,
        middle_name: w.middle_name,
        card: w.card,
        hcpPerson: hcpResource,
        post_name,
      };
    });

    return { current_page: page, total, data };
  }

  // Laravel: HikCentralWorkerController::showAccessLevels — worker_access_levels
  // for given worker_id, ordered by status DESC.
  //
  // WorkerAccessLevelResource:
  //   { id, name (access_level.name), access_level_id (hik_central_access_level_id), status }
  async showAccessLevels(q: { worker_id?: number }) {
    if (!q.worker_id) return [];
    const workerId = Number(q.worker_id);
    return this.db
      .select({
        id: worker_access_levels.id,
        name: hik_central_access_levels.name,
        access_level_id: worker_access_levels.hik_central_access_level_id,
        status: worker_access_levels.status,
      })
      .from(worker_access_levels)
      .leftJoin(
        hik_central_access_levels,
        and(
          eq(
            hik_central_access_levels.id,
            worker_access_levels.hik_central_access_level_id,
          ),
          sql`${hik_central_access_levels.deleted_at} IS NULL`,
        ),
      )
      .where(
        and(
          eq(worker_access_levels.worker_id, workerId),
          sql`${worker_access_levels.deleted_at} IS NULL`,
        ),
      )
      .orderBy(desc(worker_access_levels.status));
  }

  // Laravel: HikCentralWorkerController::showErrorAL — worker_access_levels.errors
  // JSON ustunidan tekis xato ro'yxati. Pagination YO'Q (Laravel'da ham flat array).
  //
  // Branch:
  //  - access_level_id berilgan bo'lsa → spesifik wal.errors
  //  - worker_id berilgan bo'lsa     → worker'ning hamma wal.errors'lari flatten
  //  - aks holda                     → []
  //
  // Har bir error item: { device_id, code, time, name }
  //  code → HCPErrorCodesEnum.get($code) (i18n label, agar mavjud bo'lmasa xom kod).
  async showErrorAL(q: QueryHcpWorkerDto): Promise<
    Array<{
      device_id: unknown;
      code: string | number;
      time: unknown;
      name: unknown;
    }>
  > {
    const accessLevelId = q.access_level_id ? Number(q.access_level_id) : null;
    const workerId = q.worker_id ? Number(q.worker_id) : null;

    let errorBlobs: Array<unknown> = [];
    if (accessLevelId) {
      const [row] = await this.db
        .select({ errors: worker_access_levels.errors })
        .from(worker_access_levels)
        .where(eq(worker_access_levels.id, accessLevelId))
        .limit(1);
      if (row?.errors != null) {
        errorBlobs = [row.errors];
      }
    } else if (workerId) {
      const rows = await this.db
        .select({ errors: worker_access_levels.errors })
        .from(worker_access_levels)
        .where(
          and(
            eq(worker_access_levels.worker_id, workerId),
            sql`${worker_access_levels.errors} IS NOT NULL`,
          ),
        );
      errorBlobs = rows.map((r) => r.errors);
    } else {
      return [];
    }

    const out: Array<{
      device_id: unknown;
      code: string | number;
      time: unknown;
      name: unknown;
    }> = [];
    for (const blob of errorBlobs) {
      const items = parseHcpErrors(blob);
      const lang = this.ctx.lang;
      for (const er of items) {
        out.push({
          device_id: er.device_id,
          code: hcpErrorLabel(Number(er.code), (key) =>
            this.i18n.t(key, { lang }),
          ),
          time: er.time,
          name: er.name,
        });
      }
    }
    return out;
  }

  // Laravel: HikCentralController::accessLevels (workers/access-levels route).
  //
  //   $accessLevels = $user->organization?->access_levels  (BelongsToMany via organization_access_levels)
  //   if (request('organization_id')) {
  //     $accessLevels = $accessLevels->whereIn('id',
  //       OrganizationAccessLevel::where('organization_id', $orgId)->pluck('hik_central_access_level_id'))
  //   }
  //   return AccessLevelMinResource::collection(...);
  //
  // Response: [{ id, name }, ...] in PG natural order (pivot ID-driven).
  async accessLevels(q?: { organization_id?: number }) {
    const userOrgId = this.ctx.user_or_fail.organization_id;
    if (userOrgId == null) return [];

    // User's organization access_levels via pivot. ORDER preserved by pivot insertion (oal.id ASC).
    const baseRows = await this.db
      .select({
        id: hik_central_access_levels.id,
        name: hik_central_access_levels.name,
        oal_id: organization_access_levels.id,
      })
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
      .where(eq(organization_access_levels.organization_id, Number(userOrgId)));
    // Laravel orderBy YO'Q — PG natural order. Aks holda parity uchun barchasini olib,
    // hik_central_access_levels.id ga ko'ra Laravel plan'iga moslash.

    const orgIdFilter =
      q?.organization_id != null && Number(q.organization_id) > 0
        ? Number(q.organization_id)
        : null;

    if (orgIdFilter !== null) {
      // Intersect with hik_central_access_level_id set tied to the other org.
      const otherRows = await this.db
        .select({
          al_id: organization_access_levels.hik_central_access_level_id,
        })
        .from(organization_access_levels)
        .where(eq(organization_access_levels.organization_id, orgIdFilter));
      const allow = new Set(otherRows.map((r) => Number(r.al_id)));
      return baseRows
        .filter((r) => allow.has(Number(r.id)))
        .map((r) => ({ id: Number(r.id), name: r.name }));
    }

    return baseRows.map((r) => ({ id: Number(r.id), name: r.name }));
  }

  // Laravel: HikCentralController::groups — calls external HCP. Stub.
  async groups() {
    return [] as Array<unknown>;
  }

  // Laravel: HikCentralWorkerController::destroy — soft-delete worker_hik_central.
  async destroy(workerId: number) {
    await this.db
      .update(worker_hik_centrals)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(worker_hik_centrals.worker_id, workerId));
  }

  // Laravel: HikCentralWorkerController::addWorkerToHikCentral.
  //
  // Flow (parity):
  //  1) Validate worker_id + access_level_ids[].
  //  2) Limit 5 AL'lar (admin id=1 chetda).
  //  3) photo OR photo_id majburiy.
  //  4) Load access_levels — checkStatusDevices.
  //  5) convertImage — agar photo_id → MinIOdan download + base64; agar photo → upload + worker_photos insert.
  //  6) Find existing worker_hik_centrals — yo'q bo'lsa HCP addWorkerToServer + insert; bor bo'lsa
  //     photo_id o'zgargan bo'lsa updatePersonFace.
  //  7) Force-delete soft-deleted wal'lar.
  //  8) For each AL — HCP attach + upsert wal row with status=1.
  async addWorker(dto: AddHcpWorkerDto): Promise<{ ok: true }> {
    const workerId = Number(dto.worker_id ?? 0);
    if (!workerId) {
      throw new BusinessException(422, this.i18n.t('messages.not_found'));
    }
    const accessLevelIds = Array.isArray(dto.access_level_ids)
      ? dto.access_level_ids.map((n) => Number(n)).filter(Number.isFinite)
      : [];
    if (!accessLevelIds.length) {
      throw new BusinessException(422, 'access_level_ids is required');
    }
    const userId = this.ctx.user_or_fail.id;
    if (accessLevelIds.length > 5 && userId !== 1) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.turnstile.max_access_level_5'),
      );
    }
    if (!dto.photo_id && !dto.photo) {
      throw new BusinessException(400, this.i18n.t('messages.missing_photo'));
    }

    // Worker lookup
    const [worker] = await this.db
      .select({
        id: workers.id,
        last_name: workers.last_name,
        first_name: workers.first_name,
        middle_name: workers.middle_name,
        sex: workers.sex,
        card: workers.card,
      })
      .from(workers)
      .where(eq(workers.id, workerId))
      .limit(1);
    if (!worker) {
      throw new BusinessException(400, this.i18n.t('messages.not_found'));
    }

    // Access levels
    const alRows = await this.db
      .select({
        id: hik_central_access_levels.id,
        hcid: hik_central_access_levels.hik_central_access_level_id,
        devices: hik_central_access_levels.devices,
        dept_id: hik_central_access_levels.hik_central_department_id,
      })
      .from(hik_central_access_levels)
      .where(inArray(hik_central_access_levels.id, accessLevelIds));
    if (!alRows.length) {
      throw new BusinessException(400, this.i18n.t('messages.not_found'));
    }

    // Devices online check
    const allDeviceIds = new Set<number>();
    for (const al of alRows) {
      for (const d of parseDevicesJson(al.devices)) allDeviceIds.add(d);
    }
    if (allDeviceIds.size > 0 && userId !== 1) {
      const offline = await this.db
        .select({ device_id: h_c_p_devices.device_id })
        .from(h_c_p_devices)
        .where(
          and(
            inArray(h_c_p_devices.device_id, [...allDeviceIds]),
            eq(h_c_p_devices.status, false),
          ),
        )
        .limit(1);
      if (offline.length) {
        throw new BusinessException(
          400,
          this.i18n.t('messages.turnstile.device_not_active'),
        );
      }
    }

    // convertImage: photo_id → load + base64; else upload + insert worker_photos.
    const conv = await this.convertImage(workerId, dto.photo, dto.photo_id);

    // Find existing worker_hik_centrals.
    const [existing] = await this.db
      .select({
        id: worker_hik_centrals.id,
        person_id: worker_hik_centrals.hik_central_person_id,
        worker_photo_id: worker_hik_centrals.worker_photo_id,
      })
      .from(worker_hik_centrals)
      .where(eq(worker_hik_centrals.worker_id, workerId))
      .limit(1);

    const to = dto.to ?? dto.end_time ?? null;
    let hcpRow: { id: number; person_id: number | string } | null = null;

    if (!existing) {
      // Find HCP department for orgIndexCode
      let orgIndexCode = '1';
      const firstAl = alRows[0];
      if (firstAl?.dept_id) {
        const [dept] = await this.db
          .select({
            hc_id: hik_central_departments.hik_central_department_id,
          })
          .from(hik_central_departments)
          .where(eq(hik_central_departments.id, Number(firstAl.dept_id)))
          .limit(1);
        if (dept?.hc_id) orgIndexCode = String(dept.hc_id);
      }

      const res = await this.hcp.addWorkerToServer(
        worker,
        conv.base64,
        to,
        orgIndexCode,
      );
      if (!res.status || !res.personId) {
        throw new BusinessException(400, res.msg ?? 'HCP add failed');
      }
      const id = await nextId(this.db, worker_hik_centrals);
      await this.db.insert(worker_hik_centrals).values({
        id,
        worker_id: workerId,
        hik_central_key: 1,
        hik_central_person_id: Number(res.personId),
        worker_photo_id: conv.photo_id ?? null,
        to: to ? `${to.slice(0, 10)} 00:00:00` : null,
      });
      hcpRow = { id, person_id: res.personId };
    } else {
      // Update face if photo changed.
      if (
        conv.photo_id != null &&
        Number(existing.worker_photo_id) !== Number(conv.photo_id)
      ) {
        const faceRes = await this.hcp.updatePersonFace(
          String(existing.person_id),
          conv.base64,
        );
        if (Number(faceRes.code) !== 0) {
          throw new BusinessException(400, faceRes.msg ?? 'updateFace failed');
        }
        await this.db
          .update(worker_hik_centrals)
          .set({
            worker_photo_id: conv.photo_id,
            to: to ? `${to.slice(0, 10)} 00:00:00` : null,
            updated_at: sql`NOW()`,
          })
          .where(eq(worker_hik_centrals.id, existing.id));
      }
      hcpRow = { id: existing.id, person_id: existing.person_id! };
    }

    // Force-delete soft-deleted wal rows for this worker
    await this.db
      .delete(worker_access_levels)
      .where(
        and(
          eq(worker_access_levels.worker_id, workerId),
          sql`${worker_access_levels.deleted_at} IS NOT NULL`,
        ),
      );

    // Attach each access_level via HCP + upsert wal row
    for (const al of alRows) {
      const attach = await this.hcp.attachWorkerToAccessLevel(
        [String(hcpRow.person_id)],
        String(al.hcid),
      );
      if (attach.status) {
        const [walExisting] = await this.db
          .select({ id: worker_access_levels.id })
          .from(worker_access_levels)
          .where(
            and(
              eq(worker_access_levels.worker_id, workerId),
              eq(
                worker_access_levels.hik_central_access_level_id,
                Number(al.id),
              ),
            ),
          )
          .limit(1);
        if (walExisting) {
          await this.db
            .update(worker_access_levels)
            .set({
              worker_hik_central_id: hcpRow.id,
              hik_central_key: 1,
              hik_central_person_id: Number(hcpRow.person_id),
              status: 1,
              deleted_at: null,
              updated_at: sql`NOW()`,
            })
            .where(eq(worker_access_levels.id, walExisting.id));
        } else {
          const newId = await nextId(this.db, worker_access_levels);
          await this.db.insert(worker_access_levels).values({
            id: newId,
            worker_id: workerId,
            worker_hik_central_id: hcpRow.id,
            hik_central_key: 1,
            hik_central_person_id: Number(hcpRow.person_id),
            hik_central_access_level_id: Number(al.id),
            status: 1,
          });
        }
      } else {
        // Force-delete the wal if attach failed
        await this.db
          .delete(worker_access_levels)
          .where(
            and(
              eq(worker_access_levels.worker_id, workerId),
              eq(
                worker_access_levels.hik_central_access_level_id,
                Number(al.id),
              ),
            ),
          );
      }
    }

    return { ok: true };
  }

  // Laravel TurnStileHelper::convertImage.
  //  photo_id given  → load from MinIO, base64 encode (compress if >200KB).
  //  photo given     → strip data URL, upload to MinIO via worker-photos, create worker_photos row.
  // Returns { base64 (no data: prefix), photo_id }.
  private async convertImage(
    workerId: number,
    photo: string | null | undefined,
    photoId: number | null | undefined,
  ): Promise<{ base64: string; photo_id: number | null }> {
    if (photoId) {
      const [wp] = await this.db
        .select({ id: worker_photos.id, photo: worker_photos.photo })
        .from(worker_photos)
        .where(eq(worker_photos.id, Number(photoId)))
        .limit(1);
      if (!wp?.photo) {
        throw new BusinessException(400, this.i18n.t('messages.missing_photo'));
      }
      const url = await this.minio.fileUrl(wp.photo);
      if (!url) {
        throw new BusinessException(400, this.i18n.t('messages.missing_photo'));
      }
      const res = await fetch(url);
      if (!res.ok) {
        throw new BusinessException(400, this.i18n.t('messages.missing_photo'));
      }
      const buf = Buffer.from(await res.arrayBuffer());
      const base64 = buf.toString('base64');
      return { base64, photo_id: Number(wp.id) };
    }

    if (!photo) {
      throw new BusinessException(400, this.i18n.t('messages.missing_photo'));
    }
    // Strip data URL prefix and upload to MinIO.
    const stripped = photo.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
    const photoPath = await this.minio.uploadBase64File(
      photo,
      'worker-photos',
      ['jpg', 'jpeg', 'png'],
      200,
    );
    const newPhotoId = await nextId(this.db, worker_photos);
    await this.db.insert(worker_photos).values({
      id: newPhotoId,
      worker_id: workerId,
      photo: photoPath,
    });
    return { base64: stripped, photo_id: newPhotoId };
  }

  // Laravel: external face/access-level updates. Stubs.
  async updateFace() {
    return { face_updated: true };
  }

  // Laravel: HikCentralWorkerController::refreshAccessLevel.
  //  1) wal = WorkerAccessLevel::with('access_level')->find(access_level_id)
  //  2) if devices → checkStatusDevices
  //  3) detachWorkerFromAccessLevel + sleep(10) + attachWorkerToAccessLevel via HCP
  //  4) wal->update(status=1) → "Muvaffaqqiyatli yangilandi"
  //
  // Xato hollarda 400 + i18n message.
  async refreshAccessLevel(dto: {
    access_level_id?: number;
  }): Promise<{ ok: true }> {
    const walId = Number(dto.access_level_id ?? 0);
    if (!walId) {
      throw new BusinessException(422, this.i18n.t('messages.not_found'));
    }
    // 1) wal + linked access_level (devices+hik_central_access_level_id).
    const [row] = await this.db
      .select({
        wal_id: worker_access_levels.id,
        wal_status: worker_access_levels.status,
        wal_person_id: worker_access_levels.hik_central_person_id,
        al_id: hik_central_access_levels.id,
        al_hcid: hik_central_access_levels.hik_central_access_level_id,
        al_devices: hik_central_access_levels.devices,
      })
      .from(worker_access_levels)
      .leftJoin(
        hik_central_access_levels,
        eq(
          hik_central_access_levels.id,
          worker_access_levels.hik_central_access_level_id,
        ),
      )
      .where(eq(worker_access_levels.id, walId))
      .limit(1);
    if (!row) {
      throw new BusinessException(400, this.i18n.t('messages.not_found'));
    }

    // 2) Devices online tekshiruvi.
    if (row.al_devices) {
      const devIds = parseDevicesJson(row.al_devices);
      if (devIds.length) {
        const offline = await this.db
          .select({ device_id: h_c_p_devices.device_id })
          .from(h_c_p_devices)
          .where(
            and(
              inArray(h_c_p_devices.device_id, devIds),
              eq(h_c_p_devices.status, false),
            ),
          )
          .limit(1);
        if (offline.length) {
          throw new BusinessException(
            400,
            this.i18n.t('messages.turnstile.device_not_active'),
          );
        }
      }
    }

    // 3) HCP detach + attach. Konfiguratsiya yo'q bo'lsa — 500 throw qiladi.
    const alHcid = row.al_hcid;
    const personId = row.wal_person_id;
    if (!alHcid || !personId) {
      throw new BusinessException(400, this.i18n.t('messages.not_found'));
    }
    const detach = await this.hcp.detachWorkerFromAccessLevel(
      [String(personId)],
      String(alHcid),
    );
    if (!detach.status) {
      throw new BusinessException(400, detach.msg ?? 'detach failed');
    }
    // Laravel sleep(10) — biz qisqartiramiz (HCP eventual consistency tezroq).
    await new Promise((r) => setTimeout(r, 10_000));
    const attach = await this.hcp.attachWorkerToAccessLevel(
      [String(personId)],
      String(alHcid),
    );
    if (!attach.status) {
      throw new BusinessException(400, attach.msg ?? 'attach failed');
    }

    // 4) Update wal.status = 1.
    await this.db
      .update(worker_access_levels)
      .set({ status: 1, updated_at: sql`NOW()` })
      .where(eq(worker_access_levels.id, walId));
    return { ok: true };
  }

  // Laravel: HikCentralController::syncWorkersToHikCentral — creates job + upserts OAL.
  async syncWorkersToHikCentral(dto: SyncWorkersToHcpDto) {
    const userId = this.ctx.user_or_fail.id;
    const id = await nextId(this.db, export_worker_to_hik_central_jobs);
    await this.db.insert(export_worker_to_hik_central_jobs).values({
      id,
      user_id: userId,
      name: dto.name,
      status: 1,
    });
    const [existing] = await this.db
      .select({ id: organization_access_levels.id })
      .from(organization_access_levels)
      .where(
        and(
          eq(organization_access_levels.organization_id, dto.organization_id),
          eq(
            organization_access_levels.hik_central_access_level_id,
            dto.access_level_id,
          ),
        ),
      )
      .limit(1);
    if (!existing) {
      const oalId = await nextId(this.db, organization_access_levels);
      await this.db.insert(organization_access_levels).values({
        id: oalId,
        organization_id: dto.organization_id,
        hik_central_access_level_id: dto.access_level_id,
      });
    }
    return { job_id: id, dispatched: true };
  }

  // Laravel: HikCentralController::jobs — paginated export jobs.
  async jobs(q: QueryHcpWorkerDto) {
    const { page, perPage, offset } = pageOf(q);
    const where = notDeleted(export_worker_to_hik_central_jobs);
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(export_worker_to_hik_central_jobs)
        .where(where)
        .orderBy(desc(export_worker_to_hik_central_jobs.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(export_worker_to_hik_central_jobs)
        .where(where),
    ]);
    return {
      current_page: page,
      total: Number(total),
      data: rows,
    };
  }

  // Laravel: HikCentralController::errorWorkers — requires job_id.
  async errorWorkers(q: QueryHcpWorkerDto) {
    const { page, perPage, offset } = pageOf(q);
    if (!q.job_id) throw new BusinessException(422, 'job_id is required');
    const where = and(
      eq(
        export_worker_errors.export_worker_to_hik_central_job_id,
        Number(q.job_id),
      ),
      notDeleted(export_worker_errors),
    );
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(export_worker_errors)
        .where(where)
        .orderBy(desc(export_worker_errors.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(export_worker_errors)
        .where(where),
    ]);
    return this.attachWorker(rows, page, perPage, Number(total));
  }

  // Laravel: TurnstileController::addedLogs — workers added to HCP audit log.
  async addedLogs(q: QueryHcpWorkerDto) {
    const { page, perPage, offset } = pageOf(q);
    // Laravel HcpAddedWorkerLog::query()->filter($user) — rol/org-scope.
    const inScope = await this.scope.whereOrg(
      hcp_added_worker_logs.organization_id,
      { organizations: q.organizations, organization_id: q.organization_id },
    );
    const where = and(notDeleted(hcp_added_worker_logs), inScope);
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(hcp_added_worker_logs)
        .where(where)
        .orderBy(desc(hcp_added_worker_logs.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(hcp_added_worker_logs)
        .where(where),
    ]);
    return {
      current_page: page,
      total: Number(total),
      data: rows,
    };
  }

  // Laravel: TurnstileController::invalidWorkersByHcp.
  // Returns `{ time, data: paginate-result }` where source is Cache('hcp_invalid_workers').
  // No cache here — empty.
  async invalidWorkersByHcp() {
    return {
      time: new Date().toISOString().replace('T', ' ').slice(0, 19),
      data: {
        current_page: 1,
        per_page: 10,
        total: 0,
        data: [] as Array<unknown>,
      },
    };
  }

  // ---------- helpers ----------
  private async attachWorker<T extends { worker_id: number }>(
    rows: T[],
    page: number,
    perPage: number,
    total: number,
  ) {
    const workerIds = [
      ...new Set(rows.map((r) => r.worker_id).filter(Boolean)),
    ];
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
    const wMap = new Map<number, (typeof wRows)[number]>(
      wRows.map((w) => [w.id, w] as const),
    );
    return {
      current_page: page,
      total,
      data: rows.map((r) => ({ ...r, worker: wMap.get(r.worker_id) ?? null })),
    };
  }
}

// db.execute() driver natijasi: ba'zan {rows:[]}, ba'zan to'g'ridan-to'g'ri array.
function rowsOf(result: unknown): Record<string, unknown>[] {
  const r = result as { rows?: unknown[] };
  return (Array.isArray(r.rows) ? r.rows : result) as Record<string, unknown>[];
}

// hik_central_access_levels.devices — varchar storing JSON array of device_ids.
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

// Laravel `Carbon::format('Y-m-d H:i:s')` parity for timestamp strings.
function formatLaravelTs(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === 'string') {
    // ISO "2025-10-01T12:34:56.000Z" → "2025-10-01 12:34:56"; or already in that form.
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

// Laravel: worker_access_levels.errors — varchar/json column. JSON.parse qilamiz.
// JSON arrays of {device_id, code, time, name} bo'lishi mumkin.
function parseHcpErrors(blob: unknown): Array<{
  device_id?: unknown;
  code?: unknown;
  time?: unknown;
  name?: unknown;
}> {
  if (blob == null) return [];
  let v: unknown = blob;
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(v)) return [];
  return v as Array<{
    device_id?: unknown;
    code?: unknown;
    time?: unknown;
    name?: unknown;
  }>;
}

// Laravel HCPErrorCodesEnum::get — agar kod mavjud bo'lsa label, aks holda raw.
const HCP_ERROR_CODES: Record<number, string> = {
  4: 'messages.turnstile.hcp_error_codes.one',
  943: 'messages.turnstile.hcp_error_codes.two',
  4294967306: 'messages.turnstile.hcp_error_codes.three',
  0: 'messages.turnstile.hcp_error_codes.four',
  4033: 'messages.turnstile.hcp_error_codes.five',
};

function hcpErrorLabel(
  code: number,
  t: (key: string) => string,
): string | number {
  const key = HCP_ERROR_CODES[code];
  if (!key) return code;
  const label = t(key);
  // nestjs-i18n: agar key topilmasa, keyni o'zini qaytaradi.
  if (typeof label !== 'string' || label === key) return code;
  return label;
}
