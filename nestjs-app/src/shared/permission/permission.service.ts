// Spatie laravel-permission ekvivalenti — user permission tekshiruvi.
// Permission = role permissions + direct user permissions (model_has_permissions).

import { Injectable } from '@nestjs/common';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';

@Injectable()
export class PermissionService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  // User'ning barcha permission nomlarini qaytaradi (role + direct, unique).
  async getUserPermissions(userId: number): Promise<Set<string>> {
    const user = await this.db.query.users.findFirst({
      where: { id: userId },
      with: {
        roles: { with: { permissions: { columns: { name: true } } } },
        direct_permissions: { columns: { name: true } },
      },
    });

    const set = new Set<string>();
    if (!user) return set;

    for (const role of user.roles ?? []) {
      for (const p of role.permissions ?? []) set.add(p.name);
    }
    for (const p of user.direct_permissions ?? []) set.add(p.name);

    return set;
  }

  async hasPermission(
    userId: number,
    permissionName: string,
  ): Promise<boolean> {
    const perms = await this.getUserPermissions(userId);
    return perms.has(permissionName);
  }
}
