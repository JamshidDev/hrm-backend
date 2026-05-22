<?php

namespace Modules\HR\Transformers\Report;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StructureResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'group' => $this->group,
            'rate'      => ($this->department_rate / 100) ?? 0,
            'real_rate' => ($this->worker_rate / 100) ?? 0,
            'children' => self::collection($this->whenLoaded('children')),
        ];
    }
}
