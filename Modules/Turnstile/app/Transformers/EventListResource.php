<?php

namespace Modules\Turnstile\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;

class EventListResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'worker' => new WorkerMinimalResource($this->worker),
            'event_date_and_time' => $this->event_date_and_time,
            'auth_type' => $this->auth_type,
            'device' => $this->device_name,
            'direction' => $this->direction,
            'mask_status' => $this->mask_status,
            'temperature' => $this->temperature
        ];
    }
}
