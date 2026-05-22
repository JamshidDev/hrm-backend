<?php

namespace Modules\Structure\Transformers\Structure;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\SchedulesEnum;

class ScheduleResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'name_ru' => $this->name_ru,
            'type' => [
                'id' => $this->type,
                'name' => SchedulesEnum::get($this->type)
            ],
            'work_days' => WorkDayInfoResource::collection($this->work_days)
        ];
    }
}
