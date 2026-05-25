// WorkerOldCareer service.

import { Injectable } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { worker_old_careers } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { WorkerUuidLookup } from '@/modules/hr/_shared/worker-uuid.helper';
import {
  CreateWorkerOldCareerDto,
  UpdateWorkerOldCareerDto,
  WorkerOldCareerItemDto,
} from '@/modules/hr/worker-old-careers/dto/worker-old-career.dto';

@Injectable()
export class WorkerOldCareerService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly lookup: WorkerUuidLookup,
  ) {}

  async findAll(uuid?: string): Promise<WorkerOldCareerItemDto[]> {
    const workerId = await this.lookup.toId(uuid);
    if (workerId == null) return [];
    return this.db
      .select({
        id: worker_old_careers.id,
        sort: worker_old_careers.sort,
        from_date: worker_old_careers.from_date,
        to_date: worker_old_careers.to_date,
        post_name: worker_old_careers.post_name,
      })
      .from(worker_old_careers)
      .where(
        and(
          eq(worker_old_careers.worker_id, workerId),
          notDeleted(worker_old_careers),
        ),
      )
      .orderBy(asc(worker_old_careers.sort));
  }

  async create(dto: CreateWorkerOldCareerDto): Promise<void> {
    // Laravel: Helper::idUuid($uuid) — worker uuid → id.
    const workerId = await this.lookup.toId(dto.uuid);
    if (workerId == null) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    await this.db.insert(worker_old_careers).values({
      worker_id: workerId,
      from_date: dto.from_date,
      to_date: dto.to_date,
      post_name: dto.post_name,
      sort: dto.sort ?? 0,
    });
  }

  async update(id: number, dto: UpdateWorkerOldCareerDto): Promise<void> {
    await this.assertExists(id);
    await this.db
      .update(worker_old_careers)
      .set({
        from_date: dto.from_date,
        to_date: dto.to_date,
        post_name: dto.post_name,
        ...(dto.sort != null ? { sort: dto.sort } : {}),
      })
      .where(eq(worker_old_careers.id, id));
  }

  async remove(id: number): Promise<void> {
    await this.assertExists(id);
    await this.db
      .update(worker_old_careers)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(worker_old_careers.id, id));
  }

  async sort(orders: Array<{ id: number; sort: number }>): Promise<void> {
    for (const o of orders) {
      await this.db
        .update(worker_old_careers)
        .set({ sort: o.sort })
        .where(eq(worker_old_careers.id, o.id));
    }
  }

  private async assertExists(id: number) {
    const [row] = await this.db
      .select({ id: worker_old_careers.id })
      .from(worker_old_careers)
      .where(and(eq(worker_old_careers.id, id), notDeleted(worker_old_careers)))
      .limit(1);
    if (!row)
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
  }
}
