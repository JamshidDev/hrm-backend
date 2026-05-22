<?php

namespace Modules\LMS\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Worker\WorkerSearchResource;

class SearchWorkersResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'worker' => new WorkerSearchResource($this->worker),
            'position' => $this->position?->name
        ];
    }
}
