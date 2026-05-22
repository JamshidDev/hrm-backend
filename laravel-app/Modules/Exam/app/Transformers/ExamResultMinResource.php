<?php

namespace Modules\Exam\Transformers;

use DeviceDetector\DeviceDetector;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;

class ExamResultMinResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'worker' => new WorkerMinimalResource($this->worker),
            'created' => $this->created,
            'ended' => $this->ended,
            'result' => $this->result,
            'ip_address' => $this->ip_address
        ];
    }
}
