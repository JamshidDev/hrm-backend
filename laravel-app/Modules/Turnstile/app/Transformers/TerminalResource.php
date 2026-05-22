<?php

namespace Modules\Turnstile\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TerminalResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'building' => new BuildingResource($this->building),
            'name' => $this->name,
            'name_ru' => $this->name_ru,
            'name_en' => $this->name_en,
            'ip_address' => $this->ip_address,
            'url' => $this->url
        ];
    }
}
