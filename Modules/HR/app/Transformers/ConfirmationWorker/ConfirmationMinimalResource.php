<?php

namespace Modules\HR\Transformers\ConfirmationWorker;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;

class ConfirmationMinimalResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id'       => $this->id,
            'worker'   => new WorkerMinimalResource($this->worker),
            'position' => $this->position
        ];
    }
}
