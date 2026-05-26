import { Module, Global } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AcceptLanguageResolver, I18nModule, QueryResolver } from 'nestjs-i18n';
import * as path from 'path';

import { DrizzleModule } from '@/db/drizzle.module';
import { HikCentralModule } from '@/shared/hik-central/hik-central.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { ExcelModule } from '@/shared/excel/excel.module';
import { ExportTaskRunnerModule } from '@/shared/export-task/export-task-runner.module';
import { ConvertModule } from '@/shared/convert/convert.module';
import { PermissionModule } from '@/shared/permission/permission.module';
import { HrmClsModule } from '@/common/context/cls.module';
import { RequestContext } from '@/common/context/request.context';
import { AuthModule } from '@/modules/auth/auth.module';
import { UserModule } from '@/modules/user/user.module';
import { AdminModule } from '@/modules/admin/admin.module';
import { StructureModule } from '@/modules/structure/structure.module';
import { HrModule } from '@/modules/hr/hr.module';
import { TimesheetAggregatorModule } from '@/modules/timesheet/timesheet.module';
import { ConfirmationModule } from '@/modules/confirmation/confirmation.module';
import { MedDomainModule } from '@/modules/med/med.module';
import { VacancyModule } from '@/modules/vacancy/vacancy.module';
import { TurnstileModule } from '@/modules/turnstile/turnstile.module';
import { EconomistModule } from '@/modules/economist/economist.module';
import { ExamModule } from '@/modules/exam/exam.module';
import { LmsModule } from '@/modules/lms/lms.module';
import { IntegrationModule } from '@/modules/integration/integration.module';
import { ChatModule } from '@/modules/chat/chat.module';
import { ServicesModule } from '@/modules/services/services.module';
import { AiModule } from '@/modules/ai/ai.module';
import { UsefulModule } from '@/modules/useful/useful.module';
import { TelegramBotModule } from '@/modules/telegram-bot/telegram-bot.module';
import { OnlyOfficeModule } from '@/modules/only-office/only-office.module';
import { ResponseInterceptor } from '@/common/interceptors/response.interceptor';
import { BusinessExceptionFilter } from '@/common/filters/business-exception.filter';
import { ExistsConstraint } from '@/common/validators/exists.validator';

// RequestContext'ni global qilamiz — har modulda inject qilish mumkin.
@Global()
@Module({
  providers: [RequestContext],
  exports: [RequestContext],
})
class RequestContextModule {}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HrmClsModule,
    RequestContextModule,

    I18nModule.forRoot({
      fallbackLanguage: process.env.DEFAULT_LANG || 'uz',
      loaderOptions: {
        path: path.join(process.cwd(), 'src/i18n'),
        watch: true,
      },
      resolvers: [new QueryResolver(['lang']), new AcceptLanguageResolver()],
    }),

    DrizzleModule,
    HikCentralModule,
    MinioModule,
    ExcelModule,
    ExportTaskRunnerModule,
    ConvertModule,
    PermissionModule,
    AuthModule,
    UserModule,
    AdminModule,
    StructureModule,
    HrModule,
    TimesheetAggregatorModule,
    ConfirmationModule,
    MedDomainModule,
    VacancyModule,
    TurnstileModule,
    EconomistModule,
    ExamModule,
    LmsModule,
    IntegrationModule,
    ChatModule,
    ServicesModule,
    AiModule,
    UsefulModule,
    TelegramBotModule,
    OnlyOfficeModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: BusinessExceptionFilter },
    // class-validator async validator'lar (@Exists) — DI orqali DataSource oladi.
    ExistsConstraint,
  ],
})
export class AppModule {}
