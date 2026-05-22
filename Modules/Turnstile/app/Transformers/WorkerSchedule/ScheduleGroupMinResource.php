<?php

namespace Modules\Turnstile\Transformers\WorkerSchedule;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ScheduleGroupMinResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $name = ' (' . $this->start_date . '**' . $this->end_date . ')';
        return [
            'id' => $this->id,
            'name' => $name,
            'start_date' => $this->start_date,
            'end_date' => $this->end_date,
        ];
    }
}
