<?php

namespace Modules\HR\Transformers\DepartmentPosition;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Structure\Transformers\Position\PositionMinimalResource;

class DepartmentPositionMinResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'position' => new PositionMinimalResource($this->position)
        ];
    }
}
