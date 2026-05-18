// Disciplinary service. Laravel: OrganizationDisciplinaryController.

import { Injectable } from '@nestjs/common';
import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
} from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  organization_disciplinaries,
  organizations,
  worker_positions,
  workers,
  departments,
  positions as positionsTable,
} from '@/db/schema';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import {
  getFullPosition,
  getShortPosition,
} from '@/modules/hr/_shared/position-helper';
import {
  DisciplinaryListResponseDto,
  QueryDisciplinaryDto,
} from '@/modules/hr/disciplinaries/dto/disciplinary.dto';

@Injectable()
export class DisciplinaryService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
  ) {}

  async findAll(
    filters: QueryDisciplinaryDto,
  ): Promise<DisciplinaryListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;

    const orgIds = filters.organizations
      ? filters.organizations.split(',').map((s) => Number(s)).filter((n) => !Number.isNaN(n))
      : [];

    const searchCond = filters.search
      ? or(
          ilike(workers.last_name, `%${filters.search}%`),
          ilike(workers.first_name, `%${filters.search}%`),
          ilike(workers.middle_name, `%${filters.search}%`),
        )
      : undefined;

    const where = and(
      isNull(organization_disciplinaries.deleted_at),
      filters.organization_id
        ? eq(organization_disciplinaries.organization_id, filters.organization_id)
        : undefined,
      orgIds.length > 0
        ? inArray(organization_disciplinaries.organization_id, orgIds)
        : undefined,
      searchCond,
    );

    const offset = (page - 1) * perPage;

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: organization_disciplinaries.id,
          number: organization_disciplinaries.number,
          reason: organization_disciplinaries.reason,
          fine: organization_disciplinaries.fine,
          fine_type: organization_disciplinaries.fine_type,
          date: organization_disciplinaries.date,
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
        .from(organization_disciplinaries)
        .leftJoin(
          organizations,
          eq(organizations.id, organization_disciplinaries.organization_id),
        )
        .leftJoin(
          worker_positions,
          eq(worker_positions.id, organization_disciplinaries.worker_position_id),
        )
        .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
        .leftJoin(departments, eq(departments.id, worker_positions.department_id))
        .leftJoin(
          positionsTable,
          eq(positionsTable.id, worker_positions.position_id),
        )
        .where(where)
        .orderBy(desc(organization_disciplinaries.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(organization_disciplinaries)
        .leftJoin(workers, eq(workers.id, organization_disciplinaries.worker_id))
        .where(where),
    ]);

    return {
      current_page: page,
      per_page: perPage,
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
            fine: r.fine,
            fine_type: r.fine_type,
            reason: r.reason,
            number: r.number,
          };
        }),
      ),
    };
  }
}
