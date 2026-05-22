// Integration worker check service. Laravel: WorkerController.checkWorker.
// permission: integration-worker-info.

import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { workers } from '@/db/schema';
import type { WorkerCheckDto } from '@/modules/integration/worker-check/dto/worker-check.dto';

@Injectable()
export class IntegrationWorkerCheckService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  /** POST /integration/worker/check — pin yoki uuid orqali tekshirish. */
  async check(dto: WorkerCheckDto) {
    if (!dto.pin && !dto.uuid) {
      return { exists: false, worker: null };
    }
    const conds = [notDeleted(workers)];
    if (dto.pin) conds.push(eq(workers.pin, dto.pin));
    if (dto.uuid) conds.push(eq(workers.uuid, dto.uuid));

    const [row] = await this.db
      .select()
      .from(workers)
      .where(and(...conds))
      .limit(1);

    return {
      exists: !!row,
      worker: row ?? null,
    };
  }
}
