// Laravel QueryHelper::childIds ekvivalenti — foydalanuvchi ruxsat etilgan
// organization id larini qaytaradi (permission asosida).
//
//   organization-admin  → barcha o'chirilmagan tashkilotlar
//   organization-leader → o'z tashkiloti subtree'si (NestedSet _lft/_rgt)
//   default             → faqat o'z tashkiloti

import { and, eq, isNull, sql } from 'drizzle-orm';
import type { DataSource } from '@/db/types';
import { organizations } from '@/db/schema';
import type { PermissionService } from '@/shared/permission/permission.service';

export async function resolveOrgScopeIds(
  db: DataSource,
  permissions: PermissionService,
  userId: number,
  orgId: number | null | undefined,
): Promise<number[]> {
  const perms = await permissions.getUserPermissions(userId);

  if (perms.has('organization-admin')) {
    const rows = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(isNull(organizations.deleted_at));
    return rows.map((r) => r.id);
  }

  if (perms.has('organization-leader') && orgId) {
    const [self] = await db
      .select({ lft: organizations._lft, rgt: organizations._rgt })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);
    if (!self) return [orgId];
    const rows = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(
        and(
          isNull(organizations.deleted_at),
          sql`${organizations._lft} BETWEEN ${self.lft} AND ${self.rgt}`,
        ),
      );
    return rows.map((r) => r.id);
  }

  return orgId ? [orgId] : [];
}
