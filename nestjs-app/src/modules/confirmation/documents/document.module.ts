import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import {
  DocumentConfirmationController,
  DocumentController,
  DocumentPublicController,
} from '@/modules/confirmation/documents/document.controller';
import { DocumentService } from '@/modules/confirmation/documents/document.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [
    DocumentConfirmationController,
    DocumentController,
    DocumentPublicController,
  ],
  providers: [DocumentService],
})
export class ConfirmationDocumentModule {}
