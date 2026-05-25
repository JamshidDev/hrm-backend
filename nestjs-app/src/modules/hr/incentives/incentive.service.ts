// Incentive service. Laravel: OrganizationIncentiveController::list().

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  organization_incentives,
  organizations,
  worker_positions,
  workers,
  departments,
  positions as positionsTable,
} from '@/db/schema';
import { buildWorkerSearchCond } from '@/modules/hr/_shared/worker-search.helper';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import { ExcelService } from '@/shared/excel/excel.service';
import { ExportTaskRunner } from '@/shared/export-task/export-task-runner.service';
import {
  getFullPosition,
  getShortPosition,
} from '@/modules/hr/_shared/position-helper';
import {
  IncentiveListResponseDto,
  QueryIncentiveDto,
} from '@/modules/hr/incentives/dto/incentive.dto';

@Injectable()
export class IncentiveService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly scope: OrgScopeService,
    private readonly minio: MinioService,
    private readonly excel: ExcelService,
    private readonly exportRunner: ExportTaskRunner,
  ) {}

  async findAll(filters: QueryIncentiveDto): Promise<IncentiveListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;

    // Laravel scopeSearchByFullName parity.
    const searchCond = buildWorkerSearchCond(filters.search);
    // Laravel OrganizationIncentive::filter — role + organizations + organization_id.
    const inScope = await this.scope.whereOrg(
      organization_incentives.organization_id,
      {
        organizations: filters.organizations,
        organization_id: filters.organization_id,
      },
    );

    const where = and(
      isNull(organization_incentives.deleted_at),
      inScope,
      searchCond,
    );

    const offset = (page - 1) * perPage;

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: organization_incentives.id,
          number: organization_incentives.number,
          reason: organization_incentives.reason,
          by_whom: organization_incentives.by_whom,
          gift: organization_incentives.gift,
          gift_type: organization_incentives.gift_type,
          date: organization_incentives.date,
          org_id: organizations.id,
          org_name: organizations.name,
          org_name_ru: organizations.name_ru,
          org_name_en: organizations.name_en,
          org_group: organizations.group,
          org_full_name: organizations.full_name,
          wp_id: worker_positions.id,
          worker_id: workers.id,
          worker_photo: workers.photo,
          worker_last: workers.last_name,
          worker_first: workers.first_name,
          worker_middle: workers.middle_name,
          dept_name: departments.name,
          dept_level: departments.level,
          pos_name: positionsTable.name,
        })
        .from(organization_incentives)
        .leftJoin(
          organizations,
          and(
            eq(organizations.id, organization_incentives.organization_id),
            isNull(organizations.deleted_at),
          ),
        )
        .leftJoin(
          worker_positions,
          eq(worker_positions.id, organization_incentives.worker_position_id),
        )
        .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
        .leftJoin(
          departments,
          eq(departments.id, worker_positions.department_id),
        )
        .leftJoin(
          positionsTable,
          eq(positionsTable.id, worker_positions.position_id),
        )
        .where(where)
        .orderBy(desc(organization_incentives.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(organization_incentives)
        .leftJoin(workers, eq(workers.id, organization_incentives.worker_id))
        .where(where),
    ]);

    return {
      current_page: page,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => {
          const orgName =
            lang === 'ru'
              ? (r.org_name_ru ?? r.org_name)
              : lang === 'en'
                ? (r.org_name_en ?? r.org_name)
                : r.org_name;
          const orgDto = r.org_id
            ? { id: r.org_id, name: orgName, group: r.org_group ?? false }
            : null;
          return {
            id: r.id,
            organization: orgDto,
            worker_position: r.wp_id
              ? {
                  id: r.wp_id,
                  worker: r.worker_id
                    ? {
                        id: r.worker_id,
                        photo: await this.minio.fileUrl(r.worker_photo),
                        last_name: r.worker_last,
                        first_name: r.worker_first,
                        middle_name: r.worker_middle,
                      }
                    : null,
                  organization: orgDto,
                  post_name: getFullPosition({
                    position_name: r.pos_name,
                    department_name: r.dept_name,
                    department_level: r.dept_level,
                    organization_full_name: r.org_full_name,
                  }),
                  post_short_name: getShortPosition({
                    position_name: r.pos_name,
                    department_name: r.dept_name,
                    department_level: r.dept_level,
                    organization_full_name: r.org_full_name,
                  }),
                }
              : null,
            date: r.date,
            by_whom: r.by_whom,
            gift: r.gift,
            gift_type: r.gift_type,
            reason: r.reason,
            number: r.number,
          };
        }),
      ),
    };
  }

  // GET /api/v1/hr/incentives?download=true — Laravel: UserExportTask +
  // IncentiveExportToExcelJob. Umumiy ExportTaskRunner orqali.
  async exportToTask(filters: QueryIncentiveDto): Promise<void> {
    await this.exportRunner.run({
      type: 28, // ExportTaskEnum.INCENTIVE
      folder: 'incentive',
      build: () => this.buildIncentiveExcel(filters),
    });
  }

  // Incentive ma'lumotlarini Excel buffer'iga aylantiradi (ExportTaskRunner uchun).
  private async buildIncentiveExcel(
    filters: QueryIncentiveDto,
  ): Promise<Buffer> {
    const orgIds = filters.organizations
      ? filters.organizations
          .split(',')
          .map((s) => Number(s))
          .filter((n) => !Number.isNaN(n))
      : [];
    const searchCond = buildWorkerSearchCond(filters.search);

    const where = and(
      isNull(organization_incentives.deleted_at),
      filters.organization_id
        ? eq(organization_incentives.organization_id, filters.organization_id)
        : undefined,
      orgIds.length > 0
        ? inArray(organization_incentives.organization_id, orgIds)
        : undefined,
      searchCond,
    );

    const rows = await this.db
      .select({
        number: organization_incentives.number,
        reason: organization_incentives.reason,
        by_whom: organization_incentives.by_whom,
        gift: organization_incentives.gift,
        gift_type: organization_incentives.gift_type,
        date: organization_incentives.date,
        org_name: organizations.name,
        org_full_name: organizations.full_name,
        dept_name: departments.name,
        dept_level: departments.level,
        pos_name: positionsTable.name,
      })
      .from(organization_incentives)
      .leftJoin(
        organizations,
        and(
          eq(organizations.id, organization_incentives.organization_id),
          isNull(organizations.deleted_at),
        ),
      )
      .leftJoin(
        worker_positions,
        eq(worker_positions.id, organization_incentives.worker_position_id),
      )
      // searchCond (buildWorkerSearchCond) `workers` ustunlariga tayanadi.
      .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
      .leftJoin(departments, eq(departments.id, worker_positions.department_id))
      .leftJoin(
        positionsTable,
        eq(positionsTable.id, worker_positions.position_id),
      )
      .where(where)
      .orderBy(desc(organization_incentives.id));

    const excelRows = rows.map((r) => ({
      organization_name: r.org_name ?? '',
      position: getShortPosition({
        position_name: r.pos_name,
        department_name: r.dept_name,
        department_level: r.dept_level,
        organization_full_name: r.org_full_name,
      }),
      date: r.date ?? '',
      by_whom: r.by_whom ?? '',
      gift: r.gift ?? '',
      gift_type: String(r.gift_type ?? ''),
      reason: r.reason ?? '',
      number: r.number ?? '',
    }));

    return this.excel.build({
      creator: 'HRM',
      sheets: [
        {
          name: 'Incentives',
          columns: [
            { header: 'Tashkilot nomi', key: 'organization_name', width: 34 },
            { header: 'Lavozim', key: 'position', width: 34 },
            { header: 'Sana', key: 'date', width: 14 },
            { header: 'Kim tomonidan', key: 'by_whom', width: 24 },
            { header: 'Mukofot', key: 'gift', width: 22 },
            { header: 'Mukofot turi', key: 'gift_type', width: 14 },
            { header: 'Sababi', key: 'reason', width: 34 },
            { header: 'Raqami', key: 'number', width: 16 },
          ],
          rows: excelRows,
        },
      ],
    });
  }
}
