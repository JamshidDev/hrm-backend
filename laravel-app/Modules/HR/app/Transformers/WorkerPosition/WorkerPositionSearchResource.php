<?php

namespace Modules\HR\Transformers\WorkerPosition;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Contract\ContractMinimalResource;
use Modules\HR\Transformers\Worker\WorkerSearchResource;
use Modules\Structure\Transformers\Position\PositionMinimalResource;

class WorkerPositionSearchResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'       => $this->id,
            'worker'   => new WorkerSearchResource($this->worker),
            'contract' => new ContractMinimalResource($this->contract),
            'position' => new PositionMinimalResource($this->position)
        ];
    }
}
