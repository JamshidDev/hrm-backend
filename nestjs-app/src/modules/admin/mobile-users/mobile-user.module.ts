import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { AdminMobileUserController } from '@/modules/admin/mobile-users/mobile-user.controller';
import { AdminMobileUserService } from '@/modules/admin/mobile-users/mobile-user.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminMobileUserController],
  providers: [AdminMobileUserService],
})
export class AdminMobileUserModule {}
