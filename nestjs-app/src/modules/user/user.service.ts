// Profile endpoint logikasi. Laravel: UserService::profile + UserResource.
// UserResource qurish UserResourceService'ga ko'chirilgan (mobile bilan ulashiladi).

import { Injectable } from '@nestjs/common';
import { RequestContext } from '@/common/context/request.context';
import { BusinessException } from '@/common/exceptions/business.exception';
import { UserResourceService } from '@/modules/user/_shared/user-resource.service';
import type { ProfileResponseDto } from '@/modules/user/dto/user.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly ctx: RequestContext,
    private readonly userResource: UserResourceService,
  ) {}

  async profile(): Promise<ProfileResponseDto> {
    const auth = this.ctx.user_or_fail;
    // Laravel UserResource — X-AUTH-TYPE: mobile bo'lsa face/fcm/notifications qo'shiladi.
    const resource = await this.userResource.build(auth.id, {
      mobile: this.ctx.auth_type === 'mobile',
      deviceUuid: this.ctx.device_uuid,
    });
    if (!resource) {
      throw new BusinessException(404, 'User not found');
    }
    return resource;
  }
}
