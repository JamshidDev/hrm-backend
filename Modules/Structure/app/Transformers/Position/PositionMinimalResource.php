<?php

namespace Modules\Structure\Transformers\Position;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PositionMinimalResource extends JsonResource
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
            'name' => $name
        ];
    }
}
