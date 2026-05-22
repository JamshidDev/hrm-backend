<?php

namespace Modules\LMS\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Structure\Transformers\Position\PositionMinimalResource;

class SpecializationShowResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'name_ru' => $this->name_ru,
            'name_en' => $this->name_en,
            'direction' => new DirectionResource($this->direction),
            'positions' => PositionMinimalResource::collection($this->positions)
        ];
    }
}
