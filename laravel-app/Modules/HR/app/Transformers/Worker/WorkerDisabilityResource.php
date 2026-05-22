<?php

namespace Modules\HR\Transformers\Worker;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkerDisabilityResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'level' => $this->level,
            'number' => $this->number,
            'from' => $this->from,
            'to' => $this->to,
            'comment' => $this->comment
        ];
    }
}
