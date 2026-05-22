<?php

namespace Modules\HR\Transformers\WorkerPosition;

use App\Helpers\PositionHelper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\ProbationEnum;
use Modules\HR\Transformers\Contract\ContractMinResource;
use Modules\HR\Transformers\Department\DepartmentListResource;
use Modules\HR\Transformers\Med\WorkerMedResource;
use Modules\HR\Transformers\Vacation\WorkerVacationResource;
use Modules\HR\Transformers\Worker\WorkerOnlyResource;
use Modules\Structure\Enums\PositionCategoryEnum;
use Modules\Structure\Transformers\Organization\OrganizationListResource;
use Modules\Structure\Transformers\Position\PositionResource;

class WorkerPositionFullResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'worker' => new WorkerOnlyResource($this->worker),
            'organization' => new OrganizationListResource($this->organization),
            'contract' => new ContractMinResource($this->contract),
            'department' => new DepartmentListResource($this->department),
            'position' => new PositionResource($this->position),
            'type' => [
                'id' => $this->type,
                'name' => PositionCategoryEnum::get($this->type)
            ],
            'position_date' => $this->position_date,
            'post_name' => PositionHelper::getFullPosition($this),
            'probation' => [
                'id' => $this->probation,
                'name' => ProbationEnum::get($this->probation, app()->getLocale())
            ],
            'vacation_main_day' => $this->vacation_main_day,
            'additional_vacation_day' => $this->additional_vacation_day,
            'group' => $this->group,
            'rank' => $this->rank,
            'rate' => $this->rate,
            'salary' => '**********',
            'meds' => WorkerMedResource::collection($this->worker->meds),
            'vacations' => WorkerVacationResource::collection($this->worker->vacations),
        ];
    }
}
