// Laravel App\Http\Resources\User\UserResource — umumiy quruvchi.
// profile (UserService) va mobile update-password (UserMobileService) shu yerdan oladi.
// X-AUTH-TYPE === 'mobile' bo'lsa face/fcm/notifications maydonlari qo'shiladi.

import { Injectable } from '@nestjs/common';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { MinioService } from '@/shared/minio/minio.service';
import { UserMapper } from '@/modules/user/user.mapper';
import type {
  ProfileResponseDto,
  ProfileRoleDto,
} from '@/modules/user/dto/user.dto';

const USER_TYPE = 'App\\Models\\User';

export type UserResourcePayload = ProfileResponseDto & {
  face?: boolean;
  fcm?: boolean;
  notifications?: boolean;
};

@Injectable()
export class UserResourceService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly minio: MinioService,
  ) {}

  /**
   * Laravel UserResource::toArray. `mobile` bo'lsa (X-AUTH-TYPE: mobile) device
   * bo'yicha face/fcm/notifications qo'shiladi (X-Device-UUID header).
   */
  async build(
    userId: number,
    opts: {
      mobile?: boolean;
      deviceUuid?: string | null;
      // Laravel loadCount('telegram') — profile=true (raqam), changePassword=false (null).
      telegramCount?: boolean;
    } = {},
  ): Promise<UserResourcePayload | null> {
    const user = await this.db.query.users.findFirst({
      where: { id: userId },
      with: {
        worker: {
          columns: {
            id: true,
            photo: true,
            last_name: true,
            first_name: true,
            middle_name: true,
          },
        },
        organization: { columns: { id: true, name: true } },
        user_telegrams: { columns: { id: true } },
      },
    });
    if (!user) return null;

    const role = await this.fetchUserRole(user.id, user.organization_id);
    const photoUrl = user.worker
      ? await this.minio.fileUrl(user.worker.photo)
      : null;

    const base = UserMapper.toProfile({
      user: { id: user.id, uuid: user.uuid, phone: user.phone },
      worker: user.worker,
      workerPhotoUrl: photoUrl,
      organization: user.organization,
      role,
      // Laravel: loadCount qilinmasa telegram_count null (changePassword), aks holda raqam (profile).
      telegramAccount:
        opts.telegramCount === false ? null : user.user_telegrams.length,
    });

    // Laravel: X-AUTH-TYPE === 'mobile' → face/fcm/notifications (UserMobileKey).
    if (opts.mobile) {
      const device = opts.deviceUuid
        ? await this.db.query.user_mobile_keys.findFirst({
            where: {
              user_id: user.id,
              device_uuid: opts.deviceUuid,
            },
          })
        : undefined;
      return {
        ...base,
        face: !!device?.face,
        fcm: !!device?.fcm_token,
        notifications: !!device?.notifications,
      };
    }

    return base;
  }

  // Laravel Helper::userRoleAndPermissions: joriy tashkilotga mos rol, topilmasa
  // birinchi rol (fallback). permissions = direct ∪ role.permissions.
  private async fetchUserRole(
    userId: number,
    orgId: number | null,
  ): Promise<ProfileRoleDto | Record<string, never>> {
    let link =
      orgId != null
        ? await this.db.query.model_has_roles.findFirst({
            where: {
              model_type: USER_TYPE,
              model_id: userId,
              organization_id: orgId,
            },
          })
        : undefined;

    if (!link) {
      link = await this.db.query.model_has_roles.findFirst({
        where: { model_type: USER_TYPE, model_id: userId },
      });
    }
    if (!link) return {};

    const role = await this.db.query.roles.findFirst({
      where: { id: link.role_id },
      with: { permissions: { columns: { id: true, name: true } } },
    });
    if (!role) return {};

    const userWithDirect = await this.db.query.users.findFirst({
      where: { id: userId },
      with: { direct_permissions: { columns: { id: true, name: true } } },
    });

    return {
      id: role.id,
      name: role.name,
      permissions: UserMapper.mergePermissions(
        userWithDirect?.direct_permissions ?? [],
        role.permissions,
      ),
    };
  }
}
