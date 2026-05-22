// Leader service. Laravel: OrganizationLeaderController::index().

import { Injectable } from '@nestjs/common';
import { and, asc, count, eq, inArray, isNull, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  organization_leaders,
  organizations,
  worker_positions,
  workers,
  departments,
  positions as positionsTable,
} from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { buildWorkerSearchCond } from '@/modules/hr/_shared/worker-search.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import {
  getFullPosition,
  getShortPosition,
} from '@/modules/hr/_shared/position-helper';
import {
  CreateLeaderDto,
  LeaderListResponseDto,
  QueryLeaderDto,
  UpdateLeaderDto,
} from '@/modules/hr/leaders/dto/leader.dto';

@Injectable()
export class LeaderService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
    private readonly i18n: I18nService,
  ) {}

  async findAll(filters: QueryLeaderDto): Promise<LeaderListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;

    const orgIds = filters.organizations
      ? filters.organizations
          .split(',')
          .map((s) => Number(s))
          .filter((n) => !Number.isNaN(n))
      : [];

    // Laravel leaders endpointida search yo'q — bizda hodim F.I.SH bo'yicha
    // qidiruv qo'shamiz (worker_position.worker bo'yicha).
    const searchCond = buildWorkerSearchCond(filters.search);

    const where = and(
      isNull(organization_leaders.deleted_at),
      filters.organization_id
        ? eq(organization_leaders.organization_id, filters.organization_id)
        : undefined,
      orgIds.length > 0
        ? inArray(organization_leaders.organization_id, orgIds)
        : undefined,
      searchCond,
    );

    const offset = (page - 1) * perPage;

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: organization_leaders.id,
          phones: organization_leaders.phones,
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
          pos_name: positionsTable.name,
        })
        .from(organization_leaders)
        .leftJoin(
          organizations,
          eq(organizations.id, organization_leaders.organization_id),
        )
        .leftJoin(
          worker_positions,
          eq(worker_positions.id, organization_leaders.worker_position_id),
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
        .orderBy(asc(organization_leaders.id))
        .limit(perPage)
        .offset(offset),
      // count query'da ham worker join — `where` worker ustunlariga tayanadi.
      this.db
        .select({ total: count() })
        .from(organization_leaders)
        .leftJoin(
          worker_positions,
          eq(worker_positions.id, organization_leaders.worker_position_id),
        )
        .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
        .where(where),
    ]);

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => ({
          id: r.id,
          organization: r.org_id
            ? {
                id: r.org_id,
                name:
                  lang === 'ru'
                    ? (r.org_name_ru ?? r.org_name)
                    : lang === 'en'
                      ? (r.org_name_en ?? r.org_name)
                      : r.org_name,
                group: r.org_group ?? false,
              }
            : null,
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
                // Laravel OrganizationLeaderService `department:id,name` —
                // `level` ni yuklamaydi → getShort/FullPosition har doim bo'lim
                // nomini qo'shadi (department_level=null bilan parity).
                post_name: getFullPosition({
                  position_name: r.pos_name,
                  department_name: r.dept_name,
                  department_level: null,
                  organization_full_name: r.org_full_name,
                }),
                post_short_name: getShortPosition({
                  position_name: r.pos_name,
                  department_name: r.dept_name,
                  department_level: null,
                  organization_full_name: r.org_full_name,
                }),
              }
            : null,
          phone: r.phones,
        })),
      ),
    };
  }

  // POST /api/v1/hr/leaders
  async create(dto: CreateLeaderDto): Promise<void> {
    const orgId = this.ctx.user_or_fail.organization_id;
    if (!orgId) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.organization_not_found'),
      );
    }

    const [existing] = await this.db
      .select({ id: organization_leaders.id })
      .from(organization_leaders)
      .where(
        and(
          eq(organization_leaders.organization_id, orgId),
          eq(organization_leaders.worker_position_id, dto.worker_position_id),
          notDeleted(organization_leaders),
        ),
      )
      .limit(1);
    if (existing) {
      throw new BusinessException(409, this.i18n.t('messages.already_exists'));
    }

    await this.db.insert(organization_leaders).values({
      organization_id: orgId,
      worker_position_id: dto.worker_position_id,
      phones: dto.phones ?? [],
    });
  }

  // PUT /api/v1/hr/leaders/{id}
  async update(id: number, dto: UpdateLeaderDto): Promise<void> {
    const [row] = await this.db
      .select({ id: organization_leaders.id })
      .from(organization_leaders)
      .where(
        and(eq(organization_leaders.id, id), notDeleted(organization_leaders)),
      )
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    await this.db
      .update(organization_leaders)
      .set({
        phones: dto.phones ?? [],
        updated_at: sql`NOW()`,
      })
      .where(eq(organization_leaders.id, id));
  }

  // DELETE /api/v1/hr/leaders/{id}
  async remove(id: number): Promise<void> {
    const [row] = await this.db
      .select({ id: organization_leaders.id })
      .from(organization_leaders)
      .where(
        and(eq(organization_leaders.id, id), notDeleted(organization_leaders)),
      )
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    await this.db
      .update(organization_leaders)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(organization_leaders.id, id));
  }
}
