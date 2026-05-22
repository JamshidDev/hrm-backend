<?php

namespace Modules\Turnstile\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;

class UserDevicesResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $worker = $this->worker;
        return [
            'id' => $this->id,
            'worker' => new WorkerMinimalResource($worker),
            'devices_count' => $this->hcp_devices_count,
        ];
    }
}
