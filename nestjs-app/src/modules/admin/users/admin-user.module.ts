import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { AdminUserController } from '@/modules/admin/users/admin-user.controller';
import { AdminUserAccessController } from '@/modules/admin/users/admin-user-access.controller';
import { AdminUserService } from '@/modules/admin/users/admin-user.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminUserController, AdminUserAccessController],
  providers: [AdminUserService],
})
export class AdminUserModule {}
