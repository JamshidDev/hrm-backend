// WorkerRelative service. Batch-load: workers + disabilities by ID.

import { Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  worker_relatives,
  worker_relative_disabilities,
  workers,
} from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import { WorkerUuidLookup } from '@/modules/hr/_shared/worker-uuid.helper';
import { WorkerRelativeMapper } from '@/modules/hr/worker-relatives/worker-relative.mapper';
import {
  CreateWorkerRelativeDto,
  UpdateWorkerRelativeDto,
  WorkerRelativeItemDto,
} from '@/modules/hr/worker-relatives/dto/worker-relative.dto';

@Injectable()
export class WorkerRelativeService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly lookup: WorkerUuidLookup,
    private readonly minio: MinioService,
  ) {}

  async findAll(
    uuid?: string,
    _search?: string,
  ): Promise<WorkerRelativeItemDto[]> {
    const workerId = await this.lookup.toId(uuid);
    if (workerId == null) return [];
    const lang = this.ctx.lang;

    const rows = await this.db
      .select({
        id: worker_relatives.id,
        relative: worker_relatives.relative,
        relative_worker_id: worker_relatives.relative_worker_id,
        birthday: worker_relatives.birthday,
        last_name: worker_relatives.last_name,
        first_name: worker_relatives.first_name,
        middle_name: worker_relatives.middle_name,
        birth_place: worker_relatives.birth_place,
        post_name: worker_relatives.post_name,
        address: worker_relatives.address,
      })
      .from(worker_relatives)
      .where(
        and(
          eq(worker_relatives.worker_id, workerId),
          notDeleted(worker_relatives),
        ),
      )
      .orderBy(asc(worker_relatives.sort));

    // Batch-load relative workers.
    const relativeWorkerIds = rows
      .map((r) => r.relative_worker_id)
      .filter((id): id is number => id != null);
    const relativeWorkerRows = relativeWorkerIds.length
      ? await this.db
          .select({
            id: workers.id,
            uuid: workers.uuid,
            photo: workers.photo,
            last_name: workers.last_name,
            first_name: workers.first_name,
            middle_name: workers.middle_name,
            birthday: workers.birthday,
            pin: workers.pin,
          })
          .from(workers)
          .where(inArray(workers.id, relativeWorkerIds))
      : [];
    const workerMap = new Map(relativeWorkerRows.map((w) => [w.id, w]));

    // Batch-load disabilities.
    const relativeIds = rows.map((r) => r.id);
    const disabilityRows = relativeIds.length
      ? await this.db
          .select()
          .from(worker_relative_disabilities)
          .where(
            and(
              inArray(worker_relative_disabilities.worker_relative_id, relativeIds),
              notDeleted(worker_relative_disabilities),
            ),
          )
          .orderBy(asc(worker_relative_disabilities.id))
      : [];
    const disMap = new Map<number, typeof disabilityRows>();
    for (const d of disabilityRows) {
      const arr = disMap.get(d.worker_relative_id) ?? [];
      arr.push(d);
      disMap.set(d.worker_relative_id, arr);
    }

    return Promise.all(
      rows.map((r) =>
        WorkerRelativeMapper.toItem(
          r,
          r.relative_worker_id ? workerMap.get(r.relative_worker_id) ?? null : null,
          disMap.get(r.id) ?? [],
          this.i18n,
          lang,
          this.minio,
        ),
      ),
    );
  }

  async create(dto: CreateWorkerRelativeDto): Promise<void> {
    await this.db.insert(worker_relatives).values({
      worker_id: dto.worker_id,
      relative: dto.relative,
      relative_worker_id: dto.relative_worker_id ?? null,
      pin: dto.pin ?? null,
      last_name: dto.last_name ?? null,
      first_name: dto.first_name ?? null,
      middle_name: dto.middle_name ?? null,
      birthday: dto.birthday ?? null,
      birth_place: dto.birth_place ?? null,
      post_name: dto.post_name ?? null,
      address: dto.address ?? null,
    });
  }

  async update(id: number, dto: UpdateWorkerRelativeDto): Promise<void> {
    await this.assertExists(id);
    await this.db
      .update(worker_relatives)
      .set({
        worker_id: dto.worker_id,
        relative: dto.relative,
        relative_worker_id: dto.relative_worker_id ?? null,
        pin: dto.pin ?? null,
        last_name: dto.last_name ?? null,
        first_name: dto.first_name ?? null,
        middle_name: dto.middle_name ?? null,
        birthday: dto.birthday ?? null,
        birth_place: dto.birth_place ?? null,
        post_name: dto.post_name ?? null,
        address: dto.address ?? null,
      })
      .where(eq(worker_relatives.id, id));
  }

  async remove(id: number): Promise<void> {
    await this.assertExists(id);
    await this.db
      .update(worker_relatives)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(worker_relatives.id, id));
  }

  async sort(orders: Array<{ id: number; sort: number }>): Promise<void> {
    for (const o of orders) {
      await this.db
        .update(worker_relatives)
        .set({ sort: o.sort })
        .where(eq(worker_relatives.id, o.id));
    }
  }

  private async assertExists(id: number) {
    const [row] = await this.db
      .select({ id: worker_relatives.id })
      .from(worker_relatives)
      .where(and(eq(worker_relatives.id, id), notDeleted(worker_relatives)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
  }
}
