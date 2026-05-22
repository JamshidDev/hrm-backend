import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { LmsMainController } from '@/modules/lms/main/main.controller';
import { LmsMainService } from '@/modules/lms/main/main.service';

@Module({
  imports: [AuthModule],
  controllers: [LmsMainController],
  providers: [LmsMainService],
})
export class LmsMainModule {}
