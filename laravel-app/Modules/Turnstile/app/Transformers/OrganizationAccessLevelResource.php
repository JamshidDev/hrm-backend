<?php

namespace Modules\Turnstile\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrganizationAccessLevelResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'group' => $this->group,
            'children' => self::collection($this->children),
            'access_levels' => AccessLevelMinResource::collection($this->access_levels)
        ];
    }
}
