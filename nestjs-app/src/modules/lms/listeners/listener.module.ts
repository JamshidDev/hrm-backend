import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { LmsListenerController } from '@/modules/lms/listeners/listener.controller';
import { LmsListenerService } from '@/modules/lms/listeners/listener.service';

@Module({
  imports: [AuthModule],
  controllers: [LmsListenerController],
  providers: [LmsListenerService],
})
export class LmsListenerModule {}
