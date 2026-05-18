import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { SyncController } from '@/modules/turnstile/hik-central-sync/sync.controller';
import { SyncService } from '@/modules/turnstile/hik-central-sync/sync.service';

@Module({
  imports: [AuthModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
