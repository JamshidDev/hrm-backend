import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { OrganizationDocumentController } from '@/modules/hr/organization-documents/organization-document.controller';
import { OrganizationDocumentService } from '@/modules/hr/organization-documents/organization-document.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [OrganizationDocumentController],
  providers: [OrganizationDocumentService],
})
export class OrganizationDocumentModule {}
