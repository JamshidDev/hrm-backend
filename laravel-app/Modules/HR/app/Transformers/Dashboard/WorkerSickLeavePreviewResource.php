<?php

namespace Modules\HR\Transformers\Dashboard;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\ContractTypeEnum;
use Modules\HR\Transformers\Department\DepartmentListResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;
use Modules\Structure\Transformers\Position\PositionMinimalResource;

class WorkerSickLeavePreviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'worker' => new WorkerInfoResource($this->worker),
            'organization' => new OrganizationListResource($this->workerPosition?->organization),
            'department' => new DepartmentListResource($this->workerPosition?->department),
            'position' => new PositionMinimalResource($this->workerPosition?->position),
            'contract_type' => $this->workerPosition?->type ? ContractTypeEnum::get($this->workerPosition->type) : null,
            'worker_position_id' => $this->worker_position_id,
            'from_date' => $this->from_date,
            'to_date' => $this->to_date,
            'sick' => $this->sick,
            'type' => $this->type,
        ];
    }
}
