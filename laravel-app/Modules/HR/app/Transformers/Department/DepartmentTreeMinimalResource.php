<?php

namespace Modules\HR\Transformers\Department;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\DepartmentLevelEnum;

class DepartmentTreeMinimalResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'level' => [
                'id' => $this->level,
                'name' => DepartmentLevelEnum::get($this->level)
            ],
            'children' => self::collection($this->children)
        ];
    }
}
