<?php

namespace Modules\HR\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Modules\HR\Exceptions\HRServiceException;
use Modules\HR\Models\WorkerPhone;
use Modules\HR\Models\WorkerPosition;
use Modules\Structure\Models\Organization;
use Spatie\Permission\Models\Role;

class WorkerUserService
{
    public function list(array $filters, $user)
    {
        $workerIds = WorkerPosition::filter($user, request()->all())->select('worker_id');
        return User::query()
            ->filter($user, request()->all())
            ->whereIn('worker_id', $workerIds)
            ->with([
                'roles',
                'organizations',
                'organization:id,name,name_en,name_ru,group',
                'worker:id,last_name,first_name,middle_name,birthday,photo,pin',
                'worker.phones'
            ])
            ->when($filters['search'] ?? null, function ($query) {
                $query->whereHas('worker', fn($query) => $query->searchByFullName());
            })
            ->when($filters['role'] ?? null, function ($query, $role) {
                $query->whereHas('roles', function ($q) use ($role) {
                    $q->where('name', $role);
                });
            })
            ->groupBy('id')
            ->paginate($filters['per_page'] ?? 10);
    }

    public function attachRole(string $uuid, int $organizationId, ?string $roleName = null, ?int $roleId = null): void
    {
        $user = $this->resolveUser($uuid, $organizationId);
        $role = $this->resolveRole($roleName, $roleId);

        if ($role->name === 'Admin') {
            throw HRServiceException::permissionDenied(trans('messages.errors.organization_not_allowed_permission'));
        }

        $alreadyAttached = $user->roles()
            ->wherePivot('role_id', $role->id)
            ->wherePivot('organization_id', $organizationId)
            ->exists();

        if (!$alreadyAttached) {
            $user->roles()->attach($role->id, [
                'organization_id' => $organizationId,
                'model_type' => User::class,
            ]);
        }

        $user->update(['organization_id' => $organizationId]);
        $this->clearUserCaches($user);
    }

    public function detachRole(string $uuid, int $organizationId, ?string $roleName = null, ?int $roleId = null): void
    {
        $user = $this->resolveUser($uuid, $organizationId);
        $role = $this->resolveRole($roleName, $roleId);

        if ($role->name === 'Admin') {
            throw HRServiceException::permissionDenied(trans('messages.errors.organization_not_allowed_permission'));
        }

        DB::table('model_has_roles')
            ->where('model_id', $user->id)
            ->where('role_id', $role->id)
            ->where('organization_id', $organizationId)
            ->where('model_type', User::class)
            ->delete();

        $this->clearUserCaches($user);
    }

    public function updatePassword($data): void
    {
        $user = User::query()
            ->with('worker:id,pin')
            ->where('uuid', $data['uuid'])
            ->firstOrFail();

        if (!$user->worker) {
            throw HRServiceException::userNotFound(trans('messages.user_not_found'), 404);
        }

        $user->update([
            'password' => $data['password'] ?? bcrypt($user->worker->pin),
            'password_changed_at' => now()
        ]);

        $this->clearUserCaches($user);
    }

    private function resolveUser(string $uuid, int $organizationId): User
    {
        $allowedOrganizationIds = Organization::getAllChildrenIds(auth()->user()->organization_id);

        if (!in_array($organizationId, $allowedOrganizationIds, true)) {
            throw HRServiceException::permissionDenied(trans('messages.errors.organization_not_allowed_permission'));
        }

        return User::query()
            ->where('uuid', $uuid)
            ->firstOrFail();
    }

    private function resolveRole(?string $roleName = null, ?int $roleId = null): Role
    {
        if ($roleId !== null) {
            return Role::query()->findOrFail($roleId);
        }

        if (!$roleName) {
            throw HRServiceException::validation(trans('validation.required', ['attribute' => 'role']));
        }

        return Role::findByName($roleName);
    }

    private function clearUserCaches(User $user): void
    {
        Cache::forget('user_permissions_' . $user->id);
        Cache::forget('access_level_ids_' . $user->id);
    }

    public function update($data): void
    {
        $user = User::where('uuid', $data['uuid'])->firstOrFail();
        $worker = $user->load('worker')->worker;
        if (!$worker) {
            throw HRServiceException::userNotFound(trans('messages.user_not_found'));
        }
        WorkerPhone::where('worker_id', $worker->id)->forceDelete();
        new WorkerService()->syncPhones($worker, $data['phones']);

        $phone = $data['user_phone'];

        if (User::query()
            ->whereNot('id', $user->id)
            ->where('phone', $phone)
            ->exists()) {
            throw HRServiceException::workerPhoneExists(trans('messages.worker_phone_exists'));
        }
        $user->phone = $phone;
        $user->save();
    }
}
