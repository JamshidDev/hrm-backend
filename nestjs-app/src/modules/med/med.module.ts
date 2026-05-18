// Med aggregator module. Laravel: Modules/Med (~16 route).
//
// Sub-modullar:
//   - MedWorkersModule          (/api/v1/med — workers, polyclinics, dashboard, organizations)
//   - SendedWorkerModule        (/api/v1/med — send-to-med, sended-workers, destroy)
//   - MedWorkerPositionModule   (/api/v1/med/worker-positions)
//   - MedPensionerModule        (/api/v1/med/pensioners)
//   - HospitalModule            (/api/v1/med/hospital/*)
//
// ESLATMA: Modul klassi `MedDomainModule` deb nomlangan — HR ichidagi
// MedModule (worker-meds) bilan to'qnashmaslik uchun.

import { Module } from '@nestjs/common';

import { MedWorkersModule } from '@/modules/med/med-workers/med-workers.module';
import { SendedWorkerModule } from '@/modules/med/sended-workers/sended-worker.module';
import { MedWorkerPositionModule } from '@/modules/med/worker-positions/worker-position.module';
import { MedPensionerModule } from '@/modules/med/pensioners/pensioner.module';
import { HospitalModule } from '@/modules/med/hospital/hospital.module';

@Module({
  imports: [
    MedWorkersModule,
    SendedWorkerModule,
    MedWorkerPositionModule,
    MedPensionerModule,
    HospitalModule,
  ],
})
export class MedDomainModule {}
