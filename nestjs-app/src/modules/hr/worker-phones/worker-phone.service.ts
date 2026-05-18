// WorkerPhone service. Laravel: WorkerPhoneController + WorkerPhoneService.
// Resource oddiy (id, phone) — mapper kerak emas, inline qaytariladi.

import { Injectable } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { worker_phones } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { WorkerUuidLookup } from '@/modules/hr/_shared/worker-uuid.helper';
import {
  CreateWorkerPhoneDto,
  UpdateWorkerPhoneDto,
  WorkerPhoneItemDto,
} from '@/modules/hr/worker-phones/dto/worker-phone.dto';

@Injectable()
export class WorkerPhoneService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly lookup: WorkerUuidLookup,
  ) {}

  async findAll(uuid?: string): Promise<WorkerPhoneItemDto[]> {
    const workerId = await this.lookup.toId(uuid);
    if (workerId == null) return [];
    return this.db
      .select({ id: worker_phones.id, phone: worker_phones.phone })
      .from(worker_phones)
      .where(
        and(eq(worker_phones.worker_id, workerId), notDeleted(worker_phones)),
      )
      .orderBy(asc(worker_phones.id));
  }

  async create(dto: CreateWorkerPhoneDto): Promise<void> {
    await this.db.insert(worker_phones).values({
      worker_id: dto.worker_id,
      phone: Number(dto.phone),
    });
  }

  async update(id: number, dto: UpdateWorkerPhoneDto): Promise<void> {
    await this.assertExists(id);
    await this.db
      .update(worker_phones)
      .set({ worker_id: dto.worker_id, phone: Number(dto.phone) })
      .where(eq(worker_phones.id, id));
  }

  async remove(id: number): Promise<void> {
    await this.assertExists(id);
    await this.db
      .update(worker_phones)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(worker_phones.id, id));
  }

  private async assertExists(id: number) {
    const [row] = await this.db
      .select({ id: worker_phones.id })
      .from(worker_phones)
      .where(and(eq(worker_phones.id, id), notDeleted(worker_phones)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
  }
}
