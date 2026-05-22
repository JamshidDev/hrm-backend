<?php

namespace App\Http\Resources\User;

use App\Helpers\Helper;
use App\Http\Resources\PermissionResource;
use App\Models\UserMobileKey;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Worker\WorkerUserResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $role = Helper::userRoleAndPermissions($this->roles, $this->organization_id);

        $data = [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'worker' => new WorkerUserResource($this->worker),
            'phone' => $this->phone,
            'organization' => new UserOrganizationResource($this->organization),
            'role' => $this->role($role, $this->getDirectPermissions()),
            'telegram_account' => $this->telegram_count
        ];

        if ($request->header('X-AUTH-TYPE') === 'mobile') {
            $device = UserMobileKey::query()
                ->where('user_id', $this->id)
                ->where('device_uuid', $request->header('X-Device-UUID'))
                ->first();
            $data['face'] = (bool)($device?->face ?? false);
            $data['fcm'] = (bool)($device?->fcm_token ?? false);
            $data['notifications'] = (bool)($device?->notifications ?? false);
        }
        return $data;
    }

    private function role($role, $permissions): array
    {
        if (!$role) {
            return [];
        }
        $uniquePermissions = $permissions->concat($role->permissions);
        return [
            'id' => $role->id,
            'name' => $role->name,
            'permissions' => PermissionResource::collection($uniquePermissions),
        ];
    }
}
