// Integration worker salary service. Laravel: WorkerController.getStatements,
// WorkerController.getStatementMonths. permission: integration-worker-salary.

import { Injectable } from '@nestjs/common';
import type {
  WorkerSalaryDto,
  WorkerSalaryMonthsDto,
} from '@/modules/integration/worker-salary/dto/worker-salary.dto';

@Injectable()
export class IntegrationWorkerSalaryService {
  /** POST /integration/worker/salary — stub (Laravel: external API). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async getStatements(_dto: WorkerSalaryDto) {
    return {
      current_page: 1,
      per_page: 10,
      total: 0,
      data: [],
      stub: true,
    };
  }

  /** POST /integration/worker/get-salary-months — stub. */
  // eslint-disable-next-line @typescript-eslint/require-await
  async getStatementMonths(_dto: WorkerSalaryMonthsDto) {
    return [];
  }
}
