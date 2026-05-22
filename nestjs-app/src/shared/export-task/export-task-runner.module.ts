// ExportTaskRunnerModule — global, har joydan ExportTaskRunner inject qilish mumkin.
// MinioModule / ExcelModule kabi @Global() pattern.

import { Global, Module } from '@nestjs/common';
import { ExportTaskRunner } from '@/shared/export-task/export-task-runner.service';

@Global()
@Module({
  providers: [ExportTaskRunner],
  exports: [ExportTaskRunner],
})
export class ExportTaskRunnerModule {}
