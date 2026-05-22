// HR Dashboard Views — fasad (orchestration only).
// 13 endpoint 3 ta fokuslangan servisga delegatsiya qilinadi:
//   DashboardWorkerService   — worker_position paginatsiyasi (7 endpoint)
//   DashboardHealthService   — nogironlik / kasallik varaqasi (3 endpoint)
//   DashboardActivityService — intizom / rag'bat / shartnoma (3 endpoint)
//
// Controller faqat shu fasadni biladi — API kontrakti o'zgarmaydi.

import { Injectable } from '@nestjs/common';
import { DashboardWorkerService } from '@/modules/hr/dashboard-views/dashboard-worker.service';
import { DashboardHealthService } from '@/modules/hr/dashboard-views/dashboard-health.service';
import { DashboardActivityService } from '@/modules/hr/dashboard-views/dashboard-activity.service';
import {
  BirthdaysQueryDto,
  ContractsQueryDto,
  DashboardYearQueryDto,
  DisabilityPreviewQueryDto,
  SickLeavePreviewQueryDto,
  WorkerByAgeQueryDto,
  WorkerByContractTypeQueryDto,
  WorkerByMedQueryDto,
  WorkerByPassportQueryDto,
  WorkerByPensionQueryDto,
  WorkersByEducationQueryDto,
} from '@/modules/hr/dashboard-views/dto/dashboard-views.dto';

@Injectable()
export class DashboardViewsService {
  constructor(
    private readonly worker: DashboardWorkerService,
    private readonly health: DashboardHealthService,
    private readonly activity: DashboardActivityService,
  ) {}

  birthdays(q: BirthdaysQueryDto) {
    return this.worker.birthdays(q);
  }

  workersByEducation(q: WorkersByEducationQueryDto) {
    return this.worker.workersByEducation(q);
  }

  workerByAge(q: WorkerByAgeQueryDto) {
    return this.worker.workerByAge(q);
  }

  workerByPassport(q: WorkerByPassportQueryDto) {
    return this.worker.workerByPassport(q);
  }

  workerByPension(q: WorkerByPensionQueryDto) {
    return this.worker.workerByPension(q);
  }

  workerByMed(q: WorkerByMedQueryDto) {
    return this.worker.workerByMed(q);
  }

  workerByContractTypes(q: WorkerByContractTypeQueryDto) {
    return this.worker.workerByContractTypes(q);
  }

  workerDisabilitiesPreview(q: DisabilityPreviewQueryDto) {
    return this.health.workerDisabilitiesPreview(q);
  }

  workerRelativeDisabilitiesPreview(q: DisabilityPreviewQueryDto) {
    return this.health.workerRelativeDisabilitiesPreview(q);
  }

  workerSickLeavesPreview(q: SickLeavePreviewQueryDto) {
    return this.health.workerSickLeavesPreview(q);
  }

  disciplinaryActions(q: DashboardYearQueryDto) {
    return this.activity.disciplinaryActions(q);
  }

  incentiveActions(q: DashboardYearQueryDto) {
    return this.activity.incentiveActions(q);
  }

  contracts(q: ContractsQueryDto) {
    return this.activity.contracts(q);
  }
}
