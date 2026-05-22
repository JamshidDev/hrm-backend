<?php

namespace App\Http\Resources\User;

use App\Http\Resources\RolesWithOrganizationsResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserRolesWithOrganizationsResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'organizations' => RolesWithOrganizationsResource::collection($this->organizations)
        ];
    }
}
