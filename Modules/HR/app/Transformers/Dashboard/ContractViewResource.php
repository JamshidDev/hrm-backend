<?php

namespace Modules\HR\Transformers\Dashboard;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\ContractTypeEnum;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class ContractViewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'worker' => new WorkerMinimalResource($this->worker),
            'organization' => new OrganizationListResource($this->organization),
            'type' => ContractTypeEnum::get($this->type),
            'from' => $this->contract_date,
            'to' => $this->contract_to_date,
            'status' => [
                'id' => $this->status,
                'name' => PositionStatusEnum::get($this->status)
            ],
        ];
    }
}
