<?php

namespace Modules\HR\Transformers\BusinessTrip;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\CommandTypeEnum;
use Modules\HR\Transformers\WorkerPosition\WorkerPositionMinResource;

class BusinessTripResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'worker_position' => new WorkerPositionMinResource($this->worker_position),
            'type'            => [
                'id'   => $this->type,
                'name' => CommandTypeEnum::tryFrom($this->type)?->label(),
            ],
            'from'            => $this->from,
            'to'              => $this->to,
            'to_organization' => $this->to_organization
        ];
    }
}
