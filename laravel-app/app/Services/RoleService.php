<?php

namespace App\Services;

use App\Helpers\Helper;
use App\Http\Resources\PaginateResource;
use App\Http\Resources\RoleResource;
use App\Models\User;
use Illuminate\Http\Exceptions\HttpResponseException;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleService
{
    public function index(array $filters)
    {
        $perPage = $filters['per_page'] ?? 10;
        $search = $filters['search'] ?? null;

        $data = Role::query()
            ->with('permissions')
            ->when($search, function ($query, $search) {
                $query->whereLike('name', "%$search%");
            })
            ->orderByDesc('id')
            ->paginate($perPage);

        return PaginateResource::make($data, RoleResource::class);
    }

    public function store(array $data): Role
    {
        $role = Role::query()->create([
            'name' => $data['name'],
            'guard_name' => config('auth.defaults.guard'),
        ]);

        if (!empty($data['permissions'])) {
            $role->syncPermissions($data['permissions']);
        }

        $this->forgetPermissionCache();

        return $role;
    }

    public function update(Role $role, array $data): Role
    {
        $role->update(['name' => $data['name']]);

        if (array_key_exists('permissions', $data)) {
            $role->syncPermissions($data['permissions'] ?? []);
        }

        $this->forgetPermissionCache();

        return $role;
    }

    public function destroy(Role $role): void
    {
        if ($this->hasRelations($role)) {
            throw new HttpResponseException(
                Helper::response(trans('messages.role_related'), [], 403)
            );
        }

        $role->delete();

        $this->forgetPermissionCache();
    }

    private function hasRelations(Role $role): bool
    {
        if ($role->permissions()->exists()) {
            return true;
        }

        return User::query()
            ->whereHas('roles', function ($query) use ($role) {
                $query->where('roles.id', $role->id);
            })
            ->exists();
    }

    private function forgetPermissionCache(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
