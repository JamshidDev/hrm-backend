<?php

namespace Modules\Exam\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Exam\Enums\ExamWhomEnum;

class WorkerExamResource extends JsonResource
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
            'results' => WorkerExamResultResource::collection($this->results),
            'deadline' => $this->deadline,
            'variant' => $this->variant,
            'active' => $this->active,
            'minute' => $this->minute,
            'chances' => $this->chances,
            'questions_count' => $this->exam_tests->sum('count'),
            'description' => $this->description,
            'camera' => $this->camera
        ];
    }
}
