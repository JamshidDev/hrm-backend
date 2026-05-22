// User extras service. Laravel: UserController qo'shimcha metodlari.
// Asosan stub — real implementatsiya keyin.

import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { RequestContext } from '@/common/context/request.context';
import { users, workers } from '@/db/schema';
import type {
  AccessForAdminDto,
  ChangeCurrentOrganizationDto,
  MarkNotificationsDto,
  NotificationsQueryDto,
  OrganizationHrsQueryDto,
  UpdateOrganizationInfoDto,
  UpdateUserDto,
} from '@/modules/user/extras/dto/extras.dto';

@Injectable()
export class UserExtrasService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
  ) {}

  /** GET /user/me — joriy user + worker brief. */
  async me() {
    const userId = this.ctx.user?.id;
    if (!userId) throw new BusinessException(401, 'unauthorized');
    const [u] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!u) throw new BusinessException(404, 'not_found');
    let worker: {
      id: number;
      last_name: string | null;
      first_name: string | null;
      middle_name: string | null;
      photo: string | null;
    } | null = null;
    if (u.worker_id) {
      const [w] = await this.db
        .select({
          id: workers.id,
          last_name: workers.last_name,
          first_name: workers.first_name,
          middle_name: workers.middle_name,
          photo: workers.photo,
        })
        .from(workers)
        .where(eq(workers.id, u.worker_id))
        .limit(1);
      worker = w ?? null;
    }
    return {
      id: u.id,
      uuid: u.uuid,
      phone: u.phone,
      organization_id: u.organization_id,
      worker,
    };
  }

  /** GET /user/notifications (stub). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async notifications(_q: NotificationsQueryDto) {
    return { data: [], total: 0, stub: true };
  }

  /** POST /user/notifications/mark-read (stub). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async markRead(dto: MarkNotificationsDto) {
    return { success: true, marked: dto.ids.length };
  }

  /** GET /user/roles — joriy user'ning rollari (stub). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async roles() {
    return [];
  }

  /** PUT /user/change-organization — joriy organization'ni o'zgartirish. */
  async changeOrganization(dto: ChangeCurrentOrganizationDto) {
    const userId = this.ctx.user?.id;
    if (!userId) throw new BusinessException(401, 'unauthorized');
    await this.db
      .update(users)
      .set({ organization_id: dto.organization_id, updated_at: sql`NOW()` })
      .where(eq(users.id, userId));
    return { success: true };
  }

  /** PUT /user/update — phone/password update (stub). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async update(_dto: UpdateUserDto) {
    return { success: true, stub: true };
  }

  /** GET /user/organization-info — joriy organization tafsiloti (stub). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async organizationInfo() {
    return { organization: null, stub: true };
  }

  /** PUT /user/organization-info — organization yangilash (stub). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async updateOrganizationInfo(_dto: UpdateOrganizationInfoDto) {
    return { success: true, stub: true };
  }

  /** GET /user/organization-hr — organizationdagi HR'lar (stub). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async organizationHrs(_q: OrganizationHrsQueryDto) {
    return [];
  }

  /** POST /user/access-for-admin — token verify for admin access. */
  // eslint-disable-next-line @typescript-eslint/require-await
  async accessForAdmin(_dto: AccessForAdminDto) {
    return { success: true, stub: true };
  }
}
