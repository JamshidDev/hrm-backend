import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { AuthenticationLogController } from '@/modules/admin/authentication-logs/authentication-log.controller';
import { AuthenticationLogService } from '@/modules/admin/authentication-logs/authentication-log.service';

@Module({
  imports: [AuthModule],
  controllers: [AuthenticationLogController],
  providers: [AuthenticationLogService],
})
export class AuthenticationLogModule {}
