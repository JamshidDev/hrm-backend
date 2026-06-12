// Integration main service. Laravel: IntegrationController + StructureController
//   + DepartmentController.departments + FilterController.positions + KPIController.
// Endpointlar: enums, dashboard, structure, leaders, departments, positions,
//              get-departments, get-positions, kpi/report.

import { Injectable } from '@nestjs/common';
import { and, asc, count, eq, inArray, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { MinioService } from '@/shared/minio/minio.service';
import { getFullPosition } from '@/modules/hr/_shared/position-helper';
import {
  departments,
  organizations,
  positions,
  worker_phones,
  worker_positions,
  workers,
} from '@/db/schema';
import {
  pageOf,
  type IntegrationPageQueryDto,
} from '@/modules/integration/_shared/page-query.dto';

// Laravel Helper::leadPositionIds() — [leadIds, leadDeputyIds].
const LEAD_POSITION_IDS = [
  84, 399, 934, 144, 171, 232, 1546, 21, 8, 12, 16, 218, 437, 499, 822, 1503,
];
const LEAD_DEPUTY_POSITION_IDS = [
  427, 506, 513, 514, 515, 516, 6, 12, 85, 86, 87, 93, 425, 426, 9, 13, 27, 83,
  135, 400, 421, 422, 423, 424, 504, 1392, 1506, 575, 94, 236,
];

const POSITION_STATUS_ACTIVE = 2;

@Injectable()
export class IntegrationMainService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly minio: MinioService,
  ) {}

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

  /**
   * GET /integration/structure/:organizationId/leaders — Laravel StructureController::leaders.
   *   leader   = 1-chi (array_position tartibida) lead-lavozim (worker+phones bilan)
   *   deputies = barcha o'rinbosar lavozimlar (workersiz)
   * Resource: WorkerPositionMinResource {id, department, post_name, worker, phones, position_date}.
   */
  async leaders(organizationId: number) {
    const leaderRows = await this.fetchLeadRows(
      organizationId,
      LEAD_POSITION_IDS,
      1,
    );
    const leader = leaderRows[0]
      ? await this.toMinResource(leaderRows[0], true)
      : null;

    const deputyRows = await this.fetchLeadRows(
      organizationId,
      LEAD_DEPUTY_POSITION_IDS,
      null,
    );
    // Laravel deputies: WorkerPositionMinResource `$this->worker`/`->phones` ga
    // murojaat qilganda lazy-load bo'ladi → worker+phones to'liq keladi.
    const deputies = await Promise.all(
      deputyRows.map((r) => this.toMinResource(r, true)),
    );

    return { leader, deputies };
  }

  // Lead/deputy lavozimlarni array_position tartibida (Laravel orderByRaw) oladi.
  private async fetchLeadRows(
    organizationId: number,
    posIds: number[],
    limit: number | null,
  ) {
    const order = sql`array_position(ARRAY[${sql.raw(posIds.join(','))}]::int[], ${worker_positions.position_id})`;
    const q = this.db
      .select({
        id: worker_positions.id,
        position_date: worker_positions.position_date,
        worker_id: worker_positions.worker_id,
        dept_id: departments.id,
        dept_name: departments.name,
        dept_level: departments.level,
        pos_name: positions.name,
        org_full_name: organizations.full_name,
        w_id: workers.id,
        w_photo: workers.photo,
        w_last: workers.last_name,
        w_first: workers.first_name,
        w_middle: workers.middle_name,
      })
      .from(worker_positions)
      .leftJoin(departments, eq(departments.id, worker_positions.department_id))
      .leftJoin(positions, eq(positions.id, worker_positions.position_id))
      .leftJoin(
        organizations,
        eq(organizations.id, worker_positions.organization_id),
      )
      .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
      .where(
        and(
          notDeleted(worker_positions),
          eq(worker_positions.organization_id, organizationId),
          eq(worker_positions.status, POSITION_STATUS_ACTIVE),
          inArray(worker_positions.position_id, posIds),
        ),
      )
      .orderBy(asc(order));
    return limit ? q.limit(limit) : q;
  }

  private async toMinResource(
    r: {
      id: number;
      position_date: string | null;
      worker_id: number | null;
      dept_id: number | null;
      dept_name: string | null;
      dept_level: number | null;
      pos_name: string | null;
      org_full_name: string | null;
      w_id: number | null;
      w_photo: string | null;
      w_last: string | null;
      w_first: string | null;
      w_middle: string | null;
    },
    withWorker: boolean,
  ) {
    let worker: {
      id: number;
      photo: string | null;
      last_name: string | null;
      first_name: string | null;
      middle_name: string | null;
    } | null = null;
    let phones: { id: number; phone: number | null }[] = [];

    if (withWorker && r.w_id) {
      worker = {
        id: r.w_id,
        photo: await this.minio.fileUrl(r.w_photo),
        last_name: r.w_last,
        first_name: r.w_first,
        middle_name: r.w_middle,
      };
      phones = await this.db
        .select({ id: worker_phones.id, phone: worker_phones.phone })
        .from(worker_phones)
        .where(eq(worker_phones.worker_id, r.w_id));
    }

    return {
      id: r.id,
      department: r.dept_id
        ? { id: r.dept_id, name: r.dept_name, level: r.dept_level }
        : null,
      post_name: getFullPosition({
        position_name: r.pos_name,
        department_name: r.dept_name,
        department_level: r.dept_level,
        organization_full_name: r.org_full_name,
      }),
      worker,
      phones,
      position_date: r.position_date,
    };
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

  /**
   * GET /integration/kpi/report — Laravel KPIController::report.
   *   organizations_count = Organization WHERE group=false (count)
   *   workers_count       = WorkerPosition WHERE status=ACTIVE(2) (count)
   */
  async kpiReport() {
    const [[org], [wp]] = await Promise.all([
      this.db
        .select({ total: count() })
        .from(organizations)
        .where(and(notDeleted(organizations), eq(organizations.group, false))),
      this.db
        .select({ total: count() })
        .from(worker_positions)
        .where(
          and(notDeleted(worker_positions), eq(worker_positions.status, 2)),
        ),
    ]);
    return {
      organizations_count: Number(org.total),
      workers_count: Number(wp.total),
    };
  }
}
