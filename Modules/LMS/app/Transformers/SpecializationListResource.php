<?php

namespace Modules\LMS\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SpecializationListResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'direction' => new DirectionResource($this->direction),
            'name_ru' => $this->name_ru,
            'name_en' => $this->name_en,
            'positions_count' => $this->positions_count
        ];
    }
}
