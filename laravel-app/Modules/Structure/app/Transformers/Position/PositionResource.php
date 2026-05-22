<?php

namespace Modules\Structure\Transformers\Position;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PositionResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'name_ru' => $this->name_ru,
            'classification_index' => $this->classification_index,
            'classification_code' => $this->classification_code
        ];
    }
}
