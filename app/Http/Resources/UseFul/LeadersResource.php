<?php

namespace App\Http\Resources\UseFul;

use App\Helpers\PositionHelper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;
class LeadersResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'worker' => new WorkerMinimalResource($this->worker_position->worker),
            'position_short_name' => PositionHelper::getShortPosition($this->worker_position),
            'position_full_name' => PositionHelper::getFullPosition($this->worker_position),
            'phones' => $this->phones
        ];
    }
}
