<?php

namespace Modules\Exam\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Exam\Enums\ExamWhomEnum;
use Modules\HR\Transformers\WorkerPosition\WorkerPositionOnlyResource;

class ExamWorkerPositionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'whom' => [
                'id' => $this->whom,
                'name' => ExamWhomEnum::get($this->whom),
            ],
            'deadline' => $this->deadline,
            'variant' => $this->variant,
            'minute' => $this->minute,
            'tests_count' => $this->tests_count,
            'chances' => $this->chances,
            'active' => $this->active,
            'workers' => WorkerPositionOnlyResource::collection($this->worker_positions),
            'camera' => $this->camera
        ];
    }
}
