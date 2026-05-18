// Permission entity → response DTO mapper. Laravel: PermissionResource.

import { PermissionItemDto } from '@/modules/admin/permissions/dto/permission.dto';

export interface PermissionRow {
  id: number;
  name: string;
}

export const PermissionMapper = {
  toItem(this: void, p: PermissionRow): PermissionItemDto {
    return { id: p.id, name: p.name };
  },
};
