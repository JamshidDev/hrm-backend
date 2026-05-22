// Integration main service. Laravel: IntegrationController + StructureController
//   + DepartmentController.departments + FilterController.positions + KPIController.
// Endpointlar: enums, dashboard, structure, leaders, departments, positions,
//              get-departments, get-positions, kpi/report.

import { Injectable } from '@nestjs/common';
import { count } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { departments, organizations, positions, workers } from '@/db/schema';
import {
  pageOf,
  type IntegrationPageQueryDto,
} from '@/modules/integration/_shared/page-query.dto';

@Injectable()
export class IntegrationMainService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  /** GET /integration/enums — frontend dropdownlar. */
  enums() {
    return {
      genders: [
        { id: 1, name: 'Erkak' },
        { id: 2, name: 'Ayol' },
      ],
      contract_types: [
        { id: 1, name: 'Doimiy' },
        { id: 2, name: 'Vaqtinchalik' },
      ],
    };
  }

  /** GET /integration/dashboard — counts. */
  async dashboard() {
    const [workerStat, deptStat, orgStat] = await Promise.all([
      this.db
        .select({ total: count() })
        .from(workers)
        .where(notDeleted(workers)),
      this.db
        .select({ total: count() })
        .from(departments)
        .where(notDeleted(departments)),
      this.db
        .select({ total: count() })
        .from(organizations)
        .where(notDeleted(organizations)),
    ]);
    return {
      workers_count: Number(workerStat[0].total),
      departments_count: Number(deptStat[0].total),
      organizations_count: Number(orgStat[0].total),
    };
  }

  /** GET /integration/structure — organizations paginated. */
  async structure(q: IntegrationPageQueryDto) {
    const { page, perPage, offset } = pageOf(q);
    const where = notDeleted(organizations);
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(organizations)
        .where(where)
        .orderBy(organizations.id)
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(organizations).where(where),
    ]);
    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows,
    };
  }

  /** GET /integration/structure/:organizationId/leaders — stub. */
  // eslint-disable-next-line @typescript-eslint/require-await
  async leaders(_organizationId: number) {
    return [];
  }

  /** GET /integration/departments — paginated. */
  async listDepartments(q: IntegrationPageQueryDto) {
    const { page, perPage, offset } = pageOf(q);
    const where = notDeleted(departments);
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(departments)
        .where(where)
        .orderBy(departments.id)
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(departments).where(where),
    ]);
    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows,
    };
  }

  /** GET /integration/positions — paginated. */
  async listPositions(q: IntegrationPageQueryDto) {
    const { page, perPage, offset } = pageOf(q);
    const where = notDeleted(positions);
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(positions)
        .where(where)
        .orderBy(positions.id)
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(positions).where(where),
    ]);
    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows,
    };
  }

  /** GET /integration/get-departments — brief (id, name). */
  async getDepartmentsAll() {
    return this.db
      .select({ id: departments.id, name: departments.name })
      .from(departments)
      .where(notDeleted(departments));
  }

  /** GET /integration/get-positions — paginated. */
  async getPositions(q: IntegrationPageQueryDto) {
    const { page, perPage, offset } = pageOf(q);
    const where = notDeleted(positions);
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(positions)
        .where(where)
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(positions).where(where),
    ]);
    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows,
    };
  }

  /** GET /integration/kpi/report — stub (Laravel: complex KPI). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async kpiReport(_q: IntegrationPageQueryDto) {
    return { stub: true, data: [] };
  }
}
