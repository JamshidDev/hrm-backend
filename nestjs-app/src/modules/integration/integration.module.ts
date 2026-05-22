// Integration module aggregator. Laravel: Modules/Integration (~29 routes).
// 8 ta sub-modul:
//   - main: /enums, /dashboard, /structure, /departments, /positions, /kpi/report
//   - workers: /workers, /workers/by-pins, /worker-by-pin, /worker/show/:uuid, turnstile-events
//   - stations: /stations/:code/* (workers, stats, resume)
//   - meds: /meds, /workers/:id/meds
//   - contracts: /contracts, /classifications/positions
//   - worker-salary: /worker/salary, /worker/get-salary-months
//   - worker-check: /worker/check
//   - mobile-face: /mobile-face/{send-event, check-worker, schedules} (Public HMAC)

import { Module } from '@nestjs/common';
import { IntegrationMainModule } from '@/modules/integration/main/main.module';
import { IntegrationWorkerModule } from '@/modules/integration/workers/worker.module';
import { IntegrationStationModule } from '@/modules/integration/stations/station.module';
import { IntegrationMedModule } from '@/modules/integration/meds/med.module';
import { IntegrationContractModule } from '@/modules/integration/contracts/contract.module';
import { IntegrationWorkerSalaryModule } from '@/modules/integration/worker-salary/worker-salary.module';
import { IntegrationWorkerCheckModule } from '@/modules/integration/worker-check/worker-check.module';
import { IntegrationMobileFaceModule } from '@/modules/integration/mobile-face/mobile-face.module';

@Module({
  imports: [
    IntegrationMainModule,
    IntegrationWorkerModule,
    IntegrationStationModule,
    IntegrationMedModule,
    IntegrationContractModule,
    IntegrationWorkerSalaryModule,
    IntegrationWorkerCheckModule,
    IntegrationMobileFaceModule,
  ],
})
export class IntegrationModule {}
