// Structure aggregator — Laravel: Modules/Structure/routes/api.php (`/api/v1/structure/*`).

import { Module } from '@nestjs/common';
import { CountryModule } from '@/modules/structure/countries/country.module';
import { RegionModule } from '@/modules/structure/regions/region.module';
import { CityModule } from '@/modules/structure/cities/city.module';
import { LanguageModule } from '@/modules/structure/languages/language.module';
import { PositionModule } from '@/modules/structure/positions/position.module';
import { SpecialityModule } from '@/modules/structure/specialities/speciality.module';
import { UniversityModule } from '@/modules/structure/universities/university.module';
import { OrganizationModule } from '@/modules/structure/organizations/organization.module';
import { ScheduleModule } from '@/modules/structure/schedules/schedule.module';
import { WorkDayModule } from '@/modules/structure/work-days/work-day.module';
import { HolidayModule } from '@/modules/structure/holidays/holiday.module';
import { QuoteModule } from '@/modules/structure/quotes/quote.module';
import { OrganizationServiceModule } from '@/modules/structure/organization-services/organization-service.module';
import { EnumsModule } from '@/modules/structure/enums-endpoint/enums.module';
import { LearningCenterModule } from '@/modules/structure/learning-centers/learning-center.module';
import { DocumentTypesModule } from '@/modules/structure/document-types/document-types.module';
import { VacancyApproveModule } from '@/modules/structure/vacancy-approve/vacancy-approve.module';
import { StructureTreeModule } from '@/modules/structure/structure-tree/structure-tree.module';
import { UploadModule } from '@/modules/structure/upload/upload.module';
import { ReportModule } from '@/modules/structure/reports/report.module';
import { ExportModule } from '@/modules/structure/export/export.module';

@Module({
  imports: [
    CountryModule,
    RegionModule,
    CityModule,
    LanguageModule,
    PositionModule,
    SpecialityModule,
    UniversityModule,
    OrganizationModule,
    ScheduleModule,
    WorkDayModule,
    HolidayModule,
    QuoteModule,
    OrganizationServiceModule,
    EnumsModule,
    LearningCenterModule,
    DocumentTypesModule,
    VacancyApproveModule,
    StructureTreeModule,
    UploadModule,
    ReportModule,
    ExportModule,
  ],
})
export class StructureModule {}
