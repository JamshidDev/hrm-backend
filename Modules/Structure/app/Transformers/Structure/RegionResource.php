<?php

namespace Modules\Structure\Transformers\Structure;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RegionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'country' => new CountryResource($this->country),
            'name' => $this->name,
            'name_ru' => $this->name_ru,
            'name_en' => $this->name_en,
            'lat' => $this->lat,
            'long' => $this->long
        ];
    }
}
