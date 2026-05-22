<?php

namespace Modules\HR\Transformers\Med;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Enums\MedStatusEnum;

class WorkerMedResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'      => $this->id,
            'status'  => [
                'id'   => $this->status,
                'name' => MedStatusEnum::get($this->status)
            ],
            'from'    => $this->from,
            'to'      => $this->to,
            'comment' => $this->comment,
            'current' => $this->current
        ];
    }
}
