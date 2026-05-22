<?php

namespace App\Helpers;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Modules\Structure\Models\Organization;

class QueryHelper
{
    public static function userIds($user)
    {
        $organizationIds = self::childIds($user);

        $organizations = request('organizations');

        return User::query()
            ->select('id')
            ->when($organizations, function ($query, $organizations) {
                $ids = explode(',', $organizations);
                return $query->whereIn('organization_id', $ids);
            })->when($organizationIds, function ($query, $organizationIds) {
                return $query->whereIn('organization_id', $organizationIds);
            });
    }

    public static function childIds($user, $arr = false)
    {
        $userOrganizationId = $user->organization_id;

        if (count($user->getAllPermissions())) {
            if ($user->hasPermissionTo('organization-admin')) {
                if ($arr) {
                    return (new Organization)->pluck('id')->toArray();
                }
                return (new Organization)->select('id');
            }

            if ($user->hasPermissionTo('organization-leader')) {
                if ($arr) {
                    return new self()->organizationChild($user, Organization::query())?->pluck('id')->toArray();
                }
                return new self()->organizationChild($user, Organization::query())?->select('id');
            }

            if ($user->hasPermissionTo('organization')) {
                return $userOrganizationId ? [$userOrganizationId] : [];
            }
        }


        return [$user->organization_id];
        //TODO return [];
    }

    public function organizationChild($user, $matchingNodes): Builder|array|null
    {
        $matchingNodes->descendantsAndSelf($user->organization_id);

        $left = $user->load('organization')->organization->_lft;

        $query = Organization::query();

        $matchingNodes->each(function ($node) use ($query, $left) {
            $query->orWhereBetween('_lft', [max($node->_lft - 1, $left), $node->_rgt]);
        });

        return $query;
    }

    public static function filterByOrganizations($query, $user, array $filters = [])
    {
        $organizationIds = self::childIds($user);
        $organizations = $filters['organizations'] ?? null;
        $organizationId = $filters['organization_id'] ?? null;

        return $query
            ->when($organizationIds, function ($query, $organizationIds) {
                $query->whereIn('organization_id', $organizationIds);
            })
            ->when($organizations, function ($query, $organizations) {
                $ids = explode(',', $organizations);
                return $query->whereIn('organization_id', $ids);
            })
            ->when($organizationId, function ($query, $organizationId) {
                return $query->where('organization_id', $organizationId);
            });
    }

    public static function filterDepartmentByOrganization($query, $user)
    {
        $organizationIds = self::childIds($user);

        $query->when($organizationIds, function ($q, $organizationIds) {
            return $q->whereIn('organization_id', $organizationIds);
        });

        if ($user->hasPermissionTo('organization-leader') ||
            $user->hasPermissionTo('organization-admin')) {
            return $query->when(request('organizations'), function ($q, $organizations) {
                $ids = explode(',', $organizations);
                return $q->whereIn('organization_id', $ids);
            });
        }

        return $query->where('organization_id', $user->organization_id);
    }

    public function adminOrganizations($matchingNodes): Builder|array|null
    {
        $query = Organization::query();

        $matchingNodes->each(function ($node) use ($query) {
            $query->orWhereBetween('_lft', [$node->_lft, $node->_rgt])
                ->orWhereBetween('_lft', [1, $node->_lft - 1]
                )->where('_rgt', '>', $node->_rgt);
        });

        return $query;
    }

    public function adminDepartments($matchingNodes)
    {
        $matchingNodes->each(function ($node) use ($matchingNodes) {
            $matchingNodes
                ->orWhereBetween('_lft', [$node->_lft, $node->_rgt])
                ->orWhereBetween('_lft', [1, $node->_lft - 1])
                ->where('_rgt', '>', $node->_rgt);
        });

        return $matchingNodes;
    }

    public static function escapeLike(string $value): string
    {
        return addcslashes($value, '\%_');
    }

}
