// User profile mapper. Laravel: UserResource + bog'liq sub-resourcelar.

import {
  ProfileResponseDto,
  ProfileWorkerDto,
  ProfileOrganizationDto,
  ProfileRoleDto,
  ProfilePermissionDto,
} from '@/modules/user/dto/user.dto';

export interface ProfileBuilderInput {
  user: {
    id: number;
    uuid: string;
    phone: string | number;
  };
  worker: {
    id: number;
    photo: string | null;
    last_name: string | null;
    first_name: string | null;
    middle_name: string | null;
  } | null;
  workerPhotoUrl: string | null;
  organization: { id: number; name: string | null } | null;
  role: ProfileRoleDto | Record<string, never>;
  // Laravel loadCount('telegram') bo'lsa raqam; aks holda (changePassword) null.
  telegramAccount: number | null;
}

export const UserMapper = {
  toProfile(input: ProfileBuilderInput): ProfileResponseDto {
    return {
      id: input.user.id,
      uuid: input.user.uuid,
      worker: input.worker
        ? {
            id: input.worker.id,
            last_name: input.worker.last_name,
            first_name: input.worker.first_name,
            middle_name: input.worker.middle_name,
            photo: input.workerPhotoUrl,
          }
        : null,
      phone: Number(input.user.phone),
      organization: input.organization
        ? { id: input.organization.id, name: input.organization.name }
        : null,
      role: input.role,
      telegram_account: input.telegramAccount,
    };
  },

  // Spatie permission merge: direct + role, dedupe (direct birinchi).
  mergePermissions(
    direct: { id: number; name: string }[],
    rolePermissions: { id: number; name: string }[],
  ): ProfilePermissionDto[] {
    const merged: ProfilePermissionDto[] = [];
    const seen = new Set<number>();
    for (const p of [...direct, ...rolePermissions]) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      merged.push({ id: p.id, name: p.name });
    }
    return merged;
  },
};

// Re-exports — controller'lar/service'lar shu yerdan oladi.
export type {
  ProfileWorkerDto,
  ProfileOrganizationDto,
  ProfileRoleDto,
  ProfilePermissionDto,
};
