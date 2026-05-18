import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { HolidayController } from '@/modules/structure/holidays/holiday.controller';
import { HolidayService } from '@/modules/structure/holidays/holiday.service';

@Module({
  imports: [AuthModule],
  controllers: [HolidayController],
  providers: [HolidayService],
})
export class HolidayModule {}
