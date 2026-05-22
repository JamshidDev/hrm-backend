<?php

namespace Modules\HR\Transformers\Worker;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkerSickLeaveResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'worker_position_id' => $this->worker_position_id,
            'from_date' => $this->from_date,
            'to_date' => $this->to_date,
            'sick' => $this->sick,
            'type' => $this->type,
        ];
    }
}
