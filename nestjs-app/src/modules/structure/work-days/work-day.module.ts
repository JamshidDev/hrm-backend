import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { WorkDayController } from '@/modules/structure/work-days/work-day.controller';
import { WorkDayService } from '@/modules/structure/work-days/work-day.service';

@Module({
  imports: [AuthModule],
  controllers: [WorkDayController],
  providers: [WorkDayService],
})
export class WorkDayModule {}
