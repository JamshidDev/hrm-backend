<?php

namespace Modules\Confirmation\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\HR\Transformers\Worker\WorkerInfoResource;

class ConfirmationWorkersResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => [
                'id' => $this->status,
                'name' => ConfirmationStatusEnum::get($this->status)
            ],
            'worker' => new WorkerInfoResource($this->worker),
            'type' => $this->type,
            'order' => $this->order,
            'position' => $this->position,
        ];
    }
}
