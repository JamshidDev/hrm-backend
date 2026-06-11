// Profile endpoint logikasi. Laravel: UserService::profile + UserResource.
// Drizzle relational API (db.query.X) — bitta query'da preload qilamiz.

import { Injectable } from '@nestjs/common';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { MinioService } from '@/shared/minio/minio.service';
import { RequestContext } from '@/common/context/request.context';
import { BusinessException } from '@/common/exceptions/business.exception';
import { UserMapper } from '@/modules/user/user.mapper';
import type {
  ProfileResponseDto,
  ProfileRoleDto,
} from '@/modules/user/dto/user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly minio: MinioService,
    private readonly ctx: RequestContext,
  ) {}

  async profile(): Promise<ProfileResponseDto> {
    const auth = this.ctx.user_or_fail;

    // User + worker + organization + telegram bog'liq jadvallarni bitta query'da.
    const user = await this.db.query.users.findFirst({
      where: { id: auth.id },
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
        organization: {
          columns: { id: true, name: true },
        },
        user_telegrams: {
          columns: { id: true },
        },
      },
    });

    if (!user) {
      throw new BusinessException(404, 'User not found');
    }

    const role = await this.fetchUserRole(auth.id, auth.organization_id);
    const photoUrl = user.worker
      ? await this.minio.fileUrl(user.worker.photo)
      : null;

    return UserMapper.toProfile({
      user: { id: user.id, uuid: user.uuid, phone: user.phone },
      worker: user.worker,
      workerPhotoUrl: photoUrl,
      organization: user.organization,
      role,
      telegramAccountCount: user.user_telegrams.length,
    });
  }

  // Spatie role + role/direct permissionlar birlashmasi (hozirgi tashkilot uchun).
  // organization_id filter Spatie pivot column'ida — shuning uchun model_has_roles'dan boshlaymiz.
  private async fetchUserRole(
    userId: number,
    orgId: number | null,
  ): Promise<ProfileRoleDto | Record<string, never>> {
    // Laravel Helper::userRoleAndPermissions: joriy tashkilotga mos rolni qidiradi,
    // topilmasa $roles->first() ga qaytadi (fallback). orgId yo'q bo'lsa ham
    // foydalanuvchining birinchi roli olinadi.
    let link =
      orgId != null
        ? await this.db.query.model_has_roles.findFirst({
            where: {
              model_type: 'App\\Models\\User',
              model_id: userId,
              organization_id: orgId,
            },
          })
        : undefined;

    // Fallback — mos org-rol yo'q: foydalanuvchining birinchi roli.
    if (!link) {
      link = await this.db.query.model_has_roles.findFirst({
        where: {
          model_type: 'App\\Models\\User',
          model_id: userId,
        },
      });
    }
    if (!link) return {};

    const role = await this.db.query.roles.findFirst({
      where: { id: link.role_id },
      with: { permissions: { columns: { id: true, name: true } } },
    });
    if (!role) return {};

    // User'ning direct permissionlari (Spatie model_has_permissions).
    const userWithDirect = await this.db.query.users.findFirst({
      where: { id: userId },
      with: { direct_permissions: { columns: { id: true, name: true } } },
    });

    return {
      id: role.id,
      name: role.name,
      // Mapper Spatie merge: direct + role, dedupe (direct birinchi).
      permissions: UserMapper.mergePermissions(
        userWithDirect?.direct_permissions ?? [],
        role.permissions,
      ),
    };
  }
}
