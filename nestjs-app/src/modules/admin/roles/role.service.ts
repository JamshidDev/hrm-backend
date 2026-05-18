// Role admin service. Laravel: App\Services\RoleService.
// Spatie laravel-permission moslab — roles + role_has_permissions + model_has_roles bilan ishlaydi.

import { Injectable } from '@nestjs/common';
import { eq, ilike } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource, Tx } from '@/db/types';
import { roles, role_has_permissions, model_has_roles } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { paginate } from '@/common/pagination/paginate.util';
import { RoleMapper } from '@/modules/admin/roles/role.mapper';
import type {
  QueryRoleDto,
  CreateRoleDto,
  UpdateRoleDto,
  RoleListResponseDto,
} from '@/modules/admin/roles/dto/role.dto';

@Injectable()
export class RoleService {
  // Laravel: config('auth.defaults.guard') = 'sanctum' (config/auth.php).
  private static readonly GUARD_NAME = 'sanctum';

  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
  ) {}

  async findAll(filters: QueryRoleDto): Promise<RoleListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;

    const where = filters.search
      ? ilike(roles.name, `%${filters.search}%`)
      : undefined;

    return paginate({
      db: this.db,
      countTable: roles,
      countWhere: where,
      query: ({ limit, offset }) =>
        this.db.query.roles.findMany({
          where: filters.search
            ? { name: { ilike: `%${filters.search}%` } }
            : undefined,
          // Laravel Spatie role.permissions default order — name ASC bilan mos.
          with: {
            permissions: {
              columns: { id: true, name: true },
              orderBy: { name: 'asc' },
            },
          },
          orderBy: { id: 'desc' },
          limit,
          offset,
        }),
      page,
      perPage,
      mapper: RoleMapper.toItem,
    });
  }

  async create(dto: CreateRoleDto): Promise<void> {
    // Laravel: name unique tekshiruvi rules'da, lekin biz qo'lda — chunki PG unique constraint xatosi
    // foydalanuvchiga noaniq 500 qaytaradi (uniqueness Spatie'da name+guard_name).
    await this.assertNameUnique(dto.name);

    await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(roles)
        .values({
          name: dto.name,
          guard_name: RoleService.GUARD_NAME,
        })
        .returning({ id: roles.id });

      if (dto.permissions && dto.permissions.length > 0) {
        await this.syncPermissions(tx, created.id, dto.permissions);
      }
    });
  }

  async update(id: number, dto: UpdateRoleDto): Promise<void> {
    const role = await this.db.query.roles.findFirst({
      where: { id },
      columns: { id: true },
    });
    if (!role) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    await this.assertNameUnique(dto.name, id);

    await this.db.transaction(async (tx) => {
      await tx.update(roles).set({ name: dto.name }).where(eq(roles.id, id));

      // Laravel: array_key_exists('permissions', $data) — yuborilgan bo'lsa sync.
      // Bizda ixtiyoriy field. Yuborilgan bo'lsa (undefined emas) sync qilamiz.
      if (dto.permissions !== undefined) {
        await this.syncPermissions(tx, id, dto.permissions);
      }
    });
  }

  async remove(id: number): Promise<void> {
    const role = await this.db.query.roles.findFirst({
      where: { id },
      columns: { id: true },
    });
    if (!role) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    if (await this.hasRelations(id)) {
      throw new BusinessException(403, this.i18n.t('messages.role_related'));
    }

    await this.db.delete(roles).where(eq(roles.id, id));
  }

  // ---- Helper'lar ----

  // Laravel rules: unique:roles,name (update'da current id istisno).
  private async assertNameUnique(
    name: string,
    ignoreId?: number,
  ): Promise<void> {
    const conflict = await this.db.query.roles.findFirst({
      where: ignoreId ? { name, id: { ne: ignoreId } } : { name },
      columns: { id: true },
    });
    if (conflict) {
      throw new BusinessException(422, `The name has already been taken.`);
    }
  }

  // Laravel: $role->syncPermissions($ids) — eski'larni o'chiradi, yangi'larni qo'shadi.
  private async syncPermissions(
    tx: Tx,
    roleId: number,
    permissionIds: number[],
  ): Promise<void> {
    await tx
      .delete(role_has_permissions)
      .where(eq(role_has_permissions.role_id, roleId));

    if (permissionIds.length === 0) return;

    await tx.insert(role_has_permissions).values(
      permissionIds.map((pid) => ({
        role_id: roleId,
        permission_id: pid,
      })),
    );
  }

  // Laravel hasRelations: role.permissions exists OR users with role exists.
  private async hasRelations(roleId: number): Promise<boolean> {
    const [hasPerms] = await this.db
      .select({ id: role_has_permissions.role_id })
      .from(role_has_permissions)
      .where(eq(role_has_permissions.role_id, roleId))
      .limit(1);
    if (hasPerms) return true;

    const [hasUsers] = await this.db
      .select({ id: model_has_roles.role_id })
      .from(model_has_roles)
      .where(eq(model_has_roles.role_id, roleId))
      .limit(1);
    return !!hasUsers;
  }
}
