import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import {
  DocumentApplicationsController,
  DocumentFileController,
} from '@/modules/confirmation/document-files/document-file.controller';
import { DocumentFileService } from '@/modules/confirmation/document-files/document-file.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [DocumentFileController, DocumentApplicationsController],
  providers: [DocumentFileService],
})
export class ConfirmationDocumentFileModule {}
