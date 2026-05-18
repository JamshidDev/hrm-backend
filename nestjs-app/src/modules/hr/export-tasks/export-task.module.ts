import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { ExportTaskController } from '@/modules/hr/export-tasks/export-task.controller';
import { ExportTaskService } from '@/modules/hr/export-tasks/export-task.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [ExportTaskController],
  providers: [ExportTaskService],
})
export class ExportTaskModule {}
