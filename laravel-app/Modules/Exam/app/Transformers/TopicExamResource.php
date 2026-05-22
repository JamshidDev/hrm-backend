<?php

namespace Modules\Exam\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Exam\Enums\ExamWhomEnum;

class TopicExamResource extends JsonResource
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
            'topic' => new TopicMinResource($this->topic),
            'results' => ExamResultMinimalResource::collection($this->results),
            'deadline' => $this->deadline,
            'variant' => $this->variant,
            'tests_count' => $this->tests_count,
            'active' => $this->active,
            'minute' => $this->minute,
            'chances' => $this->chances,
            'description' => $this->description,
            'camera' => $this->camera
        ];
    }
}
