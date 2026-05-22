<?php

namespace Modules\Turnstile\Transformers\WorkerSchedule;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ScheduleGroupResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $name = ' (' . $this->start_date . '**' . $this->end_date . ')';
        return [
            'id' => $this->id,
            'name' => $name,
            'workers_count' => $this->workers_count,
            'start_date' => $this->start_date,
            'end_date' => $this->end_date,
            'schedule_type' => new ScheduleTypeMinResource($this->schedule_type),
            'created_at' => $this->created_at->format('d-m-Y H:i:s')
        ];
    }
}
