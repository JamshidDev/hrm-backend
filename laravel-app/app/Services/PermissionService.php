<?php

namespace App\Services;

use App\Helpers\Helper;
use App\Http\Resources\PaginateResource;
use App\Http\Resources\PermissionResource;
use Illuminate\Http\Exceptions\HttpResponseException;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class PermissionService
{
    public function index(array $filters)
    {
        $perPage = $filters['per_page'] ?? 10;
        $search = $filters['search'] ?? null;

        $data = Permission::query()
            ->when($search, function ($query, $search) {
                $query->whereLike('name', "%$search%");
            })
            ->orderByDesc('id')
            ->paginate($perPage);

        return PaginateResource::make($data, PermissionResource::class);
    }

    public function store(array $data): Permission
    {
        $permission = Permission::query()->create([
            'name' => $data['name'],
            'guard_name' => config('auth.defaults.guard'),
        ]);

        $this->forgetPermissionCache();

        return $permission;
    }

    public function update(Permission $permission, array $data): Permission
    {
        $permission->update(['name' => $data['name']]);

        $this->forgetPermissionCache();

        return $permission;
    }

    public function destroy(Permission $permission): void
    {
        if ($permission->roles()->exists()) {
            throw new HttpResponseException(
                Helper::response(trans('messages.permission_related'), [], 403)
            );
        }

        $permission->delete();

        $this->forgetPermissionCache();
    }

    private function forgetPermissionCache(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
