import { Module } from '@nestjs/common';
import { OnlyOfficeController } from '@/modules/only-office/only-office.controller';
import { OnlyOfficeService } from '@/modules/only-office/only-office.service';

@Module({
  controllers: [OnlyOfficeController],
  providers: [OnlyOfficeService],
})
export class OnlyOfficeModule {}
