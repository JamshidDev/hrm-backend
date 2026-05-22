<?php

namespace Modules\Integration\Transformers\Position;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Department\DepartmentListResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;
use Modules\Structure\Transformers\Position\PositionMinimalResource;

class PositionResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'position'     => new PositionMinimalResource($this->position)
        ];
    }
}
