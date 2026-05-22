<?php

namespace App\Http\Resources\User;

use App\Helpers\UserHelper;
use App\Http\Resources\RoleOrganizationsResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserRolesResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $rolesWithOrganizations = UserHelper::getRoles($this);

        return [
            'id'    => $this->id,
            'uuid'  => $this->uuid,
            'phone' => $this->phone,
            'roles' => RoleOrganizationsResource::collection($rolesWithOrganizations)
        ];
    }
}
