import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { TopicFileController } from '@/modules/exam/topic-files/topic-file.controller';
import { TopicFileService } from '@/modules/exam/topic-files/topic-file.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [TopicFileController],
  providers: [TopicFileService],
})
export class TopicFileModule {}
