// BusinessTrip service. Laravel: WorkerBusinessTripController::index().

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, isNull } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  worker_business_trips,
  organizations,
  worker_positions,
  workers,
  departments,
  positions as positionsTable,
} from '@/db/schema';
import { RequestContext } from '@/common/context/request.context';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { MinioService } from '@/shared/minio/minio.service';
import {
  getFullPosition,
  getShortPosition,
} from '@/modules/hr/_shared/position-helper';
import { COMMAND_TYPES } from '@/modules/structure/enums-endpoint/enums.constants';
import {
  BusinessTripListResponseDto,
  QueryBusinessTripDto,
} from '@/modules/hr/business-trips/dto/business-trip.dto';

const COMMAND_TYPE_KEYS: Record<number, string> = Object.fromEntries(
  COMMAND_TYPES.map((c) => [c.id, c.key]),
);

@Injectable()
export class BusinessTripService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
    private readonly scope: OrgScopeService,
  ) {}

  async findAll(
    filters: QueryBusinessTripDto,
  ): Promise<BusinessTripListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;

    // Laravel WorkerBusinessTrip::filter — role + organizations + organization_id.
    const inScope = await this.scope.whereOrg(
      worker_business_trips.organization_id,
      {
        organizations: filters.organizations,
        organization_id: filters.organization_id,
      },
    );

    const where = and(isNull(worker_business_trips.deleted_at), inScope);

    const offset = (page - 1) * perPage;

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: worker_business_trips.id,
          type: worker_business_trips.type,
          from: worker_business_trips.from,
          to: worker_business_trips.to,
          to_organization: worker_business_trips.to_organization,
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
        .from(worker_business_trips)
        .leftJoin(
          worker_positions,
          eq(worker_positions.id, worker_business_trips.worker_position_id),
        )
        .leftJoin(
          organizations,
          and(
            eq(organizations.id, worker_positions.organization_id),
            isNull(organizations.deleted_at),
          ),
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
        .orderBy(desc(worker_business_trips.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(worker_business_trips)
        .where(where),
    ]);

    return {
      current_page: page,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => {
          const typeKey = COMMAND_TYPE_KEYS[r.type];
          const typeLabel = typeKey ? this.i18n.t(typeKey, { lang }) : '';
          // Silencer: lang unused but ctx requires it (already used in label).
          void lang;
          return {
            id: r.id,
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
            type: {
              id: r.type,
              name: typeof typeLabel === 'string' ? typeLabel : '',
            },
            from: r.from,
            to: r.to,
            to_organization: r.to_organization,
          };
        }),
      ),
    };
  }
}
