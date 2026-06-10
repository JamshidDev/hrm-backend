import { Injectable } from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  learning_centers,
  learning_center_users,
  users,
  workers,
} from '@/db/schema';
import { paginate } from '@/common/pagination/paginate.util';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { findByIdOrFail, softDeleteById } from '@/common/database/crud.helper';
import { MinioService } from '@/shared/minio/minio.service';
import {
  LearningCenterMapper,
  type LearningCenterRow,
  type LearningCenterUserRow,
} from '@/modules/structure/learning-centers/learning-center.mapper';
import {
  QueryLearningCenterDto,
  CreateLearningCenterDto,
  UpdateLearningCenterDto,
  LearningCenterListResponseDto,
} from '@/modules/structure/learning-centers/dto/learning-center.dto';

@Injectable()
export class LearningCenterService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly minio: MinioService,
  ) {}

  async findAll(
    filters: QueryLearningCenterDto,
  ): Promise<LearningCenterListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const search = filters.search?.trim();
    const where = {
      deleted_at: { isNull: true as const },
      ...(search
        ? {
            OR: [
              { name: { ilike: `%${search}%` } },
              { name_ru: { ilike: `%${search}%` } },
              { name_en: { ilike: `%${search}%` } },
            ],
          }
        : {}),
    };

    const result = await paginate({
      db: this.db,
      count: () =>
        this.db.$count(
          sql`(${this.db.query.learning_centers.findMany({ where })})`,
        ),
      query: ({ limit, offset }) =>
        this.db.query.learning_centers.findMany({
          where,
          orderBy: { id: 'desc' },
          limit,
          offset,
        }),
      page,
      perPage,
      mapper: (c) => c,
    });

    const centerIds = result.data.map((c) => c.id);
    const usersByCenter = await this.fetchUsersForCenters(centerIds);

    const data = await Promise.all(
      result.data.map((c) => {
        const row: LearningCenterRow = {
          id: c.id,
          code: c.code,
          name: c.name,
          name_ru: c.name_ru,
          name_en: c.name_en,
          users: usersByCenter[c.id] ?? [],
        };
        return LearningCenterMapper.toItem(row, this.minio);
      }),
    );

    return {
      current_page: result.current_page,
      total: result.total,
      data,
    };
  }

  async create(dto: CreateLearningCenterDto): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(learning_centers)
        .values({
          name: dto.name,
          name_ru: dto.name_ru ?? null,
          name_en: dto.name_en ?? null,
          code: dto.code,
        })
        .returning({ id: learning_centers.id });

      if (dto.users && dto.users.length > 0) {
        await this.syncUsers(tx, created.id, dto.users);
      }
    });
  }

  async update(id: number, dto: UpdateLearningCenterDto): Promise<void> {
    await findByIdOrFail(this.db, learning_centers, id, this.i18n);

    await this.db.transaction(async (tx) => {
      await tx
        .update(learning_centers)
        .set({
          name: dto.name,
          name_ru: dto.name_ru ?? null,
          name_en: dto.name_en ?? null,
          code: dto.code,
        })
        .where(eq(learning_centers.id, id));

      if (dto.users && dto.users.length > 0) {
        await this.syncUsers(tx, id, dto.users);
      }
    });
  }

  async remove(id: number): Promise<void> {
    await findByIdOrFail(this.db, learning_centers, id, this.i18n);
    await softDeleteById(this.db, learning_centers, id);
  }

  private async syncUsers(
    tx: Parameters<Parameters<DataSource['transaction']>[0]>[0],
    centerId: number,
    userIds: number[],
  ): Promise<void> {
    await tx
      .delete(learning_center_users)
      .where(eq(learning_center_users.learning_center_id, centerId));

    if (userIds.length > 0) {
      await tx.insert(learning_center_users).values(
        userIds.map((uid) => ({
          learning_center_id: centerId,
          user_id: uid,
          status: true,
        })),
      );
    }
  }

  private async fetchUsersForCenters(
    centerIds: number[],
  ): Promise<Record<number, LearningCenterUserRow[]>> {
    const result: Record<number, LearningCenterUserRow[]> = {};
    if (centerIds.length === 0) return result;

    const rows = await this.db
      .select({
        center_id: learning_center_users.learning_center_id,
        user_id: users.id,
        user_phone: users.phone,
        pivot_status: learning_center_users.status,
        worker_id: workers.id,
        worker_photo: workers.photo,
        worker_last_name: workers.last_name,
        worker_first_name: workers.first_name,
        worker_middle_name: workers.middle_name,
      })
      .from(learning_center_users)
      .innerJoin(users, eq(learning_center_users.user_id, users.id))
      .leftJoin(workers, eq(users.worker_id, workers.id))
      .where(
        and(
          inArray(learning_center_users.learning_center_id, centerIds),
          notDeleted(learning_center_users),
        ),
      );

    for (const r of rows) {
      const entry: LearningCenterUserRow = {
        id: r.user_id,
        phone: r.user_phone,
        status: r.pivot_status,
        worker: r.worker_id
          ? {
              id: r.worker_id,
              photo: r.worker_photo,
              last_name: r.worker_last_name,
              first_name: r.worker_first_name,
              middle_name: r.worker_middle_name,
            }
          : null,
      };
      if (!result[r.center_id]) result[r.center_id] = [];
      result[r.center_id].push(entry);
    }
    return result;
  }
}
