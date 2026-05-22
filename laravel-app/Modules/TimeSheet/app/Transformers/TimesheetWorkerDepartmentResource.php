<?php

namespace Modules\TimeSheet\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Department\DepartmentListResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class TimesheetWorkerDepartmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'worker_position' => new TimesheetWorkerPositionResource($this->worker_position),
            'department'      => new DepartmentListResource($this->department),
            'work_place'      => new OrganizationListResource($this->work_place)
        ];
    }
}
