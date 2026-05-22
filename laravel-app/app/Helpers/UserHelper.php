<?php

namespace App\Helpers;

use Illuminate\Support\Collection;
use Modules\Structure\Models\Organization;

class UserHelper
{
    public static function getRoles($user): Collection
    {
        $organizations = $user->organizations;
        $currentOrganizationId = $user->organization_id;

        $grouped = collect();

        foreach ($organizations as $organization) {
            $roleId = $organization->pivot->role_id;
            $role = $user->roles->firstWhere('id', $roleId);

            if (!$grouped->has($roleId)) {
                $grouped->put($roleId, clone $role);
                $grouped[$roleId]->organizations = collect();
            }

            $organization->current = $organization->id === $currentOrganizationId;
            $grouped[$roleId]->organizations->push($organization);
        }

        return $grouped->values();
    }

    public static function userOrgIds($user): array
    {
        $userOrganizationId = $user->organization_id;
        $org = $user->organization;

        if (count($user->getAllPermissions())) {
            if ($user->hasPermissionTo('organization-admin')) {
                return (new Organization)->pluck('id')->toArray();
            }

            if ($user->hasPermissionTo('organization-leader')) {
                return Organization::query()
                    ->where('lft', '>=', $org->lft)
                    ->where('rgt', '<=', $org->rgt)
                    ->pluck('id')
                    ->toArray();
            }
        }
        return $userOrganizationId ? [$userOrganizationId] : [];
    }

    public static function validateOrgIds($user, $orgIds): array
    {
        $userOrgIds = self::userOrgIds($user);

        if (is_array($orgIds)) {
            return array_values(array_intersect($orgIds, $userOrgIds));
        }

        if ($orgIds && in_array($orgIds, $userOrgIds, true)) {
            return [$orgIds];
        }
        return [];
    }
}
