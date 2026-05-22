<?php

namespace Modules\Integration\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\ContractTypeEnum;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;
use Modules\Structure\Transformers\Position\PositionMinimalResource;

class StationWorkerPositionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'worker' => new WorkerMinimalResource($this->worker),
            'type' => [
                'id' => $this->type,
                'name' => ContractTypeEnum::get($this->type)
            ],
            'position' => new PositionMinimalResource($this->position),
            'position_date' => $this->position_date,
            'group' => $this->group,
            'rank' => $this->rank,
            'rate' => $this->rate
        ];
    }
}
