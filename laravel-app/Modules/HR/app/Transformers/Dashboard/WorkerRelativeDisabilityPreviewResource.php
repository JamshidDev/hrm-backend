<?php

namespace Modules\HR\Transformers\Dashboard;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\ContractTypeEnum;
use Modules\HR\Enums\RelativeEnum;
use Modules\HR\Transformers\Department\DepartmentListResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;
use Modules\Structure\Transformers\Position\PositionMinimalResource;

class WorkerRelativeDisabilityPreviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $worker = $this->workerRelative?->worker;
        $workerPosition = $worker?->position;

        return [
            'id' => $this->id,
            'worker' => new WorkerInfoResource($worker),
            'organization' => new OrganizationListResource($workerPosition?->organization),
            'department' => new DepartmentListResource($workerPosition?->department),
            'position' => new PositionMinimalResource($workerPosition?->position),
            'contract_type' => $workerPosition?->type ? ContractTypeEnum::get($workerPosition->type) : null,
            'relative' => [
                'id' => $this->workerRelative?->id,
                'relative' => $this->workerRelative?->relative,
                'relative_name' => $this->workerRelative?->relative ? RelativeEnum::get($this->workerRelative->relative) : null,
                'last_name' => $this->workerRelative?->last_name,
                'first_name' => $this->workerRelative?->first_name,
                'middle_name' => $this->workerRelative?->middle_name,
                'birthday' => $this->workerRelative?->birthday,
            ],
            'level' => $this->level,
            'number' => $this->number,
            'from' => $this->from,
            'to' => $this->to,
            'comment' => $this->comment,
        ];
    }
}
