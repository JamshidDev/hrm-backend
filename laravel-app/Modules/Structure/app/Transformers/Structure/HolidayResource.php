<?php

namespace Modules\Structure\Transformers\Structure;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Structure\Enums\HolidayTypeEnum;

class HolidayResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'holiday_date' => $this->holiday_date,
            'type' => [
                'id' => $this->type,
                'name' => HolidayTypeEnum::get($this->type)
            ]
        ];
    }
}
