<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Worker\WorkerUserResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class AdminUserDirectPermissionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'worker' => new WorkerUserResource($this->worker),
            'phone' => $this->phone,
            'organization' => new OrganizationListResource($this->organization),
            'status' => $this->status,
            'roles' => $this->roles->map(function ($role) {
                return [
                    'id' => $role->id,
                    'name' => $role->name,
                ];
            }),
            'permissions' => PermissionResource::collection($this->permissions),
        ];
    }
}