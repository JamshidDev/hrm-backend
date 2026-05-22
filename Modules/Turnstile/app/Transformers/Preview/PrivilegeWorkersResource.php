<?php

namespace Modules\Turnstile\Transformers\Preview;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PrivilegeWorkersResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $worker = $this->worker;
        return [
            'id' => $this->id,
            'last_name' => $worker->last_name,
            'first_name' => $worker->first_name,
            'middle_name' => $worker->middle_name,
            'photo' => Helper::fileUrl($worker->photo),
            'organization_name' => $this->organization?->name,
            'department_name' => $this->department?->name,
            'position_name' => $this->position?->name,
            'start_minute' => $this->turnstile_privilege_start_minute,
            'end_minute' => $this->turnstile_privilege_end_minute
        ];
    }
}
