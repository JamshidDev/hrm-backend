<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Structure\Enums\RolesEnum;

class RoleOrganizationsResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        $enum = RolesEnum::tryFrom($this->name);
        if (!$enum && $this->id !== 3) {
            $enum = $this->name;
        } else {
            $enum = $enum?->label();
        }
        return [
            'id' => $this->id,
            'name' => $enum,
            'organizations' => RolesWithOrganizationsResource::collection($this->organizations)
        ];
    }
}
