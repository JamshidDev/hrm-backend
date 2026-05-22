<?php

namespace App\Http\Resources\User;

use App\Helpers\PositionHelper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Worker\WorkerUserResource;

class UserWorkerPositionResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id'     => $this->id,
            'worker' => new WorkerUserResource($this->worker),
            'position' => PositionHelper::getShortPosition($this->worker?->position),
        ];
    }
}
