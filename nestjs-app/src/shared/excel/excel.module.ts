// ExcelModule — global module, har joydan ExcelService.inject() qilish mumkin.
// MinioModule kabi @Global() pattern.

import { Global, Module } from '@nestjs/common';
import { ExcelService } from '@/shared/excel/excel.service';

@Global()
@Module({
  providers: [ExcelService],
  exports: [ExcelService],
})
export class ExcelModule {}
