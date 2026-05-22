<?php

namespace Modules\Integration\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\ContractTypeEnum;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class ContractResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'number'            => $this->number,
            'worker'            => new WorkerMinimalResource($this->worker),
            'organization'      => new OrganizationListResource($this->organization),
            'contract_date'     => $this->contract_date,
            'contract_to_date'     => $this->contract_to_date,
            'last_position' => new WorkerPositionResource($this->last_position),
            'type'              => [
                'id'   => $this->type,
                'name' => ContractTypeEnum::get($this->type)
            ],
            'status'            => [
                'id'   => $this->status,
                'name' => PositionStatusEnum::get($this->status)
            ]
        ];
    }
}
