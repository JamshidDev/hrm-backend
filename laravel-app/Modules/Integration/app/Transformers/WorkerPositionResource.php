<?php

namespace Modules\Integration\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Structure\Transformers\Position\PositionMinimalResource;

class WorkerPositionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'department' => new DepartmentResource($this->department),
            'position' => new PositionMinimalResource($this->position)
        ];
    }
}
