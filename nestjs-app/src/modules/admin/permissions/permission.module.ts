import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { PermissionController } from '@/modules/admin/permissions/permission.controller';
import { PermissionService } from '@/modules/admin/permissions/permission.service';

@Module({
  imports: [AuthModule],
  controllers: [PermissionController],
  providers: [PermissionService],
})
export class PermissionAdminModule {}
