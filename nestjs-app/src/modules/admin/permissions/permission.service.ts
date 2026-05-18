// Permission admin service. Laravel: App\Services\PermissionService.
// Spatie laravel-permission moslab — permissions + role_has_permissions bilan ishlaydi.

import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { permissions, role_has_permissions } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { paginate } from '@/common/pagination/paginate.util';
import { PermissionMapper } from '@/modules/admin/permissions/permission.mapper';
import type {
  QueryPermissionDto,
  CreatePermissionDto,
  UpdatePermissionDto,
  PermissionListResponseDto,
} from '@/modules/admin/permissions/dto/permission.dto';
import { ilike } from 'drizzle-orm';

@Injectable()
export class PermissionService {
  // Laravel: config('auth.defaults.guard') = 'sanctum'.
  private static readonly GUARD_NAME = 'sanctum';

  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
  ) {}

  async findAll(
    filters: QueryPermissionDto,
  ): Promise<PermissionListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;

    const where = filters.search
      ? ilike(permissions.name, `%${filters.search}%`)
      : undefined;

    return paginate({
      db: this.db,
      countTable: permissions,
      countWhere: where,
      query: ({ limit, offset }) =>
        this.db.query.permissions.findMany({
          where: filters.search
            ? { name: { ilike: `%${filters.search}%` } }
            : undefined,
          columns: { id: true, name: true },
          orderBy: { id: 'desc' },
          limit,
          offset,
        }),
      page,
      perPage,
      mapper: PermissionMapper.toItem,
    });
  }

  async create(dto: CreatePermissionDto): Promise<void> {
    await this.assertNameUnique(dto.name);

    await this.db.insert(permissions).values({
      name: dto.name,
      guard_name: PermissionService.GUARD_NAME,
    });
  }

  async update(id: number, dto: UpdatePermissionDto): Promise<void> {
    const existing = await this.db.query.permissions.findFirst({
      where: { id },
      columns: { id: true },
    });
    if (!existing) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    await this.assertNameUnique(dto.name, id);

    await this.db
      .update(permissions)
      .set({ name: dto.name })
      .where(eq(permissions.id, id));
  }

  async remove(id: number): Promise<void> {
    const existing = await this.db.query.permissions.findFirst({
      where: { id },
      columns: { id: true },
    });
    if (!existing) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    // Laravel: $permission->roles()->exists() — biror role'ga biriktirilganmi.
    const [linked] = await this.db
      .select({ id: role_has_permissions.permission_id })
      .from(role_has_permissions)
      .where(eq(role_has_permissions.permission_id, id))
      .limit(1);

    if (linked) {
      throw new BusinessException(
        403,
        this.i18n.t('messages.permission_related'),
      );
    }

    await this.db.delete(permissions).where(eq(permissions.id, id));
  }

  // ---- Helper'lar ----

  // Laravel rules: unique:permissions,name (update'da current id istisno).
  private async assertNameUnique(
    name: string,
    ignoreId?: number,
  ): Promise<void> {
    const conflict = await this.db.query.permissions.findFirst({
      where: ignoreId ? { name, id: { ne: ignoreId } } : { name },
      columns: { id: true },
    });
    if (conflict) {
      throw new BusinessException(422, 'The name has already been taken.');
    }
  }
}
