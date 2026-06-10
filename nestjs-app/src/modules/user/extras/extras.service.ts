// User extras service. Laravel: UserController qo'shimcha metodlari.
// Asosan stub — real implementatsiya keyin.

import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { and, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { RequestContext } from '@/common/context/request.context';
import {
  notifications,
  users,
  workers,
  organizations,
  cities,
  regions,
  model_has_roles,
  roles,
} from '@/db/schema';
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

  // Laravel: UserController::notifications (UserService::notifications).
  //
  // Behavior:
  //   - `?count`  parametri MAVJUDLIGI yetarli → faqat COUNT qaytariladi (number).
  //   - `?read_at` mavjudligi → faqat o'qilmaganlar (`read_at IS NULL`).
  //   - `?search=...` → data->>'title' yoki data->>'message' ILIKE.
  //   - Aks holda paginatsiyalangan list (NotificationsResource shape):
  //       { id, data, read_at, created_at (Y-m-d H:i:s) }
  //
  // Notifications jadvali Laravel notify pattern: notifiable_type='App\Models\User',
  // notifiable_id=user.id.
  async notifications(q: NotificationsQueryDto) {
    const userId = this.ctx.user?.id;
    if (!userId) throw new BusinessException(401, 'unauthorized');

    const NOTIFIABLE_USER = 'App\\Models\\User';
    const conds: any[] = [
      eq(notifications.notifiable_type, NOTIFIABLE_USER),
      eq(notifications.notifiable_id, userId),
    ];

    // `?read_at` parameter mavjudligi → faqat o'qilmaganlar.
    if (q.read_at !== undefined) {
      conds.push(isNull(notifications.read_at));
    }

    // `?search` → JSON `data->>'title'` yoki `data->>'message'` ILIKE.
    if (q.search?.trim()) {
      const s = `%${q.search.trim()}%`;
      conds.push(
        sql`(COALESCE(${notifications.data}->>'title', '') ILIKE ${s}
          OR COALESCE(${notifications.data}->>'message', '') ILIKE ${s})`,
      );
    }

    const where = and(...conds);

    // `?count` mavjudligi → faqat son qaytariladi (number sifatida).
    if (q.count !== undefined) {
      const [{ total }] = await this.db
        .select({ total: count() })
        .from(notifications)
        .where(where);
      return Number(total);
    }

    // Paginated list.
    const page = Math.max(1, Number(q.page ?? 1));
    const perPage = Math.max(1, Math.min(1000, Number(q.per_page ?? 10)));
    const offset = (page - 1) * perPage;

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: notifications.id,
          data: notifications.data,
          read_at: notifications.read_at,
          created_at: notifications.created_at,
        })
        .from(notifications)
        .where(where)
        .orderBy(desc(notifications.created_at))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(notifications).where(where),
    ]);

    return {
      current_page: page,
      total: Number(total),
      data: rows.map((r) => ({
        id: r.id,
        data: r.data,
        read_at: r.read_at,
        created_at: laravelTs(r.created_at),
      })),
    };
  }

  // Laravel: UserController::markAsReadNotifications.
  //   - `all=true` → barcha unread notifications uchun `read_at=NOW()`.
  //   - Aks holda `ids: string[]` → faqat shu id'lar uchun.
  async markRead(dto: MarkNotificationsDto) {
    const userId = this.ctx.user?.id;
    if (!userId) throw new BusinessException(401, 'unauthorized');

    const NOTIFIABLE_USER = 'App\\Models\\User';
    const baseCond = and(
      eq(notifications.notifiable_type, NOTIFIABLE_USER),
      eq(notifications.notifiable_id, userId),
      isNull(notifications.read_at),
    );

    if (dto.all) {
      const res = await this.db
        .update(notifications)
        .set({ read_at: sql`NOW()` })
        .where(baseCond);
      return { success: true, marked: (res as any).rowCount ?? 0 };
    }

    const ids = (dto.ids ?? []).filter(
      (s) => typeof s === 'string' && s.length,
    );
    if (!ids.length) return { success: true, marked: 0 };

    const res = await this.db
      .update(notifications)
      .set({ read_at: sql`NOW()` })
      .where(and(baseCond, inArray(notifications.id, ids)));
    return { success: true, marked: (res as any).rowCount ?? 0 };
  }

  /**
   * GET /user/roles — Laravel UserService::rolesWithOrganizations →
   * UserHelper::getRoles → UserRolesWithOrganizationsResource:
   * [{id, name (XOM role nomi), organizations:[{id, name, full_name, current}]}].
   * (extra/users RoleOrganizationsResource'dan farqi: name enum label EMAS, xom.)
   */
  async roles() {
    const userId = this.ctx.user?.id;
    if (!userId) return [];
    const currentOrgId = this.ctx.user?.organization_id ?? null;

    const mhr = await this.db
      .select({
        role_id: roles.id,
        role_name: roles.name,
        org_id: organizations.id,
        org_name: organizations.name,
        org_full_name: organizations.full_name,
      })
      .from(model_has_roles)
      .innerJoin(roles, eq(roles.id, model_has_roles.role_id))
      .innerJoin(
        organizations,
        eq(organizations.id, model_has_roles.organization_id),
      )
      .where(eq(model_has_roles.model_id, userId));

    // UserHelper::getRoles — (org, role) juftlarini role_id bo'yicha guruhlash.
    const grouped = new Map<
      number,
      {
        id: number;
        name: string | null;
        organizations: {
          id: number;
          name: string | null;
          full_name: string | null;
          current: boolean;
        }[];
      }
    >();
    for (const m of mhr) {
      let entry = grouped.get(m.role_id);
      if (!entry) {
        entry = { id: m.role_id, name: m.role_name, organizations: [] };
        grouped.set(m.role_id, entry);
      }
      entry.organizations.push({
        id: m.org_id,
        name: m.org_name,
        full_name: m.org_full_name,
        current: m.org_id === currentOrgId,
      });
    }
    return [...grouped.values()];
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

  /**
   * PUT /user/update — Laravel UserService::updateProfile.
   * Parol berilsa: joriy parolni qayta ishlatishni taqiqlaydi, yangisini
   * bcrypt (rounds=12) bilan saqlaydi va `password_changed_at`ni now() qiladi.
   * Bu maydonsiz login har safar parol yangilashni so'rardi (30 kun sharti).
   */
  async update(dto: UpdateUserDto): Promise<void> {
    if (!dto.password) return;

    const userId = this.ctx.user_or_fail.id;
    const [u] = await this.db
      .select({ password: users.password })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // Laravel: Hash::check(new, current) → bir xil bo'lsa rad etadi.
    if (u?.password && (await bcrypt.compare(dto.password, u.password))) {
      throw new BusinessException(400, 'You cannot reuse current password');
    }

    const hashed = await bcrypt.hash(dto.password, 12);
    await this.db
      .update(users)
      .set({
        password: hashed,
        password_changed_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      })
      .where(eq(users.id, userId));
  }

  /** GET /user/organization-info — joriy organization tafsiloti (stub). */
  /**
   * GET /user/organization-info — Laravel UserService::organizationInfo →
   * UserOrganizationEditResource(user.organization): {id, command_name
   * (command_address ?? city.name), address, city (CityResource)}.
   */
  async organizationInfo() {
    const orgId = this.ctx.user?.organization_id;
    if (!orgId) return null; // Laravel new Resource(null) → null.

    const [org] = await this.db
      .select({
        id: organizations.id,
        command_address: organizations.command_address,
        address: organizations.address,
        city_id: organizations.city_id,
      })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);
    if (!org) return null;

    // city (CityResource) + region (RegionMinimalResource {id, name}).
    let city: Record<string, unknown> | null = null;
    if (org.city_id) {
      const [c] = await this.db
        .select({
          id: cities.id,
          region_id: cities.region_id,
          name: cities.name,
          name_ru: cities.name_ru,
          name_en: cities.name_en,
          lat: cities.lat,
          long: cities.long,
        })
        .from(cities)
        .where(eq(cities.id, org.city_id))
        .limit(1);
      if (c) {
        let region: { id: number; name: string | null } | null = null;
        if (c.region_id) {
          const [r] = await this.db
            .select({ id: regions.id, name: regions.name })
            .from(regions)
            .where(eq(regions.id, c.region_id))
            .limit(1);
          region = r ? { id: r.id, name: r.name } : null;
        }
        city = {
          id: c.id,
          region,
          name: c.name,
          name_ru: c.name_ru,
          name_en: c.name_en,
          lat: c.lat,
          long: c.long,
        };
      }
    }

    return {
      id: org.id,
      command_name: org.command_address ?? city?.name ?? null,
      address: org.address,
      city,
    };
  }

  /** PUT /user/organization-info — Laravel: org command_address/city_id/address yangilash. */
  async updateOrganizationInfo(dto: UpdateOrganizationInfoDto): Promise<void> {
    const orgId = this.ctx.user_or_fail.organization_id;
    if (!orgId) {
      throw new BusinessException(404, 'organization_not_found');
    }
    await this.db
      .update(organizations)
      .set({
        command_address: dto.command_address,
        city_id: dto.city_id,
        address: dto.address,
        updated_at: sql`NOW()`,
      })
      .where(eq(organizations.id, orgId));
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

// Carbon ::toDateTimeString() parity → "Y-m-d H:i:s".
function laravelTs(value: string | Date | null): string | null {
  if (value == null) return null;
  const s = typeof value === 'string' ? value : value.toISOString();
  // 'YYYY-MM-DDTHH:MM:SS...' → 'YYYY-MM-DD HH:MM:SS'
  return s.slice(0, 19).replace('T', ' ');
}
