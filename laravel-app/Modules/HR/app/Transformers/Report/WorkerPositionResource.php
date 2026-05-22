<?php

namespace Modules\HR\Transformers\Report;

use App\Helpers\PositionHelper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\ContractTypeEnum;
use Modules\HR\Transformers\Worker\WorkerUuidResource;

class WorkerPositionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'        => $this->id,
            'worker'    => new WorkerUuidResource($this->worker),
            'post_name' => PositionHelper::getShortPosition($this),
            'rate' => $this->rate,
            'rank'      => $this->rank,
            'group'     => $this->group,
            'position_date' => $this->position_date,
            'type' => [
                'id' => $this->type,
                'name' => ContractTypeEnum::tryFrom($this->type)?->label()
            ]
        ];
    }
}
