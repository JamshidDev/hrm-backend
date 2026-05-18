// Vacancy aggregator module. Laravel: Modules/Vacancy (~29 route).
//
// Sub-modullar:
//   - VacancyBoardModule   (/api/v1/vacancies — organizations, report, list, regions, cities) — public
//   - VacancyEnumsModule   (/api/v1/vacancies/enums) — public
//   - VacancyAuthModule    (/api/v1/vacancies — login, token, register, profile, update)
//   - CareerModule         (/api/v1/vacancies/careers) — resource
//   - EducationModule      (/api/v1/vacancies/educations) — resource
//   - ApplicationModule    (/api/v1/vacancies — send-application, applications, dashboard, files)
//   - VacancyExamModule    (/api/v1/vacancies/applications/{id}/exam/*)
//   - VacancyZoomModule    (/api/v1/vacancies/zoom/check-meet) — public
//
// ESLATMA: Laravel `auth:vacancy` guard (alohida vacancy_users jadvali, Sanctum
// token). NestJS'da bu guard hali implement qilinmagan — auth endpointlar
// AuthHybridGuard bilan himoyalangan, foydalanuvchi id'si hozircha stub (0).

import { Module } from '@nestjs/common';

import { VacancyBoardModule } from '@/modules/vacancy/vacancy-board/vacancy-board.module';
import { VacancyEnumsModule } from '@/modules/vacancy/enums-endpoint/enums.module';
import { VacancyAuthModule } from '@/modules/vacancy/vacancy-auth/vacancy-auth.module';
import { CareerModule } from '@/modules/vacancy/careers/career.module';
import { EducationModule } from '@/modules/vacancy/educations/education.module';
import { ApplicationModule } from '@/modules/vacancy/applications/application.module';
import { VacancyExamModule } from '@/modules/vacancy/exams/exam.module';
import { VacancyZoomModule } from '@/modules/vacancy/zoom/zoom.module';

@Module({
  imports: [
    VacancyBoardModule,
    VacancyEnumsModule,
    VacancyAuthModule,
    CareerModule,
    EducationModule,
    ApplicationModule,
    VacancyExamModule,
    VacancyZoomModule,
  ],
})
export class VacancyModule {}
