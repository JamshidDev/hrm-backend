<?php

namespace Modules\Turnstile\Transformers\Preview;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DevicesResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->worker_id,
            'area_name' => $this->name,
            'status' => $this->status ? 1 : 2,
            'organization_name' => $this->organization?->name,
            'serial_number' => $this->serial_number ?? ''
        ];
    }
}
