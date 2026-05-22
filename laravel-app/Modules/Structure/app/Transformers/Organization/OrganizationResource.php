<?php

namespace Modules\Structure\Transformers\Organization;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Structure\Transformers\Structure\CityResource;

class OrganizationResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'full_name' => $this->full_name,
            'level' => $this->level,
            'parent_id' => $this->parent_id,
            'city' => new CityResource($this->city),
            'lat' => $this->lat,
            'long' => $this->long,
            'code' => $this->code,
            'descendants' => $this->descendants->count()
        ];
    }
}
