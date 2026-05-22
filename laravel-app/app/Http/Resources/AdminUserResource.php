<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Worker\WorkerUserResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class AdminUserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'worker' => new WorkerUserResource($this->worker),
            'phone' => $this->phone,
            'password_changed_at' => $this->password_changed_at,
            'organization' => new OrganizationListResource($this->organization),
            'status' => $this->status,
            'permissions_count' => $this->permissions_count,
            'roles' => $this->roles->map(function ($role) {
                return [
                    'id' => $role->id,
                    'name' => $role->name,
                ];
            })
        ];
    }
}
