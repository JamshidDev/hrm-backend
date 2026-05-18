// Med service. Laravel: HR/MedController + MedService.
// Endpoints: index/edit/store/update/destroy.

import { Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  sql,
} from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  departments,
  meds,
  organizations,
  positions as positionsTable,
  vacations,
  worker_positions,
  workers,
} from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import { getShortPosition } from '@/modules/hr/_shared/position-helper';
import { MED_STATUS_LABELS } from '@/modules/hr/meds/med.types';
import {
  CreateMedDto,
  QueryMedDto,
  UpdateMedDto,
} from '@/modules/hr/meds/dto/med.dto';

@Injectable()
export class MedService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
  ) {}

  // GET /api/v1/hr/worker-meds
  async findAll(filters: QueryMedDto) {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;
    const offset = (page - 1) * perPage;

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
      notDeleted(meds),
      filters.organization_id
        ? eq(meds.organization_id, filters.organization_id)
        : undefined,
      orgIds.length > 0 ? inArray(meds.organization_id, orgIds) : undefined,
      searchCond,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: meds.id,
          status: meds.status,
          from: meds.from,
          to: meds.to,
          file: meds.file,
          comment: meds.comment,
          current: meds.current,
          worker_position_id: meds.worker_position_id,
          worker_id: workers.id,
          worker_last: workers.last_name,
          worker_first: workers.first_name,
          worker_middle: workers.middle_name,
          worker_photo: workers.photo,
          org_id: organizations.id,
          org_name: organizations.name,
          org_name_ru: organizations.name_ru,
          org_name_en: organizations.name_en,
          org_group: organizations.group,
          org_full_name: organizations.full_name,
          dept_name: departments.name,
          dept_level: departments.level,
          pos_name: positionsTable.name,
        })
        .from(meds)
        .leftJoin(workers, eq(workers.id, meds.worker_id))
        .leftJoin(organizations, eq(organizations.id, meds.organization_id))
        .leftJoin(
          worker_positions,
          eq(worker_positions.id, meds.worker_position_id),
        )
        .leftJoin(departments, eq(departments.id, worker_positions.department_id))
        .leftJoin(
          positionsTable,
          eq(positionsTable.id, worker_positions.position_id),
        )
        .where(where)
        .orderBy(asc(meds.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(meds)
        .leftJoin(workers, eq(workers.id, meds.worker_id))
        .where(where),
    ]);

    // Batch-load current vacation per worker_id.
    const workerIds = [
      ...new Set(
        rows.map((r) => r.worker_id).filter((id): id is number => id != null),
      ),
    ];
    const vacRows = workerIds.length
      ? await this.db
          .select({
            worker_id: vacations.worker_id,
            to: vacations.to,
          })
          .from(vacations)
          .where(
            and(
              inArray(vacations.worker_id, workerIds),
              notDeleted(vacations),
              sql`${vacations.from} <= CURRENT_DATE`,
              sql`${vacations.to} >= CURRENT_DATE`,
            ),
          )
      : [];
    const vacMap = new Map<number, string | null>();
    for (const v of vacRows) {
      if (v.worker_id == null) continue;
      vacMap.set(v.worker_id, v.to);
    }

    const today = new Date();
    const todayMs = today.getTime();

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => {
          const toMs = r.to ? new Date(r.to).getTime() : todayMs;
          const diffDays = Math.floor((toMs - todayMs) / (1000 * 60 * 60 * 24));
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
            position: getShortPosition({
              position_name: r.pos_name,
              department_name: r.dept_name,
              department_level: r.dept_level,
              organization_full_name: r.org_full_name,
            }),
            status: {
              id: r.status,
              name: this.tr(MED_STATUS_LABELS[r.status], lang),
            },
            from: r.from,
            to: r.to,
            days: diffDays,
            file: await this.minio.fileUrl(r.file),
            comment: r.comment,
            current: r.current,
            vacation: vacMap.get(r.worker_id!) ?? null,
          };
        }),
      ),
    };
  }

  // GET /api/v1/hr/worker-meds/{id}
  async findOne(id: number) {
    const [row] = await this.db
      .select()
      .from(meds)
      .where(and(eq(meds.id, id), notDeleted(meds)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    const lang = this.ctx.lang;

    // Either worker_position or worker is loaded (Laravel branch).
    let workerPositionBlock: unknown = null;
    let workerBlock: unknown = null;
    if (row.worker_position_id) {
      const [wp] = await this.db
        .select({
          id: worker_positions.id,
          type: worker_positions.type,
          worker_id: worker_positions.worker_id,
          dept_id: departments.id,
          dept_name: departments.name,
          dept_level: departments.level,
          pos_id: positionsTable.id,
          pos_name: positionsTable.name,
          pos_name_ru: positionsTable.name_ru,
          pos_name_en: positionsTable.name_en,
          org_id: organizations.id,
          org_name: organizations.name,
          org_name_ru: organizations.name_ru,
          org_name_en: organizations.name_en,
          org_group: organizations.group,
          org_full_name: organizations.full_name,
          worker_last: workers.last_name,
          worker_first: workers.first_name,
          worker_middle: workers.middle_name,
          worker_photo: workers.photo,
        })
        .from(worker_positions)
        .leftJoin(departments, eq(departments.id, worker_positions.department_id))
        .leftJoin(
          positionsTable,
          eq(positionsTable.id, worker_positions.position_id),
        )
        .leftJoin(
          organizations,
          eq(organizations.id, worker_positions.organization_id),
        )
        .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
        .where(eq(worker_positions.id, row.worker_position_id))
        .limit(1);
      if (wp) {
        workerPositionBlock = {
          id: wp.id,
          type: wp.type,
          worker: wp.worker_id
            ? {
                id: wp.worker_id,
                last_name: wp.worker_last,
                first_name: wp.worker_first,
                middle_name: wp.worker_middle,
                photo: await this.minio.fileUrl(wp.worker_photo),
              }
            : null,
          department: wp.dept_id
            ? { id: wp.dept_id, name: wp.dept_name, level: wp.dept_level }
            : null,
          position: wp.pos_id
            ? {
                id: wp.pos_id,
                name:
                  lang === 'ru'
                    ? (wp.pos_name_ru ?? wp.pos_name)
                    : lang === 'en'
                      ? (wp.pos_name_en ?? wp.pos_name)
                      : wp.pos_name,
              }
            : null,
          organization: wp.org_id
            ? {
                id: wp.org_id,
                name:
                  lang === 'ru'
                    ? (wp.org_name_ru ?? wp.org_name)
                    : lang === 'en'
                      ? (wp.org_name_en ?? wp.org_name)
                      : wp.org_name,
                group: wp.org_group ?? false,
                full_name: wp.org_full_name,
              }
            : null,
        };
      }
    } else {
      const [w] = await this.db
        .select({
          id: workers.id,
          uuid: workers.uuid,
          last_name: workers.last_name,
          first_name: workers.first_name,
          middle_name: workers.middle_name,
          birthday: workers.birthday,
          photo: workers.photo,
        })
        .from(workers)
        .where(eq(workers.id, row.worker_id))
        .limit(1);
      if (w) {
        workerBlock = {
          id: w.id,
          uuid: w.uuid,
          photo: await this.minio.fileUrl(w.photo),
          last_name: w.last_name,
          first_name: w.first_name,
          middle_name: w.middle_name,
          birthday: w.birthday,
        };
      }
    }

    const [org] = row.organization_id
      ? await this.db
          .select({
            id: organizations.id,
            name: organizations.name,
            name_ru: organizations.name_ru,
            name_en: organizations.name_en,
            group: organizations.group,
          })
          .from(organizations)
          .where(eq(organizations.id, row.organization_id))
          .limit(1)
      : [null];

    return {
      id: row.id,
      worker: workerBlock,
      worker_position: workerPositionBlock,
      organization: org
        ? {
            id: org.id,
            name:
              lang === 'ru'
                ? (org.name_ru ?? org.name)
                : lang === 'en'
                  ? (org.name_en ?? org.name)
                  : org.name,
            group: org.group ?? false,
          }
        : null,
      status: {
        id: row.status,
        name: this.tr(MED_STATUS_LABELS[row.status], lang),
      },
      from: row.from,
      to: row.to,
      file: await this.minio.fileUrl(row.file),
      comment: row.comment,
      current: row.current,
    };
  }

  // POST /api/v1/hr/worker-meds — store.
  async create(dto: CreateMedDto): Promise<void> {
    const [wp] = await this.db
      .select({ id: worker_positions.id, worker_id: worker_positions.worker_id })
      .from(worker_positions)
      .where(eq(worker_positions.id, dto.worker_position_id))
      .limit(1);
    if (!wp || !wp.worker_id) {
      throw new BusinessException(
        404,
        this.i18n.t('messages.worker_position_not_found'),
      );
    }

    const status = this.parseStatus(dto.status);

    // Unset other current meds.
    await this.db
      .update(meds)
      .set({ current: false })
      .where(eq(meds.worker_id, wp.worker_id));

    const userId = this.ctx.user_or_fail.id;
    const organizationId = this.ctx.user_or_fail.organization_id;

    await this.db.insert(meds).values({
      user_id: userId,
      worker_id: wp.worker_id,
      worker_position_id: wp.id,
      organization_id: organizationId,
      status: status ? 1 : 2,
      from: dto.from,
      to: dto.to ?? null,
      file: dto.file ?? null,
      comment: dto.comment ?? null,
      current: true,
    });
  }

  // PUT /api/v1/hr/worker-meds/{id} — update.
  async update(id: number, dto: UpdateMedDto): Promise<void> {
    const [med] = await this.db
      .select({ id: meds.id, worker_id: meds.worker_id })
      .from(meds)
      .where(and(eq(meds.id, id), notDeleted(meds)))
      .limit(1);
    if (!med) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    const status = this.parseStatus(dto.status);

    await this.db
      .update(meds)
      .set({
        from: dto.from,
        to: dto.to ?? null,
        status: status ? 1 : 2,
        comment: dto.comment ?? null,
        ...(dto.file !== undefined ? { file: dto.file } : {}),
      })
      .where(eq(meds.id, id));
  }

  // DELETE /api/v1/hr/worker-meds/{id} — soft delete.
  async remove(id: number): Promise<void> {
    const [med] = await this.db
      .select({ id: meds.id })
      .from(meds)
      .where(and(eq(meds.id, id), notDeleted(meds)))
      .limit(1);
    if (!med) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    await this.db
      .update(meds)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(meds.id, id));
  }

  // ---- helpers ----

  private parseStatus(s: unknown): boolean {
    if (typeof s === 'boolean') return s;
    if (typeof s === 'number') return s === 1;
    if (typeof s === 'string') return s === '1' || s.toLowerCase() === 'true';
    return false;
  }

  private tr(key: string | undefined, lang: string): string {
    if (!key) return '';
    const v = this.i18n.t(key, { lang });
    return typeof v === 'string' ? v : '';
  }
}
