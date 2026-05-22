<?php

namespace Modules\Integration\Transformers;

use App\Helpers\PositionHelper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Contract\ContractMinimalResource;
use Modules\HR\Transformers\Department\DepartmentListResource;
use Modules\Integration\Transformers\Position\PositionResource;
use Modules\Integration\Transformers\Position\WorkerResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class JoinWorkerPositionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                  => $this->id,
            'organization'        => new OrganizationListResource($this->organization),
            'department'          => new DepartmentListResource($this->department),
            'department_position' => new PositionResource($this->department_position),
            'post_name' => PositionHelper::getFullPosition($this),
            'worker' => new WorkerResource($this->worker),
            'position_date' => $this->position_date,
            'contract' => new ContractMinimalResource($this->contract)
        ];
    }
}
