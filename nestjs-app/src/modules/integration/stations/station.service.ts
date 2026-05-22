// Integration stations service. Laravel: StationController.
// Endpointlar: stations/:code/workers, stations/:code/workers/:workerId,
//   stations/:code/workers/:workerId/resume, stations/:code/stats.

import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { workers } from '@/db/schema';
import {
  pageOf,
  type IntegrationPageQueryDto,
} from '@/modules/integration/_shared/page-query.dto';

@Injectable()
export class IntegrationStationService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  /** GET /integration/stations/:code/workers — Laravel: stantsiya kodi bo'yicha workerlar. */
  // eslint-disable-next-line @typescript-eslint/require-await
  async listWorkers(_code: string, q: IntegrationPageQueryDto) {
    const { page, perPage } = pageOf(q);
    // Stub: real implementation stantsiya kod orqali workerlarni topadi.
    return {
      current_page: page,
      per_page: perPage,
      total: 0,
      data: [],
    };
  }

  /** GET /integration/stations/:code/workers/:workerId. */
  async showWorker(_code: string, workerId: number) {
    const [row] = await this.db
      .select()
      .from(workers)
      .where(eq(workers.id, workerId))
      .limit(1);
    return row ?? null;
  }

  /** GET /integration/stations/:code/workers/:workerId/resume — stub. */
  // eslint-disable-next-line @typescript-eslint/require-await
  async workerResume(_code: string, _workerId: number) {
    return { url: '', stub: true };
  }

  /** GET /integration/stations/:code/stats — stub. */
  // eslint-disable-next-line @typescript-eslint/require-await
  async stats(_code: string) {
    return { workers_count: 0, departments_count: 0, stub: true };
  }
}
