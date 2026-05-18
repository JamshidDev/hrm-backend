// WorkerSickLeave service.

import { Injectable } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { worker_sick_leaves } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { WorkerUuidLookup } from '@/modules/hr/_shared/worker-uuid.helper';
import {
  CreateWorkerSickLeaveDto,
  UpdateWorkerSickLeaveDto,
  WorkerSickLeaveItemDto,
} from '@/modules/hr/worker-sick-leaves/dto/worker-sick-leave.dto';

@Injectable()
export class WorkerSickLeaveService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly lookup: WorkerUuidLookup,
  ) {}

  async findAll(uuid?: string): Promise<WorkerSickLeaveItemDto[]> {
    const workerId = await this.lookup.toId(uuid);
    if (workerId == null) return [];
    return this.db
      .select({
        id: worker_sick_leaves.id,
        worker_position_id: worker_sick_leaves.worker_position_id,
        from_date: worker_sick_leaves.from_date,
        to_date: worker_sick_leaves.to_date,
        sick: worker_sick_leaves.sick,
        type: worker_sick_leaves.type,
      })
      .from(worker_sick_leaves)
      .where(
        and(
          eq(worker_sick_leaves.worker_id, workerId),
          notDeleted(worker_sick_leaves),
        ),
      )
      .orderBy(asc(worker_sick_leaves.id));
  }

  async findOne(id: number): Promise<WorkerSickLeaveItemDto> {
    const [row] = await this.db
      .select({
        id: worker_sick_leaves.id,
        worker_position_id: worker_sick_leaves.worker_position_id,
        from_date: worker_sick_leaves.from_date,
        to_date: worker_sick_leaves.to_date,
        sick: worker_sick_leaves.sick,
        type: worker_sick_leaves.type,
      })
      .from(worker_sick_leaves)
      .where(and(eq(worker_sick_leaves.id, id), notDeleted(worker_sick_leaves)))
      .limit(1);
    if (!row) throw new BusinessException(404, this.i18n.t('messages.not_found'));
    return row;
  }

  async create(dto: CreateWorkerSickLeaveDto): Promise<void> {
    await this.db.insert(worker_sick_leaves).values({
      worker_id: dto.worker_id,
      worker_position_id: dto.worker_position_id,
      from_date: dto.from_date,
      to_date: dto.to_date ?? null,
      sick: dto.sick ?? null,
      type: dto.type ?? 1,
    });
  }

  async update(id: number, dto: UpdateWorkerSickLeaveDto): Promise<void> {
    await this.findOne(id);
    await this.db
      .update(worker_sick_leaves)
      .set({
        worker_id: dto.worker_id,
        worker_position_id: dto.worker_position_id,
        from_date: dto.from_date,
        to_date: dto.to_date ?? null,
        sick: dto.sick ?? null,
        type: dto.type ?? 1,
      })
      .where(eq(worker_sick_leaves.id, id));
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.db
      .update(worker_sick_leaves)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(worker_sick_leaves.id, id));
  }
}
