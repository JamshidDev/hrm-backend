<?php

namespace Modules\Structure\Transformers\Structure;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Structure\Enums\WorkDayTypeEnum;

class WorkDayInfoResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
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
