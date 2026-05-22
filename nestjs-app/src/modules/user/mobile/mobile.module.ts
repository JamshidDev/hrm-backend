import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { UserMobileController } from '@/modules/user/mobile/mobile.controller';
import { UserMobileService } from '@/modules/user/mobile/mobile.service';

@Module({
  imports: [AuthModule],
  controllers: [UserMobileController],
  providers: [UserMobileService],
})
export class UserMobileModule {}
