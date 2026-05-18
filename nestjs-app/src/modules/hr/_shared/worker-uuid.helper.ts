// Worker UUID → worker_id lookup. Laravel: Helper::idUuid() (Cache::get/put bilan).
// NestJS hozircha cache yo'q — Redis qo'shilsa, oson plug.

import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { workers } from '@/db/schema';

@Injectable()
export class WorkerUuidLookup {
  constructor(@InjectDb() private readonly db: DataSource) {}

  // Returns worker_id yoki null. Soft-delete tekshiruvi yo'q (Laravel'da ham yo'q).
  async toId(uuid: string | undefined | null): Promise<number | null> {
    if (!uuid) return null;
    const [row] = await this.db
      .select({ id: workers.id })
      .from(workers)
      .where(eq(workers.uuid, uuid))
      .limit(1);
    return row?.id ?? null;
  }
}
