// HR Reports service. Laravel: HR/ReportController (8 endpoint).
//
// QAYDLAR:
// - Laravel permission scope (`organization-admin`, `organization-leader`) hozircha
//   skip qilingan — barcha organizations qaytariladi.

import { Injectable } from '@nestjs/common';
import { and, asc, count, eq, ilike, inArray, isNull, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  department_positions,
  departments,
  organizations,
  positions as positionsTable,
  worker_positions,
  workers,
} from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import { DEPARTMENT_LEVEL_KEYS } from '@/modules/hr/departments/department.mapper';
import { getShortPosition } from '@/modules/hr/_shared/position-helper';
import {
  ReportDepartmentPositionsQueryDto,
  ReportDepartmentsQueryDto,
  ReportOptimizationQueryDto,
  ReportOrderableDto,
  ReportStructureQueryDto,
  ReportWorkerPositionsQueryDto,
} from '@/modules/hr/reports/dto/report.dto';

const POSITION_STATUS_ACTIVE = 2;

export interface StructureNode {
  id: number;
  name: string | null;
  group: boolean;
  rate: number;
  real_rate: number;
  children: StructureNode[];
}

export interface DepartmentReportNode {
  id: number;
  name: string | null;
  level: { id: number; name: string };
  name_ru: string | null;
  name_en: string | null;
  comment: string | null;
  parent_id: number | null;
  rate: number;
  real_rate: number;
  children: DepartmentReportNode[];
}

@Injectable()
export class ReportService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
    private readonly scope: OrgScopeService,
  ) {}

  // GET /api/v1/hr/report/structure
  async structure(filters: ReportStructureQueryDto): Promise<StructureNode[]> {
    const userOrgId = this.ctx.user_or_fail.organization_id;
    if (!userOrgId) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.organization_not_found'),
      );
    }

    // Laravel: organization-admin → barcha, organization-leader → subtree,
    // default → faqat user.organization_id. OrgScopeService.ids() shu bilan
    // bir xil ishlaydi.
    const scopeIds = await this.scope.ids();
    if (scopeIds.length === 0) return [];

    const orgRows = await this.db
      .select({
        id: organizations.id,
        name: organizations.name,
        group: organizations.group,
        parent_id: organizations.parent_id,
      })
      .from(organizations)
      .where(
        and(
          notDeleted(organizations),
          inArray(organizations.id, scopeIds),
          filters.search
            ? ilike(organizations.name, `%${filters.search}%`)
            : undefined,
        ),
      )
      .orderBy(asc(organizations.id));

    // Sum rates per org.
    const wpRates = await this.db
      .select({
        org_id: worker_positions.organization_id,
        rate: sql<number>`COALESCE(SUM(${worker_positions.rate}), 0)`,
      })
      .from(worker_positions)
      .where(
        and(
          eq(worker_positions.status, POSITION_STATUS_ACTIVE),
          notDeleted(worker_positions),
        ),
      )
      .groupBy(worker_positions.organization_id);
    const wpRateMap = new Map<number, number>(
      wpRates
        .filter((r) => r.org_id != null)
        .map((r) => [r.org_id!, Number(r.rate)]),
    );

    const dpRates = await this.db
      .select({
        org_id: department_positions.organization_id,
        rate: sql<number>`COALESCE(SUM(${department_positions.rate}), 0)`,
      })
      .from(department_positions)
      .where(notDeleted(department_positions))
      .groupBy(department_positions.organization_id);
    const dpRateMap = new Map<number, number>(
      dpRates
        .filter((r) => r.org_id != null)
        .map((r) => [r.org_id!, Number(r.rate)]),
    );

    // Build tree (parent_id → children).
    const nodeMap = new Map<number, StructureNode>();
    for (const o of orgRows) {
      nodeMap.set(o.id, {
        id: o.id,
        name: o.name,
        group: o.group ?? false,
        rate: (dpRateMap.get(o.id) ?? 0) / 100,
        real_rate: (wpRateMap.get(o.id) ?? 0) / 100,
        children: [],
      });
    }
    const roots: StructureNode[] = [];
    for (const o of orgRows) {
      const node = nodeMap.get(o.id)!;
      if (o.parent_id == null) {
        roots.push(node);
      } else {
        const parent = nodeMap.get(o.parent_id);
        if (parent) parent.children.push(node);
        else roots.push(node);
      }
    }
    return roots;
  }

  // GET /api/v1/hr/report/departments
  async departments(
    filters: ReportDepartmentsQueryDto,
  ): Promise<DepartmentReportNode[]> {
    const lang = this.ctx.lang;
    const rows = await this.db
      .select({
        id: departments.id,
        name: departments.name,
        name_ru: departments.name_ru,
        name_en: departments.name_en,
        level: departments.level,
        comment: departments.comment,
        parent_id: departments.parent_id,
      })
      .from(departments)
      .where(
        and(
          notDeleted(departments),
          // Laravel where('organization_id', request(...)): yo'q bo'lsa IS NULL.
          filters.organization_id != null
            ? eq(departments.organization_id, filters.organization_id)
            : isNull(departments.organization_id),
          filters.search
            ? ilike(departments.name, `%${filters.search}%`)
            : undefined,
        ),
      )
      .orderBy(asc(departments.id));

    const deptIds = rows.map((r) => r.id);
    const [dpRates, wpRates] = await Promise.all([
      deptIds.length
        ? this.db
            .select({
              dept_id: department_positions.department_id,
              rate: sql<number>`COALESCE(SUM(${department_positions.rate}), 0)`,
            })
            .from(department_positions)
            .where(
              and(
                inArray(department_positions.department_id, deptIds),
                notDeleted(department_positions),
              ),
            )
            .groupBy(department_positions.department_id)
        : Promise.resolve(
            [] as Array<{ dept_id: number | null; rate: number }>,
          ),
      deptIds.length
        ? this.db
            .select({
              dept_id: worker_positions.department_id,
              rate: sql<number>`COALESCE(SUM(${worker_positions.rate}), 0)`,
            })
            .from(worker_positions)
            .where(
              and(
                inArray(worker_positions.department_id, deptIds),
                eq(worker_positions.status, POSITION_STATUS_ACTIVE),
                notDeleted(worker_positions),
              ),
            )
            .groupBy(worker_positions.department_id)
        : Promise.resolve(
            [] as Array<{ dept_id: number | null; rate: number }>,
          ),
    ]);
    const dpMap = new Map<number, number>(
      dpRates
        .filter((r) => r.dept_id != null)
        .map((r) => [r.dept_id!, Number(r.rate)]),
    );
    const wpMap = new Map<number, number>(
      wpRates
        .filter((r) => r.dept_id != null)
        .map((r) => [r.dept_id!, Number(r.rate)]),
    );

    // Build tree by parent_id.
    const nodeMap = new Map<number, DepartmentReportNode>();
    for (const d of rows) {
      const lvKey = DEPARTMENT_LEVEL_KEYS[d.level];
      const lvName = lvKey ? this.i18n.t(lvKey, { lang }) : '';
      nodeMap.set(d.id, {
        id: d.id,
        name: d.name,
        level: {
          id: d.level,
          name: typeof lvName === 'string' ? lvName : '',
        },
        name_ru: d.name_ru,
        name_en: d.name_en,
        comment: d.comment,
        parent_id: d.parent_id,
        rate: (dpMap.get(d.id) ?? 0) / 100,
        real_rate: (wpMap.get(d.id) ?? 0) / 100,
        children: [],
      });
    }
    const roots: DepartmentReportNode[] = [];
    for (const d of rows) {
      const node = nodeMap.get(d.id)!;
      if (d.parent_id == null) {
        roots.push(node);
      } else {
        const parent = nodeMap.get(d.parent_id);
        if (parent) parent.children.push(node);
        else roots.push(node);
      }
    }
    return roots;
  }

  // GET /api/v1/hr/report/department-positions
  async departmentPositions(filters: ReportDepartmentPositionsQueryDto) {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;
    const offset = (page - 1) * perPage;

    const where = and(
      notDeleted(department_positions),
      // Laravel where('organization_id', request(...)): yo'q bo'lsa IS NULL.
      filters.organization_id != null
        ? eq(department_positions.organization_id, filters.organization_id)
        : isNull(department_positions.organization_id),
      filters.department_id
        ? eq(department_positions.department_id, filters.department_id)
        : undefined,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: department_positions.id,
          rate: department_positions.rate,
          status: department_positions.status,
          changed_status: department_positions.changed_status,
          pos_id: positionsTable.id,
          pos_name: positionsTable.name,
          pos_name_ru: positionsTable.name_ru,
          pos_name_en: positionsTable.name_en,
        })
        .from(department_positions)
        .leftJoin(
          positionsTable,
          eq(positionsTable.id, department_positions.position_id),
        )
        // Laravel report: paginate() — orderBy YO'Q (natural order).
        .where(where)
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(department_positions)
        .where(where),
    ]);

    const ids = rows.map((r) => r.id);
    const wpRates = ids.length
      ? await this.db
          .select({
            dp_id: worker_positions.department_position_id,
            rate: sql<number>`COALESCE(SUM(${worker_positions.rate}), 0)`,
          })
          .from(worker_positions)
          .where(
            and(
              inArray(worker_positions.department_position_id, ids),
              // Laravel worker_positions relation: ->where('status', ACTIVE).
              eq(worker_positions.status, POSITION_STATUS_ACTIVE),
              notDeleted(worker_positions),
            ),
          )
          .groupBy(worker_positions.department_position_id)
      : [];
    const wpMap = new Map<number, number>(
      wpRates
        .filter((r) => r.dp_id != null)
        .map((r) => [r.dp_id!, Number(r.rate)]),
    );

    return {
      current_page: page,
      total: Number(total),
      data: rows.map((r) => ({
        id: r.id,
        position: r.pos_id
          ? {
              id: r.pos_id,
              name: this.pickLang(
                r.pos_name,
                r.pos_name_ru,
                r.pos_name_en,
                lang,
              ),
            }
          : null,
        // Laravel DepartmentPosition `rate` accessor: get => $value / 100.
        rate: r.rate / 100,
        real_rate: (wpMap.get(r.id) ?? 0) / 100,
        status: {
          id: r.status,
          name: this.statusName(CONFIRM_STATUS_KEYS, r.status, lang),
        },
        changed_status: {
          id: r.changed_status,
          name: this.statusName(CHANGED_STATUS_KEYS, r.changed_status, lang),
        },
      })),
    };
  }

  // GET /api/v1/hr/report/worker-positions
  async workerPositions(filters: ReportWorkerPositionsQueryDto) {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const _lang = this.ctx.lang;
    void _lang;
    const offset = (page - 1) * perPage;

    const deptIds = filters.departments
      ? filters.departments
          .split(',')
          .map((s) => Number(s))
          .filter((n) => !Number.isNaN(n))
      : [];

    // Laravel: WorkerPosition::filter($user) (rol/org-scope childIds) +
    // ->where('organization_id', request('organization_id')). whereOrg ikkalasini
    // ham qo'llaydi (childIds AND organization_id).
    const inScope = await this.scope.whereOrg(
      worker_positions.organization_id,
      {
        organizations: (filters as { organizations?: string }).organizations,
        organization_id: filters.organization_id,
      },
    );

    const where = and(
      notDeleted(worker_positions),
      eq(worker_positions.status, POSITION_STATUS_ACTIVE),
      inScope,
      // Laravel where('organization_id', request(...)): yo'q bo'lsa IS NULL
      // (whereOrg org_id berilmaganda faqat childIds qo'llaydi).
      filters.organization_id == null
        ? isNull(worker_positions.organization_id)
        : undefined,
      filters.department_id
        ? eq(worker_positions.department_id, filters.department_id)
        : undefined,
      deptIds.length > 0
        ? inArray(worker_positions.department_id, deptIds)
        : undefined,
      filters.department_position_id
        ? eq(
            worker_positions.department_position_id,
            filters.department_position_id,
          )
        : undefined,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: worker_positions.id,
          rate: worker_positions.rate,
          rank: worker_positions.rank,
          group: worker_positions.group,
          position_date: worker_positions.position_date,
          type: worker_positions.type,
          worker_id: workers.id,
          worker_uuid: workers.uuid,
          worker_last: workers.last_name,
          worker_first: workers.first_name,
          worker_middle: workers.middle_name,
          worker_photo: workers.photo,
          dept_name: departments.name,
          dept_level: departments.level,
          pos_name: positionsTable.name,
          org_full_name: organizations.full_name,
        })
        .from(worker_positions)
        .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
        .leftJoin(
          departments,
          eq(departments.id, worker_positions.department_id),
        )
        .leftJoin(
          positionsTable,
          eq(positionsTable.id, worker_positions.position_id),
        )
        .leftJoin(
          organizations,
          and(
            eq(organizations.id, worker_positions.organization_id),
            isNull(organizations.deleted_at),
          ),
        )
        // Laravel report: paginate() — orderBy YO'Q (natural order).
        .where(where)
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(worker_positions).where(where),
    ]);

    return {
      current_page: page,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => ({
          id: r.id,
          worker: r.worker_id
            ? {
                id: r.worker_id,
                uuid: r.worker_uuid,
                last_name: r.worker_last,
                first_name: r.worker_first,
                middle_name: r.worker_middle,
                photo: await this.minio.fileUrl(r.worker_photo),
              }
            : null,
          post_name: getShortPosition({
            position_name: r.pos_name,
            department_name: r.dept_name,
            department_level: r.dept_level,
            organization_full_name: r.org_full_name,
          }),
          // Laravel WorkerPosition `rate` accessor: get => $value / 100.
          rate: r.rate / 100,
          rank: r.rank,
          group: r.group,
          position_date: r.position_date,
          type: {
            id: r.type,
            name: this.statusName(CONTRACT_TYPE_KEYS, r.type, _lang),
          },
        })),
      ),
    };
  }

  // GET /api/v1/hr/report/optimization?department_id=
  async optimization(filters: ReportOptimizationQueryDto) {
    // Group DepartmentPosition by position_id within department, merge duplicates.
    const grouped = await this.db
      .select({
        position_id: department_positions.position_id,
        cnt: count(),
      })
      .from(department_positions)
      .where(eq(department_positions.department_id, filters.department_id))
      .groupBy(department_positions.position_id)
      .having(sql`COUNT(*) > 1`);

    for (const g of grouped) {
      if (g.position_id == null) continue;
      const samePositions = await this.db
        .select({
          id: department_positions.id,
          rate: department_positions.rate,
        })
        .from(department_positions)
        .where(
          and(
            eq(department_positions.department_id, filters.department_id),
            eq(department_positions.position_id, g.position_id),
          ),
        )
        .orderBy(asc(department_positions.id));

      if (samePositions.length === 0) continue;
      const main = samePositions[0];
      const totalRate = samePositions.reduce(
        (sum, p) => sum + Number(p.rate ?? 0),
        0,
      );
      const otherIds = samePositions
        .filter((p) => p.id !== main.id)
        .map((p) => p.id);

      if (otherIds.length > 0) {
        // Update worker_positions to point to main.
        await this.db
          .update(worker_positions)
          .set({ department_position_id: main.id })
          .where(inArray(worker_positions.department_position_id, otherIds));
        // Delete duplicate department_positions.
        await this.db
          .update(department_positions)
          .set({ deleted_at: sql`NOW()` })
          .where(inArray(department_positions.id, otherIds));
      }

      await this.db
        .update(department_positions)
        .set({ rate: totalRate })
        .where(eq(department_positions.id, main.id));
    }
  }

  // POST /api/v1/hr/report/orderable
  async orderable(dto: ReportOrderableDto): Promise<void> {
    for (const row of dto.order) {
      if (dto.type === 'department') {
        await this.db
          .update(departments)
          .set({ sort: row.sort })
          .where(
            and(
              eq(departments.id, row.id),
              dto.organization_id != null
                ? eq(departments.organization_id, dto.organization_id)
                : undefined,
            ),
          );
      } else if (dto.type === 'position') {
        await this.db
          .update(department_positions)
          .set({ sort: row.sort })
          .where(
            and(
              eq(department_positions.id, row.id),
              dto.department_id != null
                ? eq(department_positions.department_id, dto.department_id)
                : undefined,
            ),
          );
      }
    }
  }

  // DELETE /api/v1/hr/report/departments/{id}
  async deleteDepartment(id: number): Promise<void> {
    const [row] = await this.db
      .select({ id: departments.id })
      .from(departments)
      .where(and(eq(departments.id, id), notDeleted(departments)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    await this.db
      .update(departments)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(departments.id, id));
  }

  // DELETE /api/v1/hr/report/department-positions/{id}
  async deletePosition(id: number): Promise<void> {
    const [row] = await this.db
      .select({ id: department_positions.id })
      .from(department_positions)
      .where(
        and(eq(department_positions.id, id), notDeleted(department_positions)),
      )
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    await this.db
      .update(department_positions)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(department_positions.id, id));
  }

  private pickLang(
    uz: string | null,
    ru: string | null,
    en: string | null,
    lang: string,
  ): string | null {
    if (lang === 'ru') return ru ?? uz;
    if (lang === 'en') return en ?? uz;
    return uz;
  }

  // Laravel ConfirmStatusEnum::get / ChangedStatusEnum::get — yo'q bo'lsa "".
  private statusName(
    keys: Record<number, string>,
    value: number | null,
    lang: string,
  ): string {
    if (value == null || !keys[value]) return '';
    return this.i18n.t(keys[value], { lang });
  }
}

const CONFIRM_STATUS_KEYS: Record<number, string> = {
  1: 'messages.economist.changed.confirm_statuses.new',
  2: 'messages.economist.changed.confirm_statuses.process',
  3: 'messages.economist.changed.confirm_statuses.done',
  4: 'messages.economist.changed.confirm_statuses.reject',
};
const CHANGED_STATUS_KEYS: Record<number, string> = {
  1: 'messages.economist.changed.change_statuses.created',
  2: 'messages.economist.changed.change_statuses.updated',
  3: 'messages.economist.changed.change_statuses.deleted',
};
// Laravel ContractTypeEnum (HR/Transformers/Report/WorkerPositionResource).
const CONTRACT_TYPE_KEYS: Record<number, string> = {
  1: 'messages.contract.employment_contract_indefinite',
  2: 'messages.contract.civil_labor_contract',
  3: 'messages.contract.employment_contract_part_time',
  4: 'messages.contract.employment_contract_remote',
  5: 'messages.contract.employment_contract_seasonal',
  6: 'messages.contract.employment_contract_fixed',
};
