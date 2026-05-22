<?php

namespace Modules\HR\Transformers\DepartmentLocation;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\DepartmentLevelEnum;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class DepartmentLocationListResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'level' => [
                'id' => $this->level,
                'name' => DepartmentLevelEnum::get($this->level) ?? ''
            ],
            'organization' => new OrganizationListResource($this->organization),
            'children' => $this->children_exists,
            'location' => $this->locations_exists
        ];
    }
}
