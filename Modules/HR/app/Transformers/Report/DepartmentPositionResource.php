<?php

namespace Modules\HR\Transformers\Report;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Economist\Enums\ChangedStatusEnum;
use Modules\Economist\Enums\ConfirmStatusEnum;
use Modules\Structure\Transformers\Position\PositionMinimalResource;

class DepartmentPositionResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id'        => $this->id,
            'position'  => new PositionMinimalResource($this->position),
            'rate'      => $this->rate,
            'real_rate' => ($this->worker_rate / 100) ?? 0,
            'status' => [
                'id' => $this->status,
                'name' => ConfirmStatusEnum::get($this->status)
            ],
            'changed_status' => [
                'id' => $this->changed_status,
                'name' => ChangedStatusEnum::get($this->changed_status)
            ]
        ];
    }
}
