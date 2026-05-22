<?php

namespace App\Http\Resources\UseFul;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrganizationLeadersResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'group' => $this->group,
            'leaders' => LeadersResource::collection($this->leaders),
            'children' => self::collection($this->children)
        ];
    }
}
