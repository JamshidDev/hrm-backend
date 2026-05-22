import { Module } from '@nestjs/common';
import { LivenessController } from '@/modules/auth/liveness/liveness.controller';
import { LivenessService } from '@/modules/auth/liveness/liveness.service';

@Module({
  controllers: [LivenessController],
  providers: [LivenessService],
})
export class LivenessModule {}
