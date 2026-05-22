<?php

namespace Modules\HR\Transformers\WorkerPosition;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\ContractTypeEnum;
use Modules\HR\Enums\ProbationEnum;
use Modules\HR\Transformers\Contract\ContractMinResource;
use Modules\HR\Transformers\Department\DepartmentListResource;
use Modules\HR\Transformers\Worker\WorkerInfoResource;
use Modules\Structure\Enums\PositionCategoryEnum;
use Modules\Structure\Transformers\Organization\OrganizationListResource;
use Modules\Structure\Transformers\Position\PositionMinimalResource;
use Modules\Structure\Transformers\Position\PositionResource;

class WorkerPositionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                      => $this->id,
            'uuid'                    => $this->uuid,
            'worker'                  => new WorkerInfoResource($this->worker),
            'organization'            => new OrganizationListResource($this->organization),
            'department'              => new DepartmentListResource($this->department),
            'position'                => new PositionMinimalResource($this->position),
            'type'             => [
                'id'   => $this->type,
                'name' => ContractTypeEnum::tryFrom($this->type)?->labelMinimized()
            ],
            'position_date'           => $this->position_date,
            'group'                   => $this->group,
            'rank'                    => $this->rank,
            'rate'                    => $this->rate,
            'salary'                  => $this->salary
        ];
    }
}
