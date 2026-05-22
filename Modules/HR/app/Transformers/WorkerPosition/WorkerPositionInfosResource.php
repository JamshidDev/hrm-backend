<?php

namespace Modules\HR\Transformers\WorkerPosition;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\ProbationEnum;
use Modules\HR\Transformers\Contract\ContractMinResource;
use Modules\HR\Transformers\Department\DepartmentListResource;
use Modules\HR\Transformers\Worker\WorkerInfoResource;
use Modules\Structure\Enums\PositionCategoryEnum;
use Modules\Structure\Transformers\Organization\OrganizationListResource;
use Modules\Structure\Transformers\Position\PositionResource;
use Modules\Structure\Transformers\Structure\ScheduleResource;

class WorkerPositionInfosResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'worker' => new WorkerInfoResource($this->worker),
            'organization' => new OrganizationListResource($this->organization),
            'contract' => new ContractMinResource($this->contract),
            'department' => new DepartmentListResource($this->department),
            'position' => new PositionResource($this->position),
            'type' => [
                'id' => $this->type,
                'name' => PositionCategoryEnum::get($this->type)
            ],
            'position_date' => $this->position_date,
            'probation' => [
                'id' => $this->probation,
                'name' => ProbationEnum::get($this->probation, app()->getLocale())
            ],
            'schedules' => ScheduleResource::collection($this->schedules),
            'vacation_main_day' => $this->vacation_main_day,
            'additional_vacation_day' => $this->additional_vacation_day,
            'group' => $this->group,
            'rank' => $this->rank,
            'rate' => $this->rate,
            'salary' => $this->salary
        ];
    }
}
