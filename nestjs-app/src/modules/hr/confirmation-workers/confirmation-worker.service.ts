// ConfirmationWorker service. ConfirmationWorkerLevelEnum 1..2.

import { Injectable } from '@nestjs/common';
import { and, asc, count, eq, inArray, isNull, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { confirmation_workers, organizations, workers } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { buildWorkerSearchCond } from '@/modules/hr/_shared/worker-search.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import {
  ConfirmationWorkerListResponseDto,
  CreateConfirmationWorkerDto,
  QueryConfirmationWorkerDto,
  UpdateConfirmationWorkerDto,
} from '@/modules/hr/confirmation-workers/dto/confirmation-worker.dto';

const LEVEL_KEYS: Record<number, string> = {
  1: 'messages.confirmation_worker.level.director',
  2: 'messages.confirmation_worker.level.confirmatory',
};

@Injectable()
export class ConfirmationWorkerService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
  ) {}

  async findAll(
    filters: QueryConfirmationWorkerDto,
  ): Promise<ConfirmationWorkerListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;
    const orgId = this.ctx.user?.organization_id ?? 0;

    // Laravel scopeSearchByFullName parity.
    const searchCond = buildWorkerSearchCond(filters.search);

    // `organizations` — vergul bilan ajratilgan organization id lar.
    const orgIds = filters.organizations
      ? filters.organizations
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isFinite(n) && n > 0)
      : [];

    const where = and(
      isNull(confirmation_workers.deleted_at),
      // `organizations` berilsa — shu organizationlar, aks holda — joriy user org.
      orgIds.length > 0
        ? inArray(confirmation_workers.organization_id, orgIds)
        : eq(confirmation_workers.organization_id, orgId),
      // `created` — yaratilgan sana bo'yicha filter (YYYY-MM-DD).
      filters.created
        ? sql`DATE(${confirmation_workers.created_at}) = ${filters.created}`
        : undefined,
      searchCond,
    );

    const offset = (page - 1) * perPage;

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: confirmation_workers.id,
          level: confirmation_workers.level,
          position: confirmation_workers.position,
          worker_id: workers.id,
          worker_photo: workers.photo,
          worker_last: workers.last_name,
          worker_first: workers.first_name,
          worker_middle: workers.middle_name,
          org_id: organizations.id,
          org_name: organizations.name,
          org_name_ru: organizations.name_ru,
          org_name_en: organizations.name_en,
          org_group: organizations.group,
        })
        .from(confirmation_workers)
        .leftJoin(workers, eq(workers.id, confirmation_workers.worker_id))
        .leftJoin(
          organizations,
          and(
            eq(organizations.id, confirmation_workers.organization_id),
            isNull(organizations.deleted_at),
          ),
        )
        .where(where)
        .orderBy(asc(confirmation_workers.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(confirmation_workers)
        .leftJoin(workers, eq(workers.id, confirmation_workers.worker_id))
        .where(where),
    ]);

    return {
      current_page: page,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => {
          const levelKey = LEVEL_KEYS[r.level];
          const levelLabel = levelKey ? this.i18n.t(levelKey, { lang }) : '';
          return {
            id: r.id,
            worker: r.worker_id
              ? {
                  id: r.worker_id,
                  photo: await this.minio.fileUrl(r.worker_photo),
                  last_name: r.worker_last,
                  first_name: r.worker_first,
                  middle_name: r.worker_middle,
                }
              : null,
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
            level: {
              id: r.level,
              name: typeof levelLabel === 'string' ? levelLabel : '',
            },
            position: r.position,
          };
        }),
      ),
    };
  }

  // POST /api/v1/hr/confirmation-workers
  async create(dto: CreateConfirmationWorkerDto): Promise<void> {
    const orgId = this.ctx.user_or_fail.organization_id;
    if (!orgId) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.organization_not_found'),
      );
    }
    await this.db.insert(confirmation_workers).values({
      organization_id: orgId,
      worker_id: dto.worker_id,
      position: dto.position,
      level: dto.level,
    });
  }

  // PUT /api/v1/hr/confirmation-workers/{id}
  async update(id: number, dto: UpdateConfirmationWorkerDto): Promise<void> {
    const [row] = await this.db
      .select({ id: confirmation_workers.id })
      .from(confirmation_workers)
      .where(
        and(eq(confirmation_workers.id, id), notDeleted(confirmation_workers)),
      )
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    await this.db
      .update(confirmation_workers)
      .set({
        worker_id: dto.worker_id,
        position: dto.position,
        level: dto.level,
        updated_at: sql`NOW()`,
      })
      .where(eq(confirmation_workers.id, id));
  }

  // DELETE /api/v1/hr/confirmation-workers/{id}
  async remove(id: number): Promise<void> {
    const [row] = await this.db
      .select({ id: confirmation_workers.id })
      .from(confirmation_workers)
      .where(
        and(eq(confirmation_workers.id, id), notDeleted(confirmation_workers)),
      )
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    await this.db
      .update(confirmation_workers)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(confirmation_workers.id, id));
  }
}
