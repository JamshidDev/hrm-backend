<?php

namespace Modules\HR\Transformers\DepartmentPosition;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Economist\Enums\ChangedStatusEnum;
use Modules\Economist\Enums\ConfirmStatusEnum;
use Modules\HR\Enums\EducationEnum;
use Modules\HR\Transformers\Department\DepartmentListResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;
use Modules\Structure\Transformers\Position\PositionResource;

class DepartmentPositionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'organization' => new OrganizationListResource($this->organization),
            'department' => new DepartmentListResource($this->department),
            'position' => new PositionResource($this->position),
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
