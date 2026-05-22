<?php

namespace Modules\Structure\Transformers\Organization;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrganizationChildResource extends JsonResource
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
            'code' => $this->code,
            'group' => $this->group,
            'children' => self::collection($this->whenLoaded('children'))
        ];
    }
}
