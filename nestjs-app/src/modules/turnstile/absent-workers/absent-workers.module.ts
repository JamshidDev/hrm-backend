import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { AbsentWorkersController } from '@/modules/turnstile/absent-workers/absent-workers.controller';
import { AbsentWorkersService } from '@/modules/turnstile/absent-workers/absent-workers.service';

@Module({
  imports: [AuthModule],
  controllers: [AbsentWorkersController],
  providers: [AbsentWorkersService],
})
export class AbsentWorkersModule {}
