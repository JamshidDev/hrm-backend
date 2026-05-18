import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { DocumentChatController } from '@/modules/confirmation/document-chat/document-chat.controller';
import { DocumentChatService } from '@/modules/confirmation/document-chat/document-chat.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [DocumentChatController],
  providers: [DocumentChatService],
})
export class ConfirmationDocumentChatModule {}
