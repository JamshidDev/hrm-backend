<?php

namespace App\Services;

use App\Helpers\Helper;
use App\Http\Resources\AdminUserDirectPermissionResource;
use App\Http\Resources\AdminUserResource;
use App\Http\Resources\PaginateResource;
use App\Http\Resources\RoleResource;
use App\Models\User;
use Carbon\Carbon;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class AdminUserService
{
    public function index(array $filters)
    {
        $perPage = $filters['per_page'] ?? 10;
        $organizations = isset($filters['organizations']) ? explode(',', $filters['organizations']) : null;
        $roleId = $filters['role'] ?? null;

        $data = User::query()
            ->with([
                'worker:id,first_name,last_name,middle_name,pin,photo',
                'organization:id,name,name_en,name_ru,group',
                'roles:id,name',
            ])
            ->when($organizations, function ($query, $organizations) {
                $query->whereIn('organization_id', $organizations);
            })
            ->when($roleId, function ($query, $roleId) {
                $query->whereHas('roles', function ($roleQuery) use ($roleId) {
                    $roleQuery->where('id', $roleId);
                });
            })
            ->withCount('permissions')
            ->search()
            ->orderByDesc('id')
            ->paginate($perPage);

        return PaginateResource::make($data, AdminUserResource::class);
    }

    public function directPermissionUsers(array $filters)
    {
        $perPage = $filters['per_page'] ?? 10;
        $organizations = isset($filters['organizations']) ? explode(',', $filters['organizations']) : null;
        $permissionId = $filters['permission_id'] ?? null;

        $data = User::query()
            ->with([
                'worker:id,first_name,last_name,middle_name,pin,photo',
                'organization:id,name,name_en,name_ru,group',
                'roles:id,name',
                'permissions:id,name',
            ])
            ->whereHas('permissions', function ($query) use ($permissionId) {
                $query->when($permissionId, function ($permissionQuery, $permissionId) {
                    $permissionQuery->where('permissions.id', $permissionId);
                });
            })
            ->when($organizations, function ($query, $organizations) {
                $query->whereIn('organization_id', $organizations);
            })
            ->search()
            ->orderByDesc('id')
            ->paginate($perPage);

        return PaginateResource::make($data, AdminUserDirectPermissionResource::class);
    }

    public function block(string $userUuid, array $data): void
    {
        $user = $this->findUserByUuid($userUuid);
        $user->update(['status' => $data['status']]);
        $user->tokens()->delete();
    }

    public function userRoles(string $userUuid): Collection
    {
        $user = $this->findUserByUuid($userUuid);
        $user->load(['roles', 'organizations:id,name']);

        return $user->roles->map(function ($role) use ($user) {
            $organization = $user->organizations->firstWhere('id', $role->pivot->organization_id);

            return [
                'id' => $role->id,
                'name' => $role->name,
                'organization' => [
                    'id' => $organization?->id,
                    'name' => $organization?->name,
                ],
            ];
        })->values();
    }

    public function detachUserRole(string $userUuid, array $data): void
    {
        $user = $this->findUserByUuid($userUuid);

        DB::table('model_has_roles')
            ->where('model_id', $user->id)
            ->where('role_id', $data['role_id'])
            ->where('organization_id', $data['organization_id'])
            ->delete();

        $this->clearPermissionCache($user);
    }

    public function assignRoleToUser(array $data): void
    {
        $user = $this->findUserByUuid($data['uuid']);
        $role = Role::query()->findOrFail($data['role_id']);

        if ($role->name === 'Admin') {
            throw new HttpResponseException(Helper::response(trans('messages.errors.organization_not_allowed_permission'), [], 403));
        }

        $exists = $user->roles()
            ->wherePivot('role_id', $data['role_id'])
            ->wherePivot('organization_id', $data['organization_id'])
            ->exists();

        if (!$exists) {
            $user->roles()->attach($data['role_id'], [
                'organization_id' => $data['organization_id'],
                'model_type' => User::class,
            ]);

            $user->organization_id = $data['organization_id'];
            $user->save();
        }

        $this->clearPermissionCache($user);
    }

    public function roles(array $filters)
    {
        $perPage = $filters['per_page'] ?? 10;

        $data = Role::query()
            ->with('permissions')
            ->paginate($perPage);

        return PaginateResource::make($data, RoleResource::class);
    }

    public function destroy(User $user): void
    {
        $user->delete();
    }

    public function loginAsUser(string $userUuid): string
    {
        $user = $this->findUserByUuid($userUuid);

        return $user->createToken('web')->plainTextToken;
    }

    public function getTokenForAdmin(array $data): array
    {
        $expires = now()->addMinutes(10);
        $payload['expires'] = $expires;
        $payload['token'] = $data['user_uuid'];
        $payload['uuid'] = auth()->user()->uuid;

        return [
            'token' => JWT::encode($payload, config('jwt.secret'), 'HS256'),
        ];
    }

    public function checkTokenForAdmin(array $data): array
    {
        $decoded = JWT::decode($data['token'], new Key(config('jwt.secret'), 'HS256'));

        if (Carbon::parse($decoded->expires)->isPast()) {
            throw new HttpResponseException(Helper::response(trans('messages.token_is_expired'), [], 403));
        }

        $targetUser = User::query()->whereUuid($decoded->token)->first();
        if (!$targetUser || $targetUser->id !== auth()->id()) {
            throw new HttpResponseException(Helper::response(trans('messages.token_is_expired'), [], 403));
        }

        $admin = User::query()->whereUuid($decoded->uuid)->first();

        return [
            'access_token' => $admin?->createToken('web')->plainTextToken,
        ];
    }

    public function userPermissions(string $userUuid): Collection
    {
        $user = $this->findUserByUuid($userUuid);
        $user->load([
            'permissions:id,name',
            'roles.permissions:id,name',
            'organizations:id,name',
        ]);

        $permissions = [];

        foreach ($user->permissions as $permission) {
            $permissions[$permission->id] = [
                'id' => $permission->id,
                'name' => $permission->name,
                'direct' => true,
                'via_role' => false,
                'detachable' => true,
                'roles' => [],
            ];
        }

        foreach ($user->roles as $role) {
            $organization = $user->organizations->firstWhere('id', $role->pivot->organization_id);

            foreach ($role->permissions as $permission) {
                if (!isset($permissions[$permission->id])) {
                    $permissions[$permission->id] = [
                        'id' => $permission->id,
                        'name' => $permission->name,
                        'direct' => false,
                        'via_role' => true,
                        'detachable' => false,
                        'roles' => [],
                    ];
                } else {
                    $permissions[$permission->id]['via_role'] = true;
                    $permissions[$permission->id]['detachable'] = false;
                }

                $permissions[$permission->id]['roles'][] = [
                    'id' => $role->id,
                    'name' => $role->name,
                    'organization' => [
                        'id' => $organization?->id,
                        'name' => $organization?->name,
                    ],
                ];
            }
        }

        return collect($permissions)
            ->map(function ($permission) {
                $permission['roles'] = collect($permission['roles'])
                    ->unique(fn($role) => $role['id'] . '-' . ($role['organization']['id'] ?? ''))
                    ->values();

                return $permission;
            })
            ->sortBy('name')
            ->values();
    }

    public function attachPermission(string $userUuid, array $data): void
    {
        $user = $this->findUserByUuid($userUuid);
        $permissions = Permission::query()
            ->whereIn('id', $data['permission_ids'])
            ->get();

        foreach ($permissions as $permission) {
            if (!$user->hasDirectPermission($permission)) {
                $user->givePermissionTo($permission);
            }
        }

        $this->clearPermissionCache($user);
    }

    public function detachPermission(string $userUuid, array $data): void
    {
        $user = $this->findUserByUuid($userUuid);
        $permissions = Permission::query()
            ->whereIn('id', $data['permission_ids'])
            ->get()
            ->keyBy('id');

        $rolePermissionIds = $user->roles()
            ->whereHas('permissions', function ($query) use ($data) {
                $query->whereIn('permissions.id', $data['permission_ids']);
            })
            ->with(['permissions' => function ($query) use ($data) {
                $query->select('permissions.id', 'permissions.name')
                    ->whereIn('permissions.id', $data['permission_ids']);
            }])
            ->get()
            ->flatMap(fn($role) => $role->permissions->pluck('id'))
            ->unique()
            ->values();

        if ($rolePermissionIds->isNotEmpty()) {
            throw new HttpResponseException(
                Helper::response(trans('messages.permission_detach_forbidden_from_role'), [
                    'permission_ids' => $rolePermissionIds,
                    'permissions' => $rolePermissionIds
                        ->map(fn($id) => [
                            'id' => $id,
                            'name' => $permissions->get($id)?->name,
                        ])
                        ->values(),
                ], 403)
            );
        }

        foreach ($permissions as $permission) {
            if ($user->hasDirectPermission($permission)) {
                $user->revokePermissionTo($permission);
            }
        }

        $this->clearPermissionCache($user);
    }

    private function findUserByUuid(string $userUuid): User
    {
        $user = User::query()->whereUuid($userUuid)->first();

        if (!$user) {
            throw new HttpResponseException(Helper::response(trans('messages.user_not_found'), [], 404));
        }

        return $user;
    }

    private function clearPermissionCache(User $user): void
    {
        Cache::forget('user_permissions_' . $user->id);
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
