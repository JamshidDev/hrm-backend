<?php

namespace Modules\HR\Transformers\DepartmentPosition;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Economist\Enums\ChangedStatusEnum;
use Modules\Economist\Enums\ConfirmStatusEnum;
use Modules\HR\Enums\EducationEnum;

class DepartmentPositionWithJoinResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'organization' => [
                'id' => $this->organization_id,
                'name' => $this->organization_name,
                'group' => $this->organization_group,
            ],
            'department' => [
                'id' => $this->department_id,
                'name' => $this->department_name,
                'level' => $this->department_level
            ],
            'position' => [
                'id' => $this->position_id,
                'name' => $this->position_name
            ],
            'rate' => $this->rate,
            'worker_rate' => (int)($this->worker_rate / 100),
            'group' => [
                'id' => $this->group,
                'name' => $this->group
            ],
            'rank' => [
                'id' => $this->rank,
                'name' => $this->rank
            ],
            'max_rank' => [
                'id' => $this->max_rank,
                'name' => $this->max_rank
            ],
            'salary' => $this->salary,
            'experience' => $this->experience,
            'education' => [
                'id' => $this->education,
                'name' => EducationEnum::get($this->education)
            ],
            'status' => [
                'id' => $this->status,
                'name' => ConfirmStatusEnum::get($this->status)
            ],
            'changed_status' => [
                'id' => $this->changed_status,
                'name' => ChangedStatusEnum::get($this->changed_status)
            ]
        ];
    }
}
