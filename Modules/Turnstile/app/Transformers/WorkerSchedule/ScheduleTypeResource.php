<?php

namespace Modules\Turnstile\Transformers\WorkerSchedule;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Turnstile\Enums\ScheduleTypeEnum;

class ScheduleTypeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $lang = app()->getLocale();

        match ($lang) {
            'ru' => $name = $this->name_ru,
            'en' => $name = $this->name_en,
            default => $name = $this->name
        };

        return [
            'id' => $this->id,
            'name' => $name,
            'type' => [
                'id' => $this->type,
                'name' => ScheduleTypeEnum::get($this->type)
            ],
            'groups' => $this->groups_count,
            'workers' => $this->workers_count_sum,
            'days' => $this->days
        ];
    }
}
