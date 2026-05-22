<?php

namespace Modules\Structure\Transformers\Report;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReportOrganizationStatResource extends JsonResource
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
            'parent_id' => $this->parent_id,
            'children' => self::collection($this->whenLoaded('children'))
        ];
    }
}
