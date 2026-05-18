import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { ApproveAlController } from '@/modules/turnstile/hik-central-approve-al/approve-al.controller';
import { ApproveAlService } from '@/modules/turnstile/hik-central-approve-al/approve-al.service';

@Module({
  imports: [AuthModule],
  controllers: [ApproveAlController],
  providers: [ApproveAlService],
})
export class ApproveAlModule {}
