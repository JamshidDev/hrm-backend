// Confirmation aggregator. Laravel: Modules/Confirmation.

import { Module } from '@nestjs/common';
import { ConfirmationsListsModule } from '@/modules/confirmation/confirmations/confirmations.module';
import { ConfirmationDocumentModule } from '@/modules/confirmation/documents/document.module';
import { ConfirmationDocumentFileModule } from '@/modules/confirmation/document-files/document-file.module';
import { ConfirmationDocumentChatModule } from '@/modules/confirmation/document-chat/document-chat.module';
import { ConfirmationSignatureModule } from '@/modules/confirmation/signature/signature.module';
import { ConfirmationDashboardModule } from '@/modules/confirmation/dashboard/dashboard.module';
import { WorkerApplicationExtrasModule } from '@/modules/confirmation/worker-application-extras/worker-application-extras.module';
import { ApplicationConfirmationModule } from '@/modules/confirmation/application-confirmation/application-confirmation.module';

@Module({
  imports: [
    ConfirmationsListsModule,
    ConfirmationDocumentModule,
    ConfirmationDocumentFileModule,
    ConfirmationDocumentChatModule,
    ConfirmationSignatureModule,
    ConfirmationDashboardModule,
    WorkerApplicationExtrasModule,
    ApplicationConfirmationModule,
  ],
})
export class ConfirmationModule {}
