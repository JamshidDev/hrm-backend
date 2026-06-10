import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import {
  DocumentConfirmationController,
  DocumentController,
  DocumentPublicController,
} from '@/modules/confirmation/documents/document.controller';
import { DocumentService } from '@/modules/confirmation/documents/document.service';
import { CommandModule } from '@/modules/hr/commands/command.module';

@Module({
  imports: [AuthModule, MinioModule, CommandModule],
  controllers: [
    DocumentConfirmationController,
    DocumentController,
    DocumentPublicController,
  ],
  providers: [DocumentService],
})
export class ConfirmationDocumentModule {}
