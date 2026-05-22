<?php

namespace Modules\Integration\Transformers\Position;

use App\Helpers\PositionHelper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Department\DepartmentListResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class WorkerPositionResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id'                  => $this->id,
            'organization'        => new OrganizationListResource($this->organization),
            'department'          => new DepartmentListResource($this->department),
            'department_position' => new PositionResource($this->department_position),
            'post_name' => PositionHelper::getFullPosition($this),
            'worker' => new WorkerResource($this->worker),
            'position_date' => $this->position_date,
            'status' => $this->status
        ];
    }
}
