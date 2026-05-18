// HR aggregator. Laravel: Modules/HR.
//
// Hozirgi qamrov (Bosqich 1 — HR Foundation):
//   - NationalityModule  (CRUD: /api/v1/hr/nationalities)
//   - DepartmentModule   (CRUD + levels/list/tree: /api/v1/hr/departments*)
//
// Keyingi bosqichlarda qo'shiladi: DepartmentPositionModule, WorkerModule, ...

import { Module } from '@nestjs/common';
import { NationalityModule } from '@/modules/hr/nationalities/nationality.module';
import { DepartmentModule } from '@/modules/hr/departments/department.module';
import { DepartmentPositionModule } from '@/modules/hr/department-positions/department-position.module';
import { HrEnumsModule } from '@/modules/hr/enums-endpoint/enums.module';
import { EnumsExtrasModule } from '@/modules/hr/enums-extras/enums-extras.module';
import { DashboardModule } from '@/modules/hr/dashboard/dashboard.module';
import { DashboardViewsModule } from '@/modules/hr/dashboard-views/dashboard-views.module';
import { WorkerPhotoModule } from '@/modules/hr/worker-photos/worker-photo.module';
import { WorkerApplicationModule } from '@/modules/hr/worker-applications/worker-application.module';
import { MedModule } from '@/modules/hr/meds/med.module';
import { ReportModule } from '@/modules/hr/reports/report.module';
import { OrganizationPhoneModule } from '@/modules/hr/organization-phones/organization-phone.module';
import { WorkerUserModule } from '@/modules/hr/worker-users/worker-user.module';
import { EduPlanModule } from '@/modules/hr/edu-plans/edu-plan.module';
import { DepartmentLocationModule } from '@/modules/hr/department-locations/department-location.module';
import { VacancyPositionModule } from '@/modules/hr/vacancy-positions/vacancy-position.module';
import { WorkerModule } from '@/modules/hr/workers/worker.module';
import { WorkerPositionModule } from '@/modules/hr/worker-positions/worker-position.module';
// Bosqich 3 — Worker sub-resources.
import { WorkerPhoneModule } from '@/modules/hr/worker-phones/worker-phone.module';
import { WorkerDisabilityModule } from '@/modules/hr/worker-disabilities/worker-disability.module';
import { WorkerRelativeDisabilityModule } from '@/modules/hr/worker-relative-disabilities/worker-relative-disability.module';
import { WorkerSickLeaveModule } from '@/modules/hr/worker-sick-leaves/worker-sick-leave.module';
import { WorkerPartyModule } from '@/modules/hr/worker-parties/worker-party.module';
import { WorkerMilitaryModule } from '@/modules/hr/worker-militaries/worker-military.module';
import { WorkerAcademicDegreeModule } from '@/modules/hr/worker-academic-degrees/worker-academic-degree.module';
import { WorkerAcademicTitleModule } from '@/modules/hr/worker-academic-titles/worker-academic-title.module';
import { WorkerLanguageModule } from '@/modules/hr/worker-languages/worker-language.module';
import { WorkerRelativeModule } from '@/modules/hr/worker-relatives/worker-relative.module';
import { WorkerOldCareerModule } from '@/modules/hr/worker-old-careers/worker-old-career.module';
import { WorkerPassportModule } from '@/modules/hr/worker-passports/worker-passport.module';
// Bosqich 4 — Contracts + Commands.
import { ContractModule } from '@/modules/hr/contracts/contract.module';
import { CommandModule } from '@/modules/hr/commands/command.module';
import { ContractAdditionalModule } from '@/modules/hr/contract-additional/contract-additional.module';
import { ConfirmationWorkerModule } from '@/modules/hr/confirmation-workers/confirmation-worker.module';
// Bosqich 5 — Vacancies.
import { VacancyModule } from '@/modules/hr/vacancies/vacancy.module';
// Bosqich 6 — Vacations.
import { VacationScheduleModule } from '@/modules/hr/vacation-schedules/vacation-schedule.module';
import { VacationModule } from '@/modules/hr/vacations/vacation.module';
import { VacationScheduleYearModule } from '@/modules/hr/vacation-schedule-years/vacation-schedule-year.module';
// Bosqich 7 — Dashboard + Other.
import { PolyclinicModule } from '@/modules/hr/polyclinics/polyclinic.module';
import { PensionerModule } from '@/modules/hr/pensioners/pensioner.module';
import { LeaderModule } from '@/modules/hr/leaders/leader.module';
import { OrganizationDocumentModule } from '@/modules/hr/organization-documents/organization-document.module';
import { WorkerUniversityModule } from '@/modules/hr/worker-universities/worker-university.module';
import { IncentiveModule } from '@/modules/hr/incentives/incentive.module';
import { DisciplinaryModule } from '@/modules/hr/disciplinaries/disciplinary.module';
import { BusinessTripModule } from '@/modules/hr/business-trips/business-trip.module';
// Bosqich 8 — HR Exports.
import { WorkerExportModule } from '@/modules/hr/worker-exports/worker-export.module';
import { ExportTaskModule } from '@/modules/hr/export-tasks/export-task.module';
// Filter endpoints.
import { FilterModule } from '@/modules/hr/filters/filter.module';

@Module({
  imports: [
    NationalityModule,
    DepartmentModule,
    DepartmentPositionModule,
    HrEnumsModule,
    EnumsExtrasModule,
    DashboardModule,
    DashboardViewsModule,
    WorkerModule,
    WorkerPhotoModule,
    WorkerApplicationModule,
    MedModule,
    ReportModule,
    OrganizationPhoneModule,
    WorkerUserModule,
    EduPlanModule,
    DepartmentLocationModule,
    VacancyPositionModule,
    WorkerPositionModule,
    // Bosqich 3 — sub-resources.
    WorkerPhoneModule,
    WorkerDisabilityModule,
    WorkerRelativeDisabilityModule,
    WorkerSickLeaveModule,
    WorkerPartyModule,
    WorkerMilitaryModule,
    WorkerAcademicDegreeModule,
    WorkerAcademicTitleModule,
    WorkerLanguageModule,
    WorkerRelativeModule,
    WorkerOldCareerModule,
    WorkerPassportModule,
    // Bosqich 4.
    ContractModule,
    CommandModule,
    ContractAdditionalModule,
    ConfirmationWorkerModule,
    // Bosqich 5.
    VacancyModule,
    // Bosqich 6.
    VacationScheduleModule,
    VacationModule,
    VacationScheduleYearModule,
    // Bosqich 7.
    PolyclinicModule,
    PensionerModule,
    LeaderModule,
    OrganizationDocumentModule,
    WorkerUniversityModule,
    IncentiveModule,
    DisciplinaryModule,
    BusinessTripModule,
    // Bosqich 8.
    WorkerExportModule,
    ExportTaskModule,
    // Filter endpoints.
    FilterModule,
  ],
})
export class HrModule {}
