<?php

namespace Modules\HR\Transformers\WorkerPosition;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PositionDepOrgResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'department' => $this->department?->name,
            'organization' => $this->organization?->name
        ];
    }
}
