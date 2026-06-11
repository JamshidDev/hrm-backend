// UserResourceService'ni profile (UserModule) va mobile (UserMobileModule) bilan ulashish.
// MinioModule global, shuning uchun qo'shimcha import shart emas.

import { Module } from '@nestjs/common';
import { UserResourceService } from '@/modules/user/_shared/user-resource.service';

@Module({
  providers: [UserResourceService],
  exports: [UserResourceService],
})
export class UserResourceModule {}
