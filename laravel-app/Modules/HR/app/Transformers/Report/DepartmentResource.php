<?php

namespace Modules\HR\Transformers\Report;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\DepartmentLevelEnum;

class DepartmentResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'level' => [
                'id' => $this->level,
                'name' => DepartmentLevelEnum::get($this->level) ?? ''
            ],
            'name_ru' => $this->name_ru,
            'name_en' => $this->name_en,
            'comment' => $this->comment,
            'parent_id' => $this->parent_id,
            'rate'      => ($this->department_rate / 100) ?? 0,
            'real_rate' => ($this->worker_rate / 100) ?? 0,
            'children' => self::collection($this->children),
        ];
    }
}
