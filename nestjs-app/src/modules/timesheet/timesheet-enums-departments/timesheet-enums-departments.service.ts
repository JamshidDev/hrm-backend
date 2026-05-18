// TimeSheet enums + departments service.
// Laravel: TimeSheetController::enums(), TimeSheetController::departments().

import { Injectable } from '@nestjs/common';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  time_sheet_worker_departments,
  departments,
  organizations,
} from '@/db/schema';
import { RequestContext } from '@/common/context/request.context';
import {
  TIMESHEET_TYPE_IDS,
  TIMESHEET_TYPE_KEY,
  TIMESHEET_TYPE_LABEL,
  TIMESHEET_TYPE_HOURS,
  TimeSheetTypeItem,
} from '@/modules/timesheet/timesheet-enums-departments/timesheet-enums-departments.types';

export interface DepartmentListItem {
  id: number;
  name: string | null;
  level: number | null;
}

export interface OrganizationListItem {
  id: number;
  name: string | null;
  group: boolean;
}

@Injectable()
export class TimeSheetEnumsDepartmentsService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
  ) {}

  // GET /api/v1/timesheet/enums
  enums(): { timesheet_types: TimeSheetTypeItem[] } {
    const lang = this.ctx.lang;
    return {
      timesheet_types: TIMESHEET_TYPE_IDS.map((id) => {
        const label = this.i18n.t(TIMESHEET_TYPE_LABEL[id], { lang });
        return {
          id,
          name: typeof label === 'string' ? label : '',
          key: TIMESHEET_TYPE_KEY[id],
          hours: TIMESHEET_TYPE_HOURS.has(id),
        };
      }),
    };
  }

  // GET /api/v1/timesheet/departments
  // Laravel: user.worker.time_sheet_departments + time_sheet_organizations (pivot:
  // time_sheet_worker_departments). worker_id → distinct department_id / work_place_id.
  async departments(): Promise<{
    departments: DepartmentListItem[];
    organizations: OrganizationListItem[];
  }> {
    const workerId = this.ctx.worker_id;
    if (!workerId) {
      return { departments: [], organizations: [] };
    }

    const lang = this.ctx.lang;

    const pivotRows = await this.db
      .select({
        department_id: time_sheet_worker_departments.department_id,
        work_place_id: time_sheet_worker_departments.work_place_id,
      })
      .from(time_sheet_worker_departments)
      .where(
        and(
          eq(time_sheet_worker_departments.worker_id, workerId),
          isNull(time_sheet_worker_departments.deleted_at),
        ),
      );

    const deptIds = [
      ...new Set(
        pivotRows
          .map((r) => r.department_id)
          .filter((id): id is number => id !== null),
      ),
    ];
    const orgIds = [
      ...new Set(
        pivotRows
          .map((r) => r.work_place_id)
          .filter((id): id is number => id !== null),
      ),
    ];

    const [deptRows, orgRows] = await Promise.all([
      deptIds.length
        ? this.db
            .select({
              id: departments.id,
              name: departments.name,
              level: departments.level,
            })
            .from(departments)
            .where(
              and(inArray(departments.id, deptIds), isNull(departments.deleted_at)),
            )
        : Promise.resolve([] as DepartmentListItem[]),
      orgIds.length
        ? this.db
            .select({
              id: organizations.id,
              name: organizations.name,
              name_ru: organizations.name_ru,
              name_en: organizations.name_en,
              group: organizations.group,
            })
            .from(organizations)
            .where(
              and(
                inArray(organizations.id, orgIds),
                isNull(organizations.deleted_at),
              ),
            )
        : Promise.resolve(
            [] as Array<{
              id: number;
              name: string | null;
              name_ru: string | null;
              name_en: string | null;
              group: boolean | null;
            }>,
          ),
    ]);

    return {
      departments: deptRows,
      organizations: orgRows.map((o) => ({
        id: o.id,
        name:
          lang === 'ru'
            ? (o.name_ru ?? o.name)
            : lang === 'en'
              ? (o.name_en ?? o.name)
              : o.name,
        group: o.group ?? false,
      })),
    };
  }
}
