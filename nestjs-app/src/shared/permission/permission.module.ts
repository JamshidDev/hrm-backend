import { Global, Module } from '@nestjs/common';
import { PermissionService } from '@/shared/permission/permission.service';
import { OrgScopeService } from '@/common/database/org-scope.service';

@Global()
@Module({
  providers: [PermissionService, OrgScopeService],
  exports: [PermissionService, OrgScopeService],
})
export class PermissionModule {}
