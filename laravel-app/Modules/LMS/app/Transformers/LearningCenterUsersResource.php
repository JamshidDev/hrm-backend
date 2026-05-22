<?php

namespace Modules\LMS\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;

class LearningCenterUsersResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'worker' => new WorkerMinimalResource($this->worker),
            'phone' => $this->phone,
            'status' => $this->pivot->status,
        ];
    }
}
