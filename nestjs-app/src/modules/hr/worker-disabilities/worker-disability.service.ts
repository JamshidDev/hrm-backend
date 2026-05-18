// WorkerDisability service. Resource oddiy — inline qaytariladi (mapper kerak emas).

import { Injectable } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { worker_disabilities } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { WorkerUuidLookup } from '@/modules/hr/_shared/worker-uuid.helper';
import {
  CreateWorkerDisabilityDto,
  UpdateWorkerDisabilityDto,
  WorkerDisabilityItemDto,
} from '@/modules/hr/worker-disabilities/dto/worker-disability.dto';

@Injectable()
export class WorkerDisabilityService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly lookup: WorkerUuidLookup,
  ) {}

  async findAll(uuid?: string): Promise<WorkerDisabilityItemDto[]> {
    const workerId = await this.lookup.toId(uuid);
    if (workerId == null) return [];
    return this.db
      .select({
        id: worker_disabilities.id,
        level: worker_disabilities.level,
        number: worker_disabilities.number,
        from: worker_disabilities.from,
        to: worker_disabilities.to,
        comment: worker_disabilities.comment,
      })
      .from(worker_disabilities)
      .where(
        and(
          eq(worker_disabilities.worker_id, workerId),
          notDeleted(worker_disabilities),
        ),
      )
      .orderBy(asc(worker_disabilities.id));
  }

  async create(dto: CreateWorkerDisabilityDto): Promise<void> {
    await this.db.insert(worker_disabilities).values({
      worker_id: dto.worker_id,
      level: dto.level,
      number: dto.number ?? null,
      from: dto.from ?? null,
      to: dto.to ?? null,
      comment: dto.comment ?? null,
    });
  }

  async update(id: number, dto: UpdateWorkerDisabilityDto): Promise<void> {
    await this.assertExists(id);
    await this.db
      .update(worker_disabilities)
      .set({
        worker_id: dto.worker_id,
        level: dto.level,
        number: dto.number ?? null,
        from: dto.from ?? null,
        to: dto.to ?? null,
        comment: dto.comment ?? null,
      })
      .where(eq(worker_disabilities.id, id));
  }

  async remove(id: number): Promise<void> {
    await this.assertExists(id);
    await this.db
      .update(worker_disabilities)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(worker_disabilities.id, id));
  }

  private async assertExists(id: number) {
    const [row] = await this.db
      .select({ id: worker_disabilities.id })
      .from(worker_disabilities)
      .where(
        and(eq(worker_disabilities.id, id), notDeleted(worker_disabilities)),
      )
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
  }
}
