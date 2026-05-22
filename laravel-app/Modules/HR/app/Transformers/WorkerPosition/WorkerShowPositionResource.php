<?php

namespace Modules\HR\Transformers\WorkerPosition;

use App\Helpers\PositionHelper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\ContractTypeEnum;
use Modules\HR\Enums\ProbationEnum;
use Modules\HR\Transformers\Contract\ContractMinimalResource;
use Modules\HR\Transformers\Department\DepartmentListResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;
use Modules\Structure\Transformers\Position\PositionMinimalResource;

class WorkerShowPositionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                      => $this->id,
            'organization'            => new OrganizationListResource($this->organization),
            'contract'                => new ContractMinimalResource($this->contract),
            'department'              => new DepartmentListResource($this->department),
            'position'                => new PositionMinimalResource($this->position),
            'type'                    => [
                'id'   => $this->type,
                'name' => ContractTypeEnum::get($this->type)
            ],
            'position_date'           => $this->position_date,
            'post_name'               => PositionHelper::getFullPosition($this),
            'probation'               => [
                'id'   => $this->probation,
                'name' => ProbationEnum::get($this->probation, app()->getLocale())
            ],
            'vacation_main_day'       => $this->vacation_main_day,
            'additional_vacation_day' => $this->additional_vacation_day,
            'group'                   => $this->group,
            'rank'                    => $this->rank,
            'rate'                    => $this->rate,
            'salary'                  => $this->salary,
            'schedule_id'             => $this->schedule?->schedule_id
        ];
    }
}
