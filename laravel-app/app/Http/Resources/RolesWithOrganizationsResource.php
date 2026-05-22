<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class RolesWithOrganizationsResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'full_name' => $this->full_name,
            'current' => $this->current
        ];
    }
}
