<?php

namespace Modules\HR\Transformers\Worker;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LanguageResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
        ];
    }
}
