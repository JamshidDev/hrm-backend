// Work duration service. Laravel: WorkDurationController + TerminalLogController.
// terminal_logs jadvali — har kun ish vaqti / kirim-chiqim.

import { Injectable, Logger } from '@nestjs/common';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { RequestContext } from '@/common/context/request.context';
import { ExcelService } from '@/shared/excel/excel.service';
import { ExportTaskRunner } from '@/shared/export-task/export-task-runner.service';
import {
  buildings,
  departments,
  organizations,
  positions,
  terminal_logs,
  terminals,
  worker_positions,
  workers,
} from '@/db/schema';
import { getShortPosition } from '@/modules/hr/_shared/position-helper';
import { buildWorkerSearchCond } from '@/modules/hr/_shared/worker-search.helper';
import { pageOf } from '@/modules/turnstile/_shared/helpers';
import { MinioService } from '@/shared/minio/minio.service';

export interface WorkDurationQuery {
  page?: number;
  per_page?: number;
  search?: string;
  start?: string;
  end?: string;
  organizations?: string;
  organization_id?: number | string;
}

export interface TerminalLogExportQuery {
  from?: string;
  to?: string;
  search?: string;
  first_time?: string;
  organizations?: string;
  organization_id?: number;
}

@Injectable()
export class WorkDurationService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly scope: OrgScopeService,
    private readonly ctx: RequestContext,
    private readonly i18n: I18nService,
    private readonly excel: ExcelService,
    private readonly exportRunner: ExportTaskRunner,
    private readonly minio: MinioService,
  ) {}

  private readonly logger = new Logger(WorkDurationService.name);

  // Laravel: WorkDurationController::index — paginated terminal_logs join with
  // worker_position, organization, position, terminal. Heavy joins; here we
  // return base rows (frontend can hydrate via separate calls).
  async list(q: WorkDurationQuery) {
    const { page, perPage, offset } = pageOf(q);

    // Laravel: whereHas('worker', whereHas('positions', filter($user))) —
    // xodimning org-scope ichidagi pozitsiyasi bo'lishi shart. Scope bo'sh →
    // hech narsa (Laravel filter bo'sh natija).
    const ids = await this.scope.ids();
    if (!ids.length) {
      return { current_page: page, total: 0, data: [] };
    }
    const orgList = sql.join(
      ids.map((n) => sql`${n}`),
      sql`, `,
    );

    // Laravel filterByOrganizations: childIds AND ?organizations(CSV) AND
    // ?organization_id — barchasi AND (intersect).
    let extraOrg = sql``;
    if (q.organizations) {
      const csv = q.organizations
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n) && n > 0);
      if (csv.length) {
        extraOrg = sql`${extraOrg} AND wp.organization_id IN (${sql.join(
          csv.map((n) => sql`${n}`),
          sql`, `,
        )})`;
      }
    }
    const orgId = Number(q.organization_id);
    if (Number.isFinite(orgId) && orgId > 0) {
      extraOrg = sql`${extraOrg} AND wp.organization_id = ${orgId}`;
    }

    // Laravel: whereHas('worker', whereHas('positions', filter)) — worker MAVJUD
    // & soft-delete emas, VA scope ichida ACTIVE pozitsiyasi bor.
    const conds = [
      notDeleted(terminal_logs),
      sql`EXISTS (
        SELECT 1 FROM workers w
        JOIN worker_positions wp
          ON wp.worker_id = w.id
          AND wp.deleted_at IS NULL
          AND wp.status = 2
          AND wp.organization_id IN (${orgList})${extraOrg}
        WHERE w.id = ${terminal_logs.worker_id}
          AND w.deleted_at IS NULL
      )`,
    ];
    // search — worker fullname (Laravel when(search, worker.searchByFullName)).
    if (q.search) {
      const cond = buildWorkerSearchCond(q.search);
      if (cond) {
        // buildWorkerSearchCond `"workers".col` ishlatadi — subquery FROM ham
        // alias'siz `workers` bo'lishi kerak (aks holda FROM-clause xatosi).
        conds.push(
          sql`EXISTS (SELECT 1 FROM ${workers} WHERE ${eq(workers.id, terminal_logs.worker_id)} AND ${notDeleted(workers)} AND (${cond}))`,
        );
      }
    }
    if (q.start) conds.push(sql`${terminal_logs.event_time} >= ${q.start}`);
    if (q.end) conds.push(sql`${terminal_logs.event_time} <= ${q.end}`);
    const where = and(...conds);
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(terminal_logs)
        .where(where)
        .orderBy(desc(terminal_logs.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(terminal_logs).where(where),
    ]);
    return {
      current_page: page,
      total: Number(total),
      data: await this.mapLogs(rows),
    };
  }

  // Laravel LogResource: { id, worker(minimal), worker_position(short str),
  // terminal(+building), organization(worker_position.organization), event_time,
  // event_type }. Relation'lar batch-load (N+1 oldini olish).
  private async mapLogs(
    rows: Array<{
      id: number;
      worker_id: number | null;
      worker_position_id: number | null;
      terminal_id: number | null;
      event_time: string | null;
      event_type: boolean | null;
    }>,
  ) {
    if (!rows.length) return [];
    const lang = this.ctx.lang;
    const workerIds = [
      ...new Set(rows.map((r) => r.worker_id).filter((x): x is number => !!x)),
    ];
    const wpIds = [
      ...new Set(
        rows.map((r) => r.worker_position_id).filter((x): x is number => !!x),
      ),
    ];
    const terminalIds = [
      ...new Set(
        rows.map((r) => r.terminal_id).filter((x): x is number => !!x),
      ),
    ];

    const workerRows = workerIds.length
      ? await this.db
          .select({
            id: workers.id,
            photo: workers.photo,
            last_name: workers.last_name,
            first_name: workers.first_name,
            middle_name: workers.middle_name,
          })
          .from(workers)
          .where(inArray(workers.id, workerIds))
      : [];
    const workerMap = new Map<number, Record<string, unknown>>();
    await Promise.all(
      workerRows.map(async (w) =>
        workerMap.set(w.id, {
          id: w.id,
          photo: await this.minio.fileUrl(w.photo),
          last_name: w.last_name,
          first_name: w.first_name,
          middle_name: w.middle_name,
        }),
      ),
    );

    const wpRows = wpIds.length
      ? await this.db
          .select({
            id: worker_positions.id,
            position_name: positions.name,
            department_name: departments.name,
            department_level: departments.level,
            org_id: organizations.id,
            org_name: organizations.name,
            org_name_ru: organizations.name_ru,
            org_name_en: organizations.name_en,
            org_group: organizations.group,
            org_full_name: organizations.full_name,
          })
          .from(worker_positions)
          .leftJoin(
            positions,
            and(
              eq(positions.id, worker_positions.position_id),
              notDeleted(positions),
            ),
          )
          .leftJoin(
            departments,
            and(
              eq(departments.id, worker_positions.department_id),
              notDeleted(departments),
            ),
          )
          .leftJoin(
            organizations,
            and(
              eq(organizations.id, worker_positions.organization_id),
              notDeleted(organizations),
            ),
          )
          .where(
            and(inArray(worker_positions.id, wpIds), notDeleted(worker_positions)),
          )
      : [];
    const wpMap = new Map(wpRows.map((w) => [w.id, w]));

    // Laravel `with('terminal:id,name,name_ru,name_en')` building_id'ni
    // tanlamaydi → `terminal.building` relation yuklanolmaydi → DOIM null.
    const terminalRows = terminalIds.length
      ? await this.db
          .select({ id: terminals.id, name: terminals.name })
          .from(terminals)
          .where(and(inArray(terminals.id, terminalIds), notDeleted(terminals)))
      : [];
    const terminalMap = new Map(terminalRows.map((t) => [t.id, t]));

    return rows.map((r) => {
      const wp = r.worker_position_id
        ? wpMap.get(r.worker_position_id)
        : undefined;
      const t = r.terminal_id ? terminalMap.get(r.terminal_id) : undefined;
      const orgName = wp
        ? lang === 'ru'
          ? wp.org_name_ru
          : lang === 'en'
            ? wp.org_name_en
            : wp.org_name
        : null;
      return {
        id: r.id,
        worker: (r.worker_id && workerMap.get(r.worker_id)) || null,
        worker_position: wp
          ? getShortPosition({
              position_name: wp.position_name,
              department_name: wp.department_name,
              department_level: wp.department_level,
              organization_full_name: wp.org_full_name,
            })
          : '',
        terminal: t ? { id: t.id, name: t.name, building: null } : null,
        organization:
          wp && wp.org_id
            ? { id: wp.org_id, name: orgName, group: wp.org_group ?? false }
            : null,
        event_time: r.event_time,
        event_type: r.event_type,
      };
    });
  }

  // Laravel: WorkDurationController::logs — worker's logs for a specific date.
  async logsForWorker(q: { worker_id?: number; date?: string }) {
    if (!q.worker_id || !q.date) return [];
    return this.db
      .select()
      .from(terminal_logs)
      .where(
        and(
          eq(terminal_logs.worker_id, Number(q.worker_id)),
          sql`DATE(${terminal_logs.event_time}) = ${q.date}`,
          notDeleted(terminal_logs),
        ),
      );
  }

  // Laravel: TerminalLogController::index — same shape as WorkDurationController::index.
  terminalLogs(q: WorkDurationQuery) {
    return this.list(q);
  }

  // GET /terminal-logs/export — Laravel TerminalLogController::export →
  // TurnstileExportToExcelJob (LateCommersExport). Kech kelganlar: har xodimning
  // kunlik BIRINCHI kirishi first_time (09:00) dan keyin bo'lганlar.
  // ExportTaskRunner fonda Excel yasaydi (javob faqat success).
  async terminalLogsExport(q: TerminalLogExportQuery): Promise<void> {
    // Scope'ni request kontekstida hisoblaymiz (build fonда ishlaydi).
    const scopeIds = await this.scope.ids();
    const lang = this.ctx.lang;
    await this.exportRunner.run({
      type: 2, // ExportTaskEnum.LATE_COMERS
      folder: 'turnstile',
      build: () => this.buildLateComersExcel(q, scopeIds, lang),
    });
  }

  private async buildLateComersExcel(
    q: TerminalLogExportQuery,
    scopeIds: number[],
    lang: string,
  ): Promise<Buffer> {
    const from = q.from ?? new Date().toISOString().slice(0, 10) + ' 00:00:00';
    const to = q.to ?? new Date().toISOString().slice(0, 10) + ' 23:59:59';
    const firstTime = q.first_time ?? '09:00:00';

    const headers = [
      'worker',
      'worker_position',
      'organization',
      'terminal',
      'event_time',
      'event_type',
    ];
    const inLabel = this.i18n.t('messages.export.event_types.in', { lang });
    const outLabel = this.i18n.t('messages.export.event_types.out', { lang });

    // Scope bo'sh → hech kim ko'rinmaydi (Laravel filter() bo'sh natija).
    if (!scopeIds.length) {
      return this.excel.build({
        creator: 'HRM',
        sheets: [
          {
            name: 'Late comers',
            columns: [
              { header: '#', key: 'n', width: 6 },
              ...headers.map((h) => ({ header: h, key: h, width: 24 })),
            ],
            rows: [],
          },
        ],
      });
    }

    // firstEntries: har worker/kun MIN(event_time) (kirish) scope ichida,
    // keyin event_time::time > first_time (kech kelganlar).
    // OOM-guard: katta oraliqda qatorlar 50K bilan cheklanadi (exceljs xotira).
    const MAX_ROWS = 50_000;
    const searchCond = buildWorkerSearchCond(q.search);
    const rows = (await this.db.execute(sql`
        WITH first_entries AS (
          SELECT tl.worker_id,
                 DATE(tl.event_time) AS day,
                 MIN(tl.event_time) AS first_entry
          FROM terminal_logs tl
          JOIN worker_positions wp ON wp.id = tl.worker_position_id
          WHERE tl.event_type = true
            AND tl.event_time BETWEEN ${from} AND ${to}
            AND tl.deleted_at IS NULL
            AND wp.organization_id IN (${sql.join(
              scopeIds.map((n) => sql`${n}`),
              sql`, `,
            )})
          GROUP BY tl.worker_id, DATE(tl.event_time)
        )
        SELECT tl.id, tl.event_time, tl.event_type,
               tl.worker_id, tl.worker_position_id, tl.terminal_id
        FROM terminal_logs tl
        JOIN first_entries fe
          ON tl.worker_id = fe.worker_id
         AND DATE(tl.event_time) = fe.day
         AND tl.event_time = fe.first_entry
        WHERE tl.event_time::time > ${firstTime}::time
          ${
            searchCond
              ? sql`AND EXISTS (SELECT 1 FROM workers w WHERE w.id = tl.worker_id AND w.deleted_at IS NULL AND (${searchCond}))`
              : sql``
          }
        ORDER BY fe.day, fe.first_entry
        LIMIT ${MAX_ROWS + 1}
      `)) as unknown as Array<{
      id: number;
      event_time: string;
      event_type: boolean;
      worker_id: number;
      worker_position_id: number;
      terminal_id: number;
    }>;

    // OOM-guard: limitdan oshsa kesamiz + ogohlantiramiz (silent truncation EMAS).
    if (rows.length > MAX_ROWS) {
      this.logger.warn(
        `Late-comers export ${MAX_ROWS}+ qator (${from}..${to}) — ${MAX_ROWS} bilan cheklandi. Oraliqni torroq tanlang.`,
      );
      rows.length = MAX_ROWS;
    }

    if (!rows.length) {
      return this.excel.build({
        creator: 'HRM',
        sheets: [
          {
            name: 'Late comers',
            columns: [
              { header: '#', key: 'n', width: 6 },
              ...headers.map((h) => ({ header: h, key: h, width: 24 })),
            ],
            rows: [],
          },
        ],
      });
    }

    // Batch-load: worker, worker_position(+org,dept,position), terminal(+building).
    const wIds = [...new Set(rows.map((r) => r.worker_id))];
    const wpIds = [...new Set(rows.map((r) => r.worker_position_id))];
    const tIds = [...new Set(rows.map((r) => r.terminal_id))];

    const [wRows, wpRows, tRows] = await Promise.all([
      this.db
        .select({
          id: workers.id,
          last_name: workers.last_name,
          first_name: workers.first_name,
          middle_name: workers.middle_name,
        })
        .from(workers)
        .where(inArray(workers.id, wIds.length ? wIds : [-1])),
      this.db
        .select({
          id: worker_positions.id,
          organization_name: organizations.name,
          department_name: departments.name,
          department_level: departments.level,
          position_name: positions.name,
          organization_full_name: organizations.full_name,
        })
        .from(worker_positions)
        .leftJoin(
          organizations,
          eq(organizations.id, worker_positions.organization_id),
        )
        .leftJoin(
          departments,
          eq(departments.id, worker_positions.department_id),
        )
        .leftJoin(positions, eq(positions.id, worker_positions.position_id))
        .where(inArray(worker_positions.id, wpIds.length ? wpIds : [-1])),
      this.db
        .select({
          id: terminals.id,
          name: terminals.name,
          building_name: buildings.name,
        })
        .from(terminals)
        .leftJoin(buildings, eq(buildings.id, terminals.building_id))
        .where(inArray(terminals.id, tIds.length ? tIds : [-1])),
    ]);

    const wMap = new Map(wRows.map((w) => [w.id, w]));
    const wpMap = new Map(wpRows.map((w) => [w.id, w]));
    const tMap = new Map(tRows.map((t) => [t.id, t]));

    const excelRows = rows.map((r, i) => {
      const w = wMap.get(r.worker_id);
      const wp = wpMap.get(r.worker_position_id);
      const t = tMap.get(r.terminal_id);
      const fullName = w
        ? [w.last_name, w.first_name, w.middle_name].filter(Boolean).join(' ')
        : '';
      return {
        n: i + 1,
        worker: fullName,
        worker_position: wp
          ? getShortPosition({
              position_name: wp.position_name,
              department_name: wp.department_name,
              department_level: wp.department_level,
              organization_full_name: wp.organization_full_name,
            })
          : '',
        organization: wp?.organization_name ?? '',
        terminal: t ? `${t.building_name ?? ''}(${t.name ?? ''})` : '',
        event_time: r.event_time,
        event_type: r.event_type ? inLabel : outLabel,
      };
    });

    return this.excel.build({
      creator: 'HRM',
      sheets: [
        {
          name: 'Late comers',
          columns: [
            { header: '#', key: 'n', width: 6 },
            ...headers.map((h) => ({ header: h, key: h, width: 24 })),
          ],
          rows: excelRows,
        },
      ],
    });
  }
}
