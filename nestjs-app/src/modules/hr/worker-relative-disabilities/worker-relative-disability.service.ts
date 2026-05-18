// WorkerRelativeDisability service. Laravel: WorkerRelativeDisabilityController.
// Oddiy apiResource (index/store/show/update/destroy).
// Laravel model'da scopeFilter yo'q — biz worker_relative_id query bilan filterlaymiz.

import { Injectable } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { worker_relative_disabilities } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import {
  CreateWorkerRelativeDisabilityDto,
  UpdateWorkerRelativeDisabilityDto,
  WorkerRelativeDisabilityItemDto,
} from '@/modules/hr/worker-relative-disabilities/dto/worker-relative-disability.dto';

@Injectable()
export class WorkerRelativeDisabilityService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
  ) {}

  async findAll(
    workerRelativeId?: number,
  ): Promise<WorkerRelativeDisabilityItemDto[]> {
    const conditions = [notDeleted(worker_relative_disabilities)];
    if (workerRelativeId != null) {
      conditions.push(
        eq(worker_relative_disabilities.worker_relative_id, workerRelativeId),
      );
    }
    return this.db
      .select({
        id: worker_relative_disabilities.id,
        level: worker_relative_disabilities.level,
        number: worker_relative_disabilities.number,
        from: worker_relative_disabilities.from,
        to: worker_relative_disabilities.to,
        comment: worker_relative_disabilities.comment,
      })
      .from(worker_relative_disabilities)
      .where(and(...conditions))
      .orderBy(asc(worker_relative_disabilities.id));
  }

  async findOne(id: number): Promise<WorkerRelativeDisabilityItemDto> {
    const [row] = await this.db
      .select({
        id: worker_relative_disabilities.id,
        level: worker_relative_disabilities.level,
        number: worker_relative_disabilities.number,
        from: worker_relative_disabilities.from,
        to: worker_relative_disabilities.to,
        comment: worker_relative_disabilities.comment,
      })
      .from(worker_relative_disabilities)
      .where(
        and(
          eq(worker_relative_disabilities.id, id),
          notDeleted(worker_relative_disabilities),
        ),
      )
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    return row;
  }

  async create(dto: CreateWorkerRelativeDisabilityDto): Promise<void> {
    await this.db.insert(worker_relative_disabilities).values({
      worker_relative_id: dto.worker_relative_id,
      level: dto.level,
      number: dto.number,
      from: dto.from ?? null,
      to: dto.to ?? null,
      comment: dto.comment ?? null,
    });
  }

  async update(
    id: number,
    dto: UpdateWorkerRelativeDisabilityDto,
  ): Promise<void> {
    await this.assertExists(id);
    await this.db
      .update(worker_relative_disabilities)
      .set({
        level: dto.level,
        number: dto.number,
        from: dto.from ?? null,
        to: dto.to ?? null,
        comment: dto.comment ?? null,
      })
      .where(eq(worker_relative_disabilities.id, id));
  }

  async remove(id: number): Promise<void> {
    await this.assertExists(id);
    await this.db
      .update(worker_relative_disabilities)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(worker_relative_disabilities.id, id));
  }

  private async assertExists(id: number): Promise<void> {
    const [row] = await this.db
      .select({ id: worker_relative_disabilities.id })
      .from(worker_relative_disabilities)
      .where(
        and(
          eq(worker_relative_disabilities.id, id),
          notDeleted(worker_relative_disabilities),
        ),
      )
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
  }
}
