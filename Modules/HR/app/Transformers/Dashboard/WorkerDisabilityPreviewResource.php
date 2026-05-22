<?php

namespace Modules\HR\Transformers\Dashboard;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\ContractTypeEnum;
use Modules\HR\Transformers\Department\DepartmentListResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;
use Modules\Structure\Transformers\Position\PositionMinimalResource;

class WorkerDisabilityPreviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $workerPosition = $this->worker?->position;

        return [
            'id' => $this->id,
            'worker' => new WorkerInfoResource($this->worker),
            'organization' => new OrganizationListResource($workerPosition?->organization),
            'department' => new DepartmentListResource($workerPosition?->department),
            'position' => new PositionMinimalResource($workerPosition?->position),
            'contract_type' => $workerPosition?->type ? ContractTypeEnum::get($workerPosition->type) : null,
            'level' => $this->level,
            'number' => $this->number,
            'from' => $this->from,
            'to' => $this->to,
            'comment' => $this->comment,
        ];
    }
}
