// Admin user management service. Laravel: App\Services\AdminUserService.

import { Injectable } from '@nestjs/common';
import { eq, and, inArray, ilike, count, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  users,
  organizations,
  roles,
  permissions,
  model_has_roles,
  model_has_permissions,
  role_has_permissions,
  personal_access_tokens,
  workers,
} from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import { ExcelService } from '@/shared/excel/excel.service';
import { paginate } from '@/common/pagination/paginate.util';
import { SanctumService } from '@/modules/auth/sanctum.service';
import { buildWorkerSearchCond } from '@/modules/hr/_shared/worker-search.helper';
import {
  AdminUserMapper,
  type UserPermissionItem,
} from '@/modules/admin/users/admin-user.mapper';
import type {
  QueryAdminUserRoleDto,
  AssignAdminUserRoleDto,
  AttachAdminUserPermissionDto,
  BlockAdminUserDto,
  CheckAdminUserTokenDto,
  DetachAdminUserPermissionDto,
  DetachAdminUserRoleDto,
  QueryAdminUserDirectPermissionDto,
  AdminUserDirectPermissionListResponseDto,
  GenerateAdminUserTokenDto,
  QueryAdminUserDto,
  AdminUserListResponseDto,
} from '@/modules/admin/users/dto/admin-user.dto';

const USER_TYPE = 'App\\Models\\User';

@Injectable()
export class AdminUserService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly config: ConfigService,
    private readonly minio: MinioService,
    private readonly sanctum: SanctumService,
    private readonly ctx: RequestContext,
    private readonly excel: ExcelService,
  ) {}

  // GET /admin/wrong-worker-pins — Laravel ToDoController::wrongWorkerPins.
  // Faol (status=2) xodimlardan noto'g'ri PIN'lilarni Excel qilib qaytaradi:
  //   pin NULL, yoki uzunligi < 13, yoki PIN'ning 2..7-belgilari tug'ilgan sana
  //   (DDMMYY) bilan mos kelmaydi. Org-scope YO'Q (Laravel ham qo'llamaydi).
  async wrongWorkerPins(): Promise<{ buffer: Buffer; filename: string }> {
    const lang = this.ctx.lang;
    const result = await this.db.execute(sql`
      SELECT
        CONCAT_WS(' ', w.last_name, w.first_name, w.middle_name) AS full_name,
        o.name AS organization_name,
        d.name AS department_name,
        p.name AS position_name,
        w.pin,
        TO_CHAR(w.birthday, 'DD.MM.YYYY') AS birthday
      FROM worker_positions wp
      JOIN workers w ON w.id = wp.worker_id
      LEFT JOIN organizations o ON o.id = wp.organization_id
      LEFT JOIN departments d ON d.id = wp.department_id
      LEFT JOIN positions p ON p.id = wp.position_id
      WHERE wp.status = 2
        AND wp.deleted_at IS NULL
        AND w.deleted_at IS NULL
        AND (
          w.pin IS NULL
          OR LENGTH(w.pin::text) < 13
          OR SUBSTRING(w.pin::text FROM 2 FOR 6) <> TO_CHAR(w.birthday, 'DDMMYY')
        )
      ORDER BY o.name, full_name
    `);
    const raw = result as { rows?: Record<string, unknown>[] };
    const rows = Array.isArray(raw.rows)
      ? raw.rows
      : (result as Record<string, unknown>[]);

    // Laravel DynamicExportFromArray heading: trans("messages.worker.{key}"),
    // tarjima bo'lmasa — xom kalit (department_name/position_name shunday qoladi).
    const heading = (key: string): string => {
      const path = `messages.worker.${key}`;
      const v = this.i18n.t(path, { lang });
      return typeof v === 'string' && v !== path ? v : key;
    };
    const cols = [
      'full_name',
      'organization_name',
      'department_name',
      'position_name',
      'pin',
      'birthday',
    ];

    const buffer = await this.excel.build({
      creator: 'HRM',
      sheets: [
        {
          name: 'worker',
          columns: cols.map((key) => ({
            header: heading(key),
            key,
            width: 25,
          })),
          rows: rows.map((r) => ({
            full_name: r.full_name ?? '',
            organization_name: r.organization_name ?? null,
            department_name: r.department_name ?? null,
            position_name: r.position_name ?? null,
            pin: r.pin ?? null,
            birthday: r.birthday ?? null,
          })),
        },
      ],
    });
    return { buffer, filename: 'wrong_worker_pins.xlsx' };
  }

  async findAll(filters: QueryAdminUserDto): Promise<AdminUserListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;

    const orgIds = filters.organizations
      ? filters.organizations
          .split(',')
          .map((s) => Number(s.trim()))
          .filter(Boolean)
      : null;
    const search = filters.search?.trim();

    const lang = this.ctx.lang;

    // Laravel User::scopeSearch — OR ichida quyidagi shartlar:
    //   1) whereHas('worker', searchByFullName) — last/first/middle/pin/card terms.
    //   2) orWhereLike('phone', "%$search%") — phone CAST(TEXT) ILIKE.
    //   3) whereHas('roles', whereLike('name', "%$search%")) — role nomi.
    // Builder API'da OR EXISTS qilish murakkab — avval mos user_id'larni
    // har bir manbadan toplab, birlashtirib so'ng filterga qo'yamiz.
    let searchUserIds: number[] | null = null;
    if (search) {
      const setIds = new Set<number>();

      // 1) Worker search (Worker::scopeSearchByFullName parity).
      const workerCond = buildWorkerSearchCond(search);
      if (workerCond) {
        const workerMatches = await this.db
          .select({ id: users.id })
          .from(users)
          .innerJoin(workers, eq(workers.id, users.worker_id))
          .where(workerCond);
        for (const m of workerMatches) setIds.add(m.id);
      }

      // 2) Phone like.
      const phoneMatches = await this.db
        .select({ id: users.id })
        .from(users)
        .where(ilike(sql`CAST(${users.phone} AS TEXT)`, `%${search}%`));
      for (const m of phoneMatches) setIds.add(m.id);

      // 3) Role name like — model_has_roles → roles.name ILIKE.
      const roleMatches = await this.db
        .select({ id: model_has_roles.model_id })
        .from(model_has_roles)
        .innerJoin(roles, eq(roles.id, model_has_roles.role_id))
        .where(
          and(
            eq(model_has_roles.model_type, USER_TYPE),
            ilike(roles.name, `%${search}%`),
          ),
        );
      for (const m of roleMatches) setIds.add(m.id);

      searchUserIds = [...setIds];
      if (searchUserIds.length === 0) {
        return { current_page: page, total: 0, data: [] };
      }
    }

    // Role filtri (Laravel: whereHas('roles', id=$roleId)) — model_has_roles'dan
    // shu rolga ega userlar.
    let roleUserIds: number[] | null = null;
    if (filters.role != null) {
      const matches = await this.db
        .select({ id: model_has_roles.model_id })
        .from(model_has_roles)
        .where(
          and(
            eq(model_has_roles.role_id, filters.role),
            eq(model_has_roles.model_type, USER_TYPE),
          ),
        );
      roleUserIds = [...new Set(matches.map((m) => m.id))];
      if (roleUserIds.length === 0) {
        return { current_page: page, total: 0, data: [] };
      }
    }

    // Search + role IDlarini birlashtirish (ikkalasi ham bo'lsa — kesishma).
    let filterIds: number[] | null = null;
    if (searchUserIds && roleUserIds) {
      const roleSet = new Set(roleUserIds);
      filterIds = searchUserIds.filter((id) => roleSet.has(id));
      if (filterIds.length === 0) {
        return { current_page: page, total: 0, data: [] };
      }
    } else {
      filterIds = searchUserIds ?? roleUserIds;
    }

    // Paginate util — count + list parallel.
    const result = await paginate({
      db: this.db,
      countTable: users,
      countWhere: this.buildUserCountWhere(orgIds, filterIds),
      query: ({ limit, offset }) =>
        this.db.query.users.findMany({
          where: this.buildUserWhere(orgIds, filterIds),
          with: {
            worker: {
              columns: {
                id: true,
                first_name: true,
                last_name: true,
                middle_name: true,
                pin: true,
                photo: true,
              },
            },
            organization: {
              columns: {
                id: true,
                name: true,
                name_en: true,
                name_ru: true,
                group: true,
              },
            },
            roles: { columns: { id: true, name: true } },
          },
          orderBy: { id: 'desc' },
          limit,
          offset,
        }),
      page,
      perPage,
      // Mapper async ishlatib bo'lmaydi (paginate sync), shuning uchun raw qaytaramiz va keyin map.
      mapper: (u) => u,
    });

    // permissions_count + photo URL — har user uchun parallel.
    const userIds = result.data.map((u) => u.id);
    const permCounts = await this.fetchPermissionCounts(userIds);

    const data = await Promise.all(
      result.data.map(async (u) =>
        AdminUserMapper.toItem({
          user: u,
          workerPhotoUrl: u.worker
            ? await this.minio.fileUrl(u.worker.photo)
            : null,
          permissionsCount: permCounts[u.id] ?? 0,
          lang,
        }),
      ),
    );

    return {
      current_page: result.current_page,
      total: result.total,
      data,
    };
  }

  async findAllWithDirectPermissions(
    filters: QueryAdminUserDirectPermissionDto,
  ): Promise<AdminUserDirectPermissionListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;

    const orgIds = filters.organizations
      ? filters.organizations
          .split(',')
          .map((s) => Number(s.trim()))
          .filter(Boolean)
      : null;
    const search = filters.search?.trim();

    // Faqat direct permissioni bor user'lar (model_has_permissions).
    const directUserIdsRows = await this.db
      .selectDistinct({ id: model_has_permissions.model_id })
      .from(model_has_permissions)
      .where(
        and(
          eq(model_has_permissions.model_type, USER_TYPE),
          filters.permission_id
            ? eq(model_has_permissions.permission_id, filters.permission_id)
            : undefined,
        ),
      );
    const directUserIds = directUserIdsRows.map((r) => r.id);

    if (directUserIds.length === 0) {
      return { current_page: page, total: 0, data: [] };
    }

    const userList = await this.db.query.users.findMany({
      where: {
        id: { in: directUserIds },
        ...(orgIds ? { organization_id: { in: orgIds } } : {}),
        ...(search ? { phone: { ilike: `%${search}%` } as never } : {}),
      },
      with: {
        worker: {
          columns: {
            id: true,
            first_name: true,
            last_name: true,
            middle_name: true,
            photo: true,
          },
        },
        organization: {
          columns: {
            id: true,
            name: true,
            name_en: true,
            name_ru: true,
            group: true,
          },
        },
        roles: { columns: { id: true, name: true } },
        direct_permissions: { columns: { id: true, name: true } },
      },
      orderBy: { id: 'desc' },
      limit: perPage,
      offset: (page - 1) * perPage,
    });

    const lang = this.ctx.lang;
    const data = await Promise.all(
      userList.map(async (u) =>
        AdminUserMapper.toDirectPermissionItem({
          user: u,
          workerPhotoUrl: u.worker
            ? await this.minio.fileUrl(u.worker.photo)
            : null,
          lang,
        }),
      ),
    );

    return {
      current_page: page,
      total: directUserIds.length,
      data,
    };
  }

  async block(uuid: string, dto: BlockAdminUserDto): Promise<void> {
    const user = await this.findUserByUuid(uuid);

    await this.db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ status: dto.status })
        .where(eq(users.id, user.id));
      // Bloklanganda barcha tokenlarni o'chirish.
      await tx
        .delete(personal_access_tokens)
        .where(
          and(
            eq(personal_access_tokens.tokenable_type, USER_TYPE),
            eq(personal_access_tokens.tokenable_id, user.id),
          ),
        );
    });
  }

  async remove(id: number): Promise<void> {
    const user = await this.db.query.users.findFirst({
      where: { id },
      columns: { id: true },
    });
    if (!user) {
      throw new BusinessException(404, this.i18n.t('messages.user_not_found'));
    }
    await this.db.delete(users).where(eq(users.id, id));
  }

  async getUserRoles(uuid: string) {
    const user = await this.findUserByUuid(uuid);

    const rows = await this.db
      .select({
        role_id: roles.id,
        role_name: roles.name,
        org_id: organizations.id,
        org_name: organizations.name,
      })
      .from(model_has_roles)
      .innerJoin(roles, eq(model_has_roles.role_id, roles.id))
      .leftJoin(
        organizations,
        eq(model_has_roles.organization_id, organizations.id),
      )
      .where(
        and(
          eq(model_has_roles.model_type, USER_TYPE),
          eq(model_has_roles.model_id, user.id),
        ),
      );

    return rows.map((r) => ({
      id: r.role_id,
      name: r.role_name,
      organization: { id: r.org_id ?? null, name: r.org_name ?? null },
    }));
  }

  async detachUserRole(
    uuid: string,
    dto: DetachAdminUserRoleDto,
  ): Promise<void> {
    const user = await this.findUserByUuid(uuid);

    await this.db
      .delete(model_has_roles)
      .where(
        and(
          eq(model_has_roles.model_id, user.id),
          eq(model_has_roles.role_id, dto.role_id),
          eq(model_has_roles.organization_id, dto.organization_id),
        ),
      );
  }

  async assignRoleToUser(dto: AssignAdminUserRoleDto): Promise<void> {
    const user = await this.findUserByUuid(dto.uuid);

    const role = await this.db.query.roles.findFirst({
      where: { id: dto.role_id },
      columns: { id: true, name: true },
    });
    if (!role) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    if (role.name === 'Admin') {
      throw new BusinessException(
        403,
        this.i18n.t('messages.errors.organization_not_allowed_permission'),
      );
    }

    const existing = await this.db.query.model_has_roles.findFirst({
      where: {
        model_type: USER_TYPE,
        model_id: user.id,
        role_id: dto.role_id,
        organization_id: dto.organization_id,
      },
    });

    if (!existing) {
      await this.db.transaction(async (tx) => {
        await tx.insert(model_has_roles).values({
          model_type: USER_TYPE,
          model_id: user.id,
          role_id: dto.role_id,
          organization_id: dto.organization_id,
        });
        await tx
          .update(users)
          .set({ organization_id: dto.organization_id })
          .where(eq(users.id, user.id));
      });
    }
  }

  async getRoles(filters: QueryAdminUserRoleDto) {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;

    return paginate({
      db: this.db,
      countTable: roles,
      countWhere: undefined,
      query: ({ limit, offset }) =>
        this.db.query.roles.findMany({
          with: { permissions: { columns: { id: true, name: true } } },
          limit,
          offset,
        }),
      page,
      perPage,
      mapper: (r) => ({
        id: r.id,
        name: r.name,
        permissions: r.permissions.map((p) => ({ id: p.id, name: p.name })),
      }),
    });
  }

  async loginAsUser(
    uuid: string,
  ): Promise<{ access_token: string; message: string }> {
    const user = await this.findUserByUuid(uuid);
    const accessToken = await this.sanctum.createToken(user.id, 'web');
    return {
      access_token: accessToken,
      message: this.i18n.t('auth.login_success'),
    };
  }

  getTokenForAdmin(dto: GenerateAdminUserTokenDto): { token: string } {
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const adminUuid = this.ctx.user_or_fail.uuid;
    const secret = this.config.get<string>('JWT_SECRET') ?? 'dev-secret';

    const token = jwt.sign(
      { expires, token: dto.user_uuid, uuid: adminUuid },
      secret,
      { algorithm: 'HS256' },
    );
    return { token };
  }

  async checkTokenForAdmin(
    dto: CheckAdminUserTokenDto,
  ): Promise<{ access_token: string }> {
    const secret = this.config.get<string>('JWT_SECRET') ?? 'dev-secret';

    let payload: { expires?: string; token?: string; uuid?: string };
    try {
      payload = jwt.verify(dto.token, secret, {
        algorithms: ['HS256'],
      }) as never;
    } catch {
      throw new BusinessException(
        403,
        this.i18n.t('messages.token_is_expired'),
      );
    }

    if (!payload.expires || new Date(payload.expires) < new Date()) {
      throw new BusinessException(
        403,
        this.i18n.t('messages.token_is_expired'),
      );
    }

    const target = payload.token
      ? await this.db.query.users.findFirst({
          where: { uuid: payload.token },
          columns: { id: true },
        })
      : null;
    if (!target || target.id !== this.ctx.user_or_fail.id) {
      throw new BusinessException(
        403,
        this.i18n.t('messages.token_is_expired'),
      );
    }

    const admin = payload.uuid
      ? await this.db.query.users.findFirst({
          where: { uuid: payload.uuid },
          columns: { id: true },
        })
      : null;

    if (!admin) {
      throw new BusinessException(404, this.i18n.t('messages.user_not_found'));
    }
    const accessToken = await this.sanctum.createToken(admin.id, 'web');
    return { access_token: accessToken };
  }

  // Combined permissions: direct + via roles, dedupe + group by role/org.
  async getUserPermissions(uuid: string): Promise<UserPermissionItem[]> {
    const user = await this.findUserByUuid(uuid);

    // 1. Direct permissions.
    const directRows = await this.db
      .select({ id: permissions.id, name: permissions.name })
      .from(model_has_permissions)
      .innerJoin(
        permissions,
        eq(model_has_permissions.permission_id, permissions.id),
      )
      .where(
        and(
          eq(model_has_permissions.model_type, USER_TYPE),
          eq(model_has_permissions.model_id, user.id),
        ),
      );

    // 2. User roles (with organization).
    const userRoleRows = await this.db
      .select({
        role_id: roles.id,
        role_name: roles.name,
        org_id: organizations.id,
        org_name: organizations.name,
      })
      .from(model_has_roles)
      .innerJoin(roles, eq(model_has_roles.role_id, roles.id))
      .leftJoin(
        organizations,
        eq(model_has_roles.organization_id, organizations.id),
      )
      .where(
        and(
          eq(model_has_roles.model_type, USER_TYPE),
          eq(model_has_roles.model_id, user.id),
        ),
      );

    // 3. Permissions via roles.
    const roleIds = [...new Set(userRoleRows.map((r) => r.role_id))];
    const rolePermRows = roleIds.length
      ? await this.db
          .select({
            role_id: role_has_permissions.role_id,
            perm_id: permissions.id,
            perm_name: permissions.name,
          })
          .from(role_has_permissions)
          .innerJoin(
            permissions,
            eq(role_has_permissions.permission_id, permissions.id),
          )
          .where(inArray(role_has_permissions.role_id, roleIds))
      : [];

    // 4. Build map: permission_id → { id, name, direct, via_role, detachable, roles[] }
    const map = new Map<number, UserPermissionItem>();

    // Direct
    for (const p of directRows) {
      map.set(p.id, {
        id: p.id,
        name: p.name,
        direct: true,
        via_role: false,
        detachable: true,
        roles: [],
      });
    }

    // Via roles (group by role+org)
    for (const rp of rolePermRows) {
      const role = userRoleRows.find((r) => r.role_id === rp.role_id);
      if (!role) continue;

      const item = map.get(rp.perm_id);
      if (!item) {
        map.set(rp.perm_id, {
          id: rp.perm_id,
          name: rp.perm_name,
          direct: false,
          via_role: true,
          detachable: false,
          roles: [
            {
              id: role.role_id,
              name: role.role_name,
              organization: {
                id: role.org_id ?? null,
                name: role.org_name ?? null,
              },
            },
          ],
        });
      } else {
        item.via_role = true;
        item.detachable = false;
        item.roles.push({
          id: role.role_id,
          name: role.role_name,
          organization: {
            id: role.org_id ?? null,
            name: role.org_name ?? null,
          },
        });
      }
    }

    // 5. Unique role+org per permission, sort by name.
    const result = Array.from(map.values())
      .map((p) => {
        const seen = new Set<string>();
        const uniqueRoles = p.roles.filter((r) => {
          const key = `${r.id}-${r.organization.id ?? ''}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        return { ...p, roles: uniqueRoles };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }

  async attachPermission(
    uuid: string,
    dto: AttachAdminUserPermissionDto,
  ): Promise<void> {
    const user = await this.findUserByUuid(uuid);

    // Mavjud direct permissionlarni topib, faqat yangi'larni qo'shamiz.
    const existing = await this.db
      .select({ permission_id: model_has_permissions.permission_id })
      .from(model_has_permissions)
      .where(
        and(
          eq(model_has_permissions.model_type, USER_TYPE),
          eq(model_has_permissions.model_id, user.id),
          inArray(model_has_permissions.permission_id, dto.permission_ids),
        ),
      );
    const existingIds = new Set(existing.map((e) => e.permission_id));
    const toInsert = dto.permission_ids.filter((id) => !existingIds.has(id));

    if (toInsert.length > 0) {
      await this.db.insert(model_has_permissions).values(
        toInsert.map((pid) => ({
          permission_id: pid,
          model_type: USER_TYPE,
          model_id: user.id,
        })),
      );
    }
  }

  async detachPermission(
    uuid: string,
    dto: DetachAdminUserPermissionDto,
  ): Promise<void> {
    const user = await this.findUserByUuid(uuid);

    // Role orqali biriktirilgan permissionlarni alohida olib tashlab bo'lmaydi.
    const userRoleIds = await this.db
      .select({ role_id: model_has_roles.role_id })
      .from(model_has_roles)
      .where(
        and(
          eq(model_has_roles.model_type, USER_TYPE),
          eq(model_has_roles.model_id, user.id),
        ),
      );

    const blockedPerms =
      userRoleIds.length > 0
        ? await this.db
            .select({ id: permissions.id, name: permissions.name })
            .from(role_has_permissions)
            .innerJoin(
              permissions,
              eq(role_has_permissions.permission_id, permissions.id),
            )
            .where(
              and(
                inArray(
                  role_has_permissions.role_id,
                  userRoleIds.map((r) => r.role_id),
                ),
                inArray(role_has_permissions.permission_id, dto.permission_ids),
              ),
            )
        : [];

    if (blockedPerms.length > 0) {
      const uniqueIds = [...new Set(blockedPerms.map((p) => p.id))];
      throw new BusinessException(
        403,
        this.i18n.t('messages.permission_detach_forbidden_from_role'),
        {
          permission_ids: uniqueIds,
          permissions: uniqueIds.map((id) => ({
            id,
            name: blockedPerms.find((p) => p.id === id)?.name ?? null,
          })),
        },
      );
    }

    // Direct permissionlarni o'chiramiz.
    await this.db
      .delete(model_has_permissions)
      .where(
        and(
          eq(model_has_permissions.model_type, USER_TYPE),
          eq(model_has_permissions.model_id, user.id),
          inArray(model_has_permissions.permission_id, dto.permission_ids),
        ),
      );
  }

  // ---- Helper'lar ----

  private async findUserByUuid(
    uuid: string,
  ): Promise<{ id: number; uuid: string }> {
    const user = await this.db.query.users.findFirst({
      where: { uuid },
      columns: { id: true, uuid: true },
    });
    if (!user) {
      throw new BusinessException(404, this.i18n.t('messages.user_not_found'));
    }
    return user;
  }

  private async fetchPermissionCounts(
    userIds: number[],
  ): Promise<Record<number, number>> {
    const result: Record<number, number> = {};
    if (userIds.length === 0) return result;

    const rows = await this.db
      .select({
        model_id: model_has_permissions.model_id,
        c: count(),
      })
      .from(model_has_permissions)
      .where(
        and(
          eq(model_has_permissions.model_type, USER_TYPE),
          inArray(model_has_permissions.model_id, userIds),
        ),
      )
      .groupBy(model_has_permissions.model_id);

    for (const r of rows) result[r.model_id] = Number(r.c);
    return result;
  }

  private buildUserWhere(
    orgIds: number[] | null,
    userIds: number[] | null,
  ): Record<string, unknown> | undefined {
    const conditions: Record<string, unknown> = {};
    if (orgIds && orgIds.length > 0) {
      conditions.organization_id = { in: orgIds };
    }
    // search (phone ilike) + role (model_has_roles) → user_ids `findAll` ichida
    // birlashtiriladi va bu yerga `userIds` sifatida keladi.
    if (userIds && userIds.length > 0) {
      conditions.id = { in: userIds };
    }
    if (Object.keys(conditions).length === 0) return undefined;
    return conditions;
  }

  private buildUserCountWhere(
    orgIds: number[] | null,
    userIds: number[] | null,
  ) {
    const parts: ReturnType<typeof eq>[] = [];
    if (orgIds && orgIds.length > 0) {
      parts.push(inArray(users.organization_id, orgIds));
    }
    if (userIds && userIds.length > 0) {
      parts.push(inArray(users.id, userIds));
    }
    if (parts.length === 0) return undefined;
    return parts.length === 1 ? parts[0] : and(...parts);
  }
}
