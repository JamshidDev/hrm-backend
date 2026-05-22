<?php

namespace Modules\Turnstile\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class OrganizationTerminalResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'group' => $this->group,
            'children' => self::collection($this->children),
            'terminals_count' => $this->terminals_count
        ];
    }
}
