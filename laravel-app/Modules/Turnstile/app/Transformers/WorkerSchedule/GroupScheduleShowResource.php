<?php

namespace Modules\Turnstile\Transformers\WorkerSchedule;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GroupScheduleShowResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'worker_id' => $this->worker_id,
            'last_name' => $this->last_name,
            'first_name' => $this->first_name,
            'middle_name' => $this->middle_name,
            'photo' => Helper::fileUrl($this->photo),
            'worker_position_id' => $this->worker_position_id,
            'position_name' => $this->position_name,
            'department_name' => $this->department_name,
            'organization_name' => $this->organization_name,
            'days' => $this->days
        ];
    }
}
