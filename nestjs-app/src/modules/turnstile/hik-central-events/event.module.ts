import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { EventController } from '@/modules/turnstile/hik-central-events/event.controller';
import { EventService } from '@/modules/turnstile/hik-central-events/event.service';

@Module({
  imports: [AuthModule],
  controllers: [EventController],
  providers: [EventService],
})
export class EventModule {}
