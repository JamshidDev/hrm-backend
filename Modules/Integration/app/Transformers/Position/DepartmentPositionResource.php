<?php

namespace Modules\Integration\Transformers\Position;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Department\DepartmentListResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;
use Modules\Structure\Transformers\Position\PositionMinimalResource;

class DepartmentPositionResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'organization' => new OrganizationListResource($this->organization),
            'department'   => new DepartmentListResource($this->department),
            'position'     => new PositionMinimalResource($this->position)
        ];
    }
}
