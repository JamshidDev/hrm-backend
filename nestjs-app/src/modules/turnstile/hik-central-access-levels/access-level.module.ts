import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { AccessLevelController } from '@/modules/turnstile/hik-central-access-levels/access-level.controller';
import { AccessLevelService } from '@/modules/turnstile/hik-central-access-levels/access-level.service';

@Module({
  imports: [AuthModule],
  controllers: [AccessLevelController],
  providers: [AccessLevelService],
})
export class AccessLevelModule {}
