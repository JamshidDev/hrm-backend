<?php

namespace Modules\HR\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Modules\HR\Exceptions\HRServiceException;
use Modules\HR\Models\Worker;
use Modules\Structure\Models\Organization;
use Spatie\Permission\Models\Role;

class WorkerRoleService
{
    public function attach(string $uuid, string $roleName, int $organizationId): void
    {
        $profile = $this->resolveProfile($uuid, $organizationId);

        $role = Role::findByName($roleName);
        if ($role->name === 'Admin') {
            throw HRServiceException::permissionDenied(trans('messages.errors.organization_not_allowed_permission'));
        }

        DB::table('model_has_roles')
            ->where('model_id', $profile->id)
            ->where('organization_id', $organizationId)
            ->delete();

        $profile->roles()->attach($role->id, [
            'organization_id' => $organizationId,
            'model_type'      => User::class,
        ]);

        $profile->update(['organization_id' => $organizationId]);
    }

    public function detach(string $uuid, int $organizationId): void
    {
        $profile = $this->resolveProfile($uuid, $organizationId);

        DB::table('model_has_roles')
            ->where('model_id', $profile->id)
            ->where('organization_id', $organizationId)
            ->delete();
    }

    private function resolveProfile(string $uuid, int $organizationId): User
    {
        $user = auth()->user();
        $allowed = Organization::getAllChildrenIds($user->organization_id);

        if (!in_array($organizationId, $allowed, true)) {
            throw HRServiceException::permissionDenied(trans('messages.errors.organization_not_allowed_permission'));
        }

        $worker = Worker::whereUuid($uuid)->firstOrFail();
        return User::where('worker_id', $worker->id)->firstOrFail();
    }
}
