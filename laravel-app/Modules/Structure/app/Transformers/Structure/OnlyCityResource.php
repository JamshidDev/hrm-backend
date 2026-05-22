<?php

namespace Modules\Structure\Transformers\Structure;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OnlyCityResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name
        ];
    }
}
