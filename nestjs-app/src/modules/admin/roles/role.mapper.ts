// Role entity → response DTO mapper. Laravel: RoleResource.

import { RoleItemDto } from '@/modules/admin/roles/dto/role.dto';

export interface RoleRow {
  id: number;
  name: string;
  permissions: { id: number; name: string }[];
}

export const RoleMapper = {
  toItem(this: void, r: RoleRow): RoleItemDto {
    // Laravel Spatie role.permissions order — name ASC bilan mos.
    const sorted = [...r.permissions].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    return {
      id: r.id,
      name: r.name,
      permissions: sorted.map((p) => ({ id: p.id, name: p.name })),
    };
  },
};
