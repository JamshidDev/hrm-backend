import { Global, Module } from '@nestjs/common';
import { PermissionService } from '@/shared/permission/permission.service';

@Global()
@Module({
  providers: [PermissionService],
  exports: [PermissionService],
})
export class PermissionModule {}
