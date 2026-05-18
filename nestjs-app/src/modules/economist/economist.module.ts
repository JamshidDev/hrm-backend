// Economist aggregator module. Laravel: Modules/Economist (~35 route).
//
// Sub-modullar:
//   - EconomistDashboardModule   (/api/v1/economist/dashboard)
//   - EconomistUploadModule      (/api/v1/economist — upload, history, statuses, confirm, refresh-pins)
//   - EconomistEnumsModule       (/api/v1/economist — enums, structure)
//   - StatementModule            (/api/v1/economist/statements + extras + example)
//   - TaxFourModule              (/api/v1/economist/tax-four-applications + example)
//   - TaxFiveModule              (/api/v1/economist/tax-five-applications + example)
//   - PensionPaymentModule       (/api/v1/economist/pension-payments + example)
//   - WorkerCategoryModule       (/api/v1/economist/worker-categories + report)
//   - StaffingModule             (/api/v1/economist/staffing/*)
//   - EconomistTelegramModule    (/api/v1/economist/telegram/*) — public

import { Module } from '@nestjs/common';

import { EconomistDashboardModule } from '@/modules/economist/dashboard/dashboard.module';
import { EconomistUploadModule } from '@/modules/economist/uploads/upload.module';
import { EconomistEnumsModule } from '@/modules/economist/enums-endpoint/enums.module';
import { StatementModule } from '@/modules/economist/statements/statement.module';
import { TaxFourModule } from '@/modules/economist/tax-four-applications/tax-four.module';
import { TaxFiveModule } from '@/modules/economist/tax-five-applications/tax-five.module';
import { PensionPaymentModule } from '@/modules/economist/pension-payments/pension-payment.module';
import { WorkerCategoryModule } from '@/modules/economist/worker-categories/worker-category.module';
import { StaffingModule } from '@/modules/economist/staffing/staffing.module';
import { EconomistTelegramModule } from '@/modules/economist/telegram/telegram.module';

@Module({
  imports: [
    EconomistDashboardModule,
    EconomistUploadModule,
    EconomistEnumsModule,
    StatementModule,
    TaxFourModule,
    TaxFiveModule,
    PensionPaymentModule,
    WorkerCategoryModule,
    StaffingModule,
    EconomistTelegramModule,
  ],
})
export class EconomistModule {}
