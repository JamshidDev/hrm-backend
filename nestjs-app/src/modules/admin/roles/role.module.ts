import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { RoleController } from '@/modules/admin/roles/role.controller';
import { RoleService } from '@/modules/admin/roles/role.service';

@Module({
  imports: [AuthModule],
  controllers: [RoleController],
  providers: [RoleService],
})
export class RoleModule {}
