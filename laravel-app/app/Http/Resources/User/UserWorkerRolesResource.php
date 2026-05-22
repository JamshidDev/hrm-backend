<?php

namespace App\Http\Resources\User;

use App\Helpers\UserHelper;
use App\Http\Resources\RoleOrganizationsResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Worker\WorkerInfoResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class UserWorkerRolesResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $rolesWithOrganizations = UserHelper::getRoles($this);

        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'phone' => $this->phone,
            'phones' => $this->worker->phones->pluck('phone')->toArray(),
            'worker' => new WorkerInfoResource($this->worker),
            'current_organization' => new OrganizationListResource($this->organization),
            'roles' => RoleOrganizationsResource::collection($rolesWithOrganizations)
        ];
    }
}
