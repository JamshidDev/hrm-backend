<?php

namespace Modules\HR\Transformers\Dashboard;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Department\DepartmentListResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;
use Modules\Structure\Transformers\Position\PositionMinimalResource;

class WorkersByEducationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'worker' => new WorkerInfoResource($this->worker),
            'organization' => new OrganizationListResource($this->organization),
            'department' => new DepartmentListResource($this->department),
            'position' => new PositionMinimalResource($this->position),
            'universities' => WorkerUniversityResource::collection($this->worker->universities)
        ];
    }
}
