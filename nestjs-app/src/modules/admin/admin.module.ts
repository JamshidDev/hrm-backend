// Admin aggregator — Laravel: app/Http/Controllers/Admin/*.

import { Module } from '@nestjs/common';
import { RoleModule } from '@/modules/admin/roles/role.module';
import { PermissionAdminModule } from '@/modules/admin/permissions/permission.module';
import { AdminUserModule } from '@/modules/admin/users/admin-user.module';
import { IntegrationLogModule } from '@/modules/admin/integration-log/integration-log.module';
import { InstructionModule } from '@/modules/admin/instructions/instruction.module';
import { AdminTelegramModule } from '@/modules/admin/telegram/telegram.module';
import { AdminMobileUserModule } from '@/modules/admin/mobile-users/mobile-user.module';
import { DeployModule } from '@/modules/admin/deploy/deploy.module';
import { ActivityLogModule } from '@/modules/admin/activity-logs/activity-log.module';

@Module({
  imports: [
    RoleModule,
    PermissionAdminModule,
    AdminUserModule,
    IntegrationLogModule,
    InstructionModule,
    AdminTelegramModule,
    AdminMobileUserModule,
    DeployModule,
    ActivityLogModule,
  ],
})
export class AdminModule {}
