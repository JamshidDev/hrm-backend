<?php

namespace Modules\TimeSheet\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\DepartmentLevelEnum;
use Modules\HR\Transformers\Worker\WorkerUserResource;

class DepartmentUserShowResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id'    => $this->id,
            'name'  => $this->name,
            'level' => [
                'id'   => $this->level,
                'name' => DepartmentLevelEnum::get($this->level)
            ],
            'workers' => WorkerUserResource::collection($this->time_sheet_workers)
        ];
    }
}
