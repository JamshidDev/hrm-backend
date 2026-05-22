<?php

namespace Modules\Turnstile\Transformers\Preview;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CasualWorkersResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $worker = $this->worker;
        $worker_position = $this->worker_position;
        return [
            'id' => $this->id,
            'last_name' => $worker->last_name,
            'first_name' => $worker->first_name,
            'middle_name' => $worker->middle_name,
            'photo' => Helper::fileUrl($worker->photo),
            'organization_name' => $worker_position?->organization?->name,
            'department_name' => $worker_position?->department?->name,
            'position_name' => $worker_position?->position?->name
        ];
    }
}
