// Integration stations service. Laravel: StationController + StationService.
//   GET stations/:code/workers — stantsiya (StationCode) bo'yicha workerlar +
//     director (pos 437) + deputy (pos 420/423/422). WorkerPosition::filter(org-scope).
//   GET stations/:code/workers/:workerId, .../resume, stats.

import { Injectable } from '@nestjs/common';
import { and, asc, count, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import {
  departments,
  organizations,
  positions,
  station_codes,
  worker_positions,
  workers,
} from '@/db/schema';
import type { StationWorkersQueryDto } from '@/modules/integration/stations/dto/station-workers.dto';

const DEPARTMENT_TYPE = 'Modules\\HR\\Models\\Department';
const ORGANIZATION_TYPE = 'Modules\\Structure\\Models\\Organization';
const DIRECTOR_POSITION = 437;
const DEPUTY_POSITIONS = [420, 423, 422];

// Laravel ContractTypeEnum::get(type) → i18n kalit.
const CONTRACT_TYPE_KEYS: Record<number, string> = {
  1: 'messages.contract.employment_contract_indefinite',
  2: 'messages.contract.civil_labor_contract',
  3: 'messages.contract.employment_contract_part_time',
  4: 'messages.contract.employment_contract_remote',
  5: 'messages.contract.employment_contract_seasonal',
  6: 'messages.contract.employment_contract_fixed',
};

interface WpRow {
  id: number;
  uuid: string;
  worker_id: number | null;
  organization_id: number | null;
  department_id: number | null;
  position_id: number | null;
  type: number;
  position_date: string | null;
  group: number | null;
  rank: string | null;
  rate: number | null;
}

@Injectable()
export class IntegrationStationService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly scope: OrgScopeService,
    private readonly ctx: RequestContext,
    private readonly i18n: I18nService,
    private readonly minio: MinioService,
  ) {}

  // StationCode'ni kod bo'yicha topib, model nomini (Department/Organization) oladi.
  private async resolveStation(code: string) {
    const [station] = await this.db
      .select({
        id: station_codes.id,
        model_type: station_codes.model_type,
        model_id: station_codes.model_id,
      })
      .from(station_codes)
      .where(eq(station_codes.code, Number(code)))
      .limit(1);
    if (!station) return null;

    let name = '';
    if (station.model_type === DEPARTMENT_TYPE) {
      const [d] = await this.db
        .select({ name: departments.name })
        .from(departments)
        .where(eq(departments.id, station.model_id))
        .limit(1);
      name = d?.name ?? '';
    } else if (station.model_type === ORGANIZATION_TYPE) {
      const lang = this.ctx.lang;
      const [o] = await this.db
        .select({
          name: organizations.name,
          name_ru: organizations.name_ru,
          name_en: organizations.name_en,
        })
        .from(organizations)
        .where(eq(organizations.id, station.model_id))
        .limit(1);
      name =
        (lang === 'ru' ? o?.name_ru : lang === 'en' ? o?.name_en : o?.name) ??
        o?.name ??
        '';
    }
    return { ...station, name };
  }

  // Laravel QueryHelper::escapeLike — addcslashes($value, '\%_').
  // `\`, `%`, `_` belgilarini backslash bilan escape qiladi (tartib muhim).
  private escapeLike(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');
  }

  // Laravel StationService::index — whereHas('worker', ...) qidiruvi.
  //   whereLike → Postgres ILIKE (case-insensitive) + `::text` cast.
  //   Termlar (bo'shliq bo'yicha) AND'lanadi; har term uchun
  //   (last_name OR first_name OR middle_name) guruhi. Escape uzunligi 14 bo'lsa
  //   qo'shimcha `OR pin ILIKE search` (term guruhlari bilan yagona OR ichida).
  private workerSearchExists(search: string): SQL {
    const escaped = this.escapeLike(search);
    const terms = escaped.trim().split(' ');
    const termGroups = terms.map(
      (term) =>
        sql`(${workers.last_name}::text ilike ${`%${term}%`} OR ${workers.first_name}::text ilike ${`%${term}%`} OR ${workers.middle_name}::text ilike ${`%${term}%`})`,
    );
    let inner = sql.join(termGroups, sql` AND `);
    if (escaped.length === 14) {
      inner = sql`(${inner} OR ${workers.pin}::text ilike ${escaped})`;
    }
    return sql`EXISTS (SELECT 1 FROM ${workers} WHERE ${workers.id} = ${worker_positions.worker_id} AND ${inner} AND ${workers.deleted_at} IS NULL)`;
  }

  // GET /integration/stations/:code/workers — Laravel StationService::index.
  async listWorkers(code: string, q: StationWorkersQueryDto) {
    const page = Math.max(1, Number(q.page) || 1);
    // Laravel: paginate(per_page ?? 50), StationIndexRequest max 200.
    const realPerPage = Math.min(200, Math.max(1, Number(q.per_page) || 50));

    const station = await this.resolveStation(code);
    if (!station) {
      return {
        name: '',
        director: null,
        deputy: [],
        workers: { current_page: page, total: 0, data: [] },
      };
    }

    // WorkerPosition::filter($user) — rol/org-scope.
    const inScope = await this.scope.whereOrg(
      worker_positions.organization_id,
      {
        organizations: (q as { organizations?: string }).organizations,
        organization_id: (q as { organization_id?: number }).organization_id,
      },
    );
    // Stantsiya modeliga qarab: Department → department_id, Organization → organization_id.
    const stationCond =
      station.model_type === DEPARTMENT_TYPE
        ? eq(worker_positions.department_id, station.model_id)
        : eq(worker_positions.organization_id, station.model_id);

    // Laravel: ->when($data['search'], whereHas('worker', ...)). director/deputy
    // ham clone($baseQuery) bo'lgani uchun search hammasiga qo'llanadi.
    const searchCond = q.search ? this.workerSearchExists(q.search) : undefined;

    const baseWhere = and(
      notDeleted(worker_positions),
      inScope,
      stationCond,
      searchCond,
    );

    const select = {
      id: worker_positions.id,
      uuid: worker_positions.uuid,
      worker_id: worker_positions.worker_id,
      organization_id: worker_positions.organization_id,
      department_id: worker_positions.department_id,
      position_id: worker_positions.position_id,
      type: worker_positions.type,
      position_date: worker_positions.position_date,
      group: worker_positions.group,
      rank: worker_positions.rank,
      rate: worker_positions.rate,
    };

    // Director (pos 437), deputy (pos 420/423/422), workers (paginate) — parallel.
    const [directorRows, deputyRows, workerRows, [{ total }]] =
      await Promise.all([
        this.db
          .select(select)
          .from(worker_positions)
          .where(
            and(baseWhere, eq(worker_positions.position_id, DIRECTOR_POSITION)),
          )
          .limit(1),
        this.db
          .select(select)
          .from(worker_positions)
          .where(
            and(
              baseWhere,
              inArray(worker_positions.position_id, DEPUTY_POSITIONS),
            ),
          ),
        this.db
          .select(select)
          .from(worker_positions)
          .where(baseWhere)
          .orderBy(asc(worker_positions.id))
          .limit(realPerPage)
          .offset((page - 1) * realPerPage),
        this.db
          .select({ total: count() })
          .from(worker_positions)
          .where(baseWhere),
      ]);

    const mapped = await this.mapResources([
      ...directorRows,
      ...deputyRows,
      ...workerRows,
    ] as WpRow[]);

    return {
      name: station.name,
      director: directorRows[0]
        ? (mapped.get(directorRows[0].id) ?? null)
        : null,
      deputy: deputyRows.map((r) => mapped.get(r.id)).filter(Boolean),
      workers: {
        current_page: page,
        total: Number(total),
        data: workerRows.map((r) => mapped.get(r.id)).filter(Boolean),
      },
    };
  }

  // WpRow[] → StationWorkerPositionResource map.
  private async mapResources(rows: WpRow[]): Promise<Map<number, unknown>> {
    const lang = this.ctx.lang;
    const workerIds = [
      ...new Set(rows.map((r) => r.worker_id).filter((x): x is number => !!x)),
    ];
    const posIds = [
      ...new Set(
        rows.map((r) => r.position_id).filter((x): x is number => !!x),
      ),
    ];

    const [wRows, pRows] = await Promise.all([
      workerIds.length
        ? this.db
            .select({
              id: workers.id,
              last_name: workers.last_name,
              first_name: workers.first_name,
              middle_name: workers.middle_name,
              photo: workers.photo,
            })
            .from(workers)
            .where(inArray(workers.id, workerIds))
        : Promise.resolve(
            [] as {
              id: number;
              last_name: string | null;
              first_name: string | null;
              middle_name: string | null;
              photo: string | null;
            }[],
          ),
      posIds.length
        ? this.db
            .select({
              id: positions.id,
              name: positions.name,
              name_ru: positions.name_ru,
              name_en: positions.name_en,
            })
            .from(positions)
            .where(inArray(positions.id, posIds))
        : Promise.resolve(
            [] as {
              id: number;
              name: string | null;
              name_ru: string | null;
              name_en: string | null;
            }[],
          ),
    ]);

    const photoUrls = await Promise.all(
      wRows.map((w) => this.minio.fileUrl(w.photo)),
    );
    const wMap = new Map(
      wRows.map((w, i) => [
        w.id,
        {
          id: w.id,
          photo: photoUrls[i],
          last_name: w.last_name,
          first_name: w.first_name,
          middle_name: w.middle_name,
        },
      ]),
    );
    const pMap = new Map(
      pRows.map((p) => [
        p.id,
        {
          id: p.id,
          name:
            (lang === 'ru' ? p.name_ru : lang === 'en' ? p.name_en : p.name) ??
            p.name ??
            '',
        },
      ]),
    );

    const out = new Map<number, unknown>();
    for (const r of rows) {
      if (out.has(r.id)) continue;
      out.set(r.id, {
        id: r.id,
        uuid: r.uuid,
        worker: r.worker_id ? (wMap.get(r.worker_id) ?? null) : null,
        type: {
          id: r.type,
          name: CONTRACT_TYPE_KEYS[r.type]
            ? this.i18n.t(CONTRACT_TYPE_KEYS[r.type])
            : '',
        },
        position: r.position_id ? (pMap.get(r.position_id) ?? null) : null,
        position_date: r.position_date,
        group: r.group,
        rank: r.rank,
        rate: r.rate,
      });
    }
    return out;
  }

  /** GET /integration/stations/:code/workers/:workerId. */
  async showWorker(_code: string, workerId: number) {
    const [row] = await this.db
      .select()
      .from(workers)
      .where(eq(workers.id, workerId))
      .limit(1);
    return row ?? null;
  }

  /** GET /integration/stations/:code/workers/:workerId/resume — stub. */
  // eslint-disable-next-line @typescript-eslint/require-await
  async workerResume(_code: string, _workerId: number) {
    return { url: '', stub: true };
  }

  /** GET /integration/stations/:code/stats — stub (aggregatsiya, keyingi bosqich). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async stats(_code: string) {
    return { workers_count: 0, departments_count: 0, stub: true };
  }
}
