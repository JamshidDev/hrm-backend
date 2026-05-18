// Admin user mapper. Laravel: AdminUserResource + AdminUserDirectPermissionResource +
// AdminUserRoleResource + AdminUserPermissionsResource.

import {
  AdminUserItemDto,
  AdminUserDirectPermissionItemDto,
  AdminWorkerInfoDto,
  AdminOrganizationInfoDto,
  AdminUserRoleItemDto,
} from '@/modules/admin/users/dto/admin-user.dto';

// ---- Sub-shape interfaces ----

export interface WorkerLite {
  id: number;
  photo: string | null;
  last_name: string | null;
  first_name: string | null;
  middle_name: string | null;
}

export interface OrganizationLite {
  id: number;
  name: string | null;
  name_ru: string | null;
  name_en: string | null;
  group: boolean;
}

export interface RoleLite {
  id: number;
  name: string;
}

export interface PermissionLite {
  id: number;
  name: string;
}

// ---- Helpers ----

// Locale tanlash — Laravel Helper::translate() ekvivalenti.
function localizedName(
  name: string | null,
  nameRu: string | null,
  nameEn: string | null,
  lang: string,
): string | null {
  if (lang === 'ru') return nameRu ?? name;
  if (lang === 'en') return nameEn ?? name;
  return name;
}

function toWorker(
  worker: WorkerLite | null,
  photoUrl: string | null,
): AdminWorkerInfoDto | null {
  if (!worker) return null;
  return {
    id: worker.id,
    photo: photoUrl,
    last_name: worker.last_name,
    first_name: worker.first_name,
    middle_name: worker.middle_name,
  };
}

function toOrg(
  org: OrganizationLite | null,
  lang: string,
): AdminOrganizationInfoDto | null {
  if (!org) return null;
  return {
    id: org.id,
    name: localizedName(org.name, org.name_ru, org.name_en, lang),
    group: org.group,
  };
}

function toRoles(roles: RoleLite[]): AdminUserRoleItemDto[] {
  return roles.map((r) => ({ id: r.id, name: r.name }));
}

// ---- Mapper exports ----

export const AdminUserMapper = {
  // AdminUserResource
  toItem(input: {
    user: {
      id: number;
      uuid: string;
      phone: string | number;
      password_changed_at: string | null;
      status: boolean;
      worker: WorkerLite | null;
      organization: OrganizationLite | null;
      roles: RoleLite[];
    };
    workerPhotoUrl: string | null;
    permissionsCount: number;
    lang: string;
  }): AdminUserItemDto {
    const u = input.user;
    return {
      id: u.id,
      uuid: u.uuid,
      worker: toWorker(u.worker, input.workerPhotoUrl),
      phone: Number(u.phone),
      password_changed_at: u.password_changed_at,
      organization: toOrg(u.organization, input.lang),
      status: u.status,
      permissions_count: input.permissionsCount,
      roles: toRoles(u.roles),
    };
  },

  // AdminUserDirectPermissionResource
  toDirectPermissionItem(input: {
    user: {
      id: number;
      uuid: string;
      phone: string | number;
      status: boolean;
      worker: WorkerLite | null;
      organization: OrganizationLite | null;
      roles: RoleLite[];
      direct_permissions: PermissionLite[];
    };
    workerPhotoUrl: string | null;
    lang: string;
  }): AdminUserDirectPermissionItemDto {
    const u = input.user;
    return {
      id: u.id,
      uuid: u.uuid,
      worker: toWorker(u.worker, input.workerPhotoUrl),
      phone: Number(u.phone),
      organization: toOrg(u.organization, input.lang),
      status: u.status,
      roles: toRoles(u.roles),
      permissions: u.direct_permissions.map((p) => ({
        id: p.id,
        name: p.name,
      })),
    };
  },
};

// User permissions response item — combined direct + via roles
export interface UserPermissionItem {
  id: number;
  name: string;
  direct: boolean;
  via_role: boolean;
  detachable: boolean;
  roles: Array<{
    id: number;
    name: string;
    organization: { id: number | null; name: string | null };
  }>;
}
