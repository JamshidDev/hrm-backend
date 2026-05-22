<?php

namespace Modules\HR\Transformers\Contract;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Enums\ProbationEnum;
use Modules\HR\Transformers\Department\DepartmentListResource;
use Modules\Structure\Enums\PositionCategoryEnum;
use Modules\Structure\Transformers\Organization\OrganizationListResource;
use Modules\Structure\Transformers\Position\PositionResource;

class ContractPositionResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'organization' => new OrganizationListResource($this->organization),
            'department' => new DepartmentListResource($this->department),
            'position' => new PositionResource($this->position),
            'type' => [
                'id' => $this->type,
                'name' => PositionCategoryEnum::get($this->type)
            ],
            'position_date' => $this->position_date,
            'post_name' => $this->post_name,
            'probation' => [
                'id' => $this->probation,
                'name' => ProbationEnum::get($this->probation, app()->getLocale())
            ],
            'vacation_main_day' => $this->vacation_main_day,
            'additional_vacation_day' => $this->additional_vacation_day,
            'group' => $this->group,
            'rank' => $this->rank,
            'rate' => $this->rate,
            'salary' => $this->salary,
            'status' => [
                'id' => $this->status,
                'name' => PositionStatusEnum::get($this->status)
            ]
        ];
    }
}
