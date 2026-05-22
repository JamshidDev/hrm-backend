<?php

namespace Modules\Structure\Transformers\Structure;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Structure\Enums\WorkDayTypeEnum;

class WorkDayResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'schedule' => new ScheduleResource($this->schedule),
            'start_time' => $this->start_time,
            'end_time' => $this->end_time,
            'type' => [
                'id' => $this->type,
                'name' => WorkDayTypeEnum::get($this->type)
            ],
            'day_of_week' => $this->day_of_week
        ];
    }
}
