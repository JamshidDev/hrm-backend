<?php

namespace Modules\TimeSheet\Transformers;

use App\Helpers\PositionHelper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Department\DepartmentListResource;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class WorkerPositionTimesheetResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'        => $this->id,
            'worker'    => new WorkerMinimalResource($this->worker),
            'position_name' => PositionHelper::getShortPosition($this),
            'departments' => $this->time_sheet_departments->map(fn($department) => [
                'id' => $department->id,
                'organization' => $department->organization
                    ? new OrganizationListResource($department->organization)
                    : null,
                'department' => $department->department
                    ? new DepartmentListResource($department->department)
                    : null
            ])
        ];
    }
}
