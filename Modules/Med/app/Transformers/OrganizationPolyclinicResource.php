<?php

namespace Modules\Med\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrganizationPolyclinicResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->polyclinic->id,
            'name' => $this->polyclinic->name,
        ];
    }
}
