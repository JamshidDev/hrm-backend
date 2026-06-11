// Per-modul API docs ro'yxati. Har bir guruh alohida /api/docs/<slug> sahifa oladi.
// `module` — o'sha domenning root NestJS moduli; `include` uni (va import qilgan
// sub-modullarini) qamrab oladi. AuthModule har docs'ga alohida qo'shiladi (login uchun).

import type { Type } from '@nestjs/common';
import { UserModule } from '@/modules/user/user.module';
import { AdminModule } from '@/modules/admin/admin.module';
import { StructureModule } from '@/modules/structure/structure.module';
import { HrModule } from '@/modules/hr/hr.module';
import { TurnstileModule } from '@/modules/turnstile/turnstile.module';
import { ConfirmationModule } from '@/modules/confirmation/confirmation.module';
import { MedDomainModule } from '@/modules/med/med.module';
import { LmsModule } from '@/modules/lms/lms.module';
import { ExamModule } from '@/modules/exam/exam.module';
import { IntegrationModule } from '@/modules/integration/integration.module';
import { EconomistModule } from '@/modules/economist/economist.module';
import { TimesheetAggregatorModule } from '@/modules/timesheet/timesheet.module';
import { VacancyModule } from '@/modules/vacancy/vacancy.module';
import { ChatModule } from '@/modules/chat/chat.module';
import { ServicesModule } from '@/modules/services/services.module';
import { AiModule } from '@/modules/ai/ai.module';
import { UsefulModule } from '@/modules/useful/useful.module';
import { TelegramBotModule } from '@/modules/telegram-bot/telegram-bot.module';
import { OnlyOfficeModule } from '@/modules/only-office/only-office.module';

export interface DocsGroup {
  slug: string;
  title: string;
  module: Type<unknown>;
}

export const DOCS_GROUPS: DocsGroup[] = [
  { slug: 'user', title: 'User', module: UserModule },
  { slug: 'admin', title: 'Admin', module: AdminModule },
  { slug: 'structure', title: 'Structure', module: StructureModule },
  { slug: 'hr', title: 'HR', module: HrModule },
  { slug: 'turnstile', title: 'Turnstile', module: TurnstileModule },
  { slug: 'confirmation', title: 'Confirmation', module: ConfirmationModule },
  { slug: 'med', title: 'Med', module: MedDomainModule },
  { slug: 'lms', title: 'LMS', module: LmsModule },
  { slug: 'exam', title: 'Exam', module: ExamModule },
  { slug: 'integration', title: 'Integration', module: IntegrationModule },
  { slug: 'economist', title: 'Economist', module: EconomistModule },
  { slug: 'timesheet', title: 'Timesheet', module: TimesheetAggregatorModule },
  { slug: 'vacancy', title: 'Vacancy', module: VacancyModule },
  { slug: 'chat', title: 'Chat', module: ChatModule },
  { slug: 'services', title: 'Services', module: ServicesModule },
  { slug: 'ai', title: 'AI', module: AiModule },
  { slug: 'useful', title: 'Useful', module: UsefulModule },
  { slug: 'telegram-bot', title: 'Telegram Bot', module: TelegramBotModule },
  { slug: 'only-office', title: 'OnlyOffice', module: OnlyOfficeModule },
];
