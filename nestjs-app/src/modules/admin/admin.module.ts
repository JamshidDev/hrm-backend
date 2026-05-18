// Admin aggregator — Laravel: app/Http/Controllers/Admin/*.

import { Module } from '@nestjs/common';
import { RoleModule } from '@/modules/admin/roles/role.module';
import { PermissionAdminModule } from '@/modules/admin/permissions/permission.module';
import { AdminUserModule } from '@/modules/admin/users/admin-user.module';

@Module({
  imports: [RoleModule, PermissionAdminModule, AdminUserModule],
})
export class AdminModule {}
