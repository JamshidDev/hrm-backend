<?php

namespace Modules\LMS\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Exam\Enums\ExamWhomEnum;
use Modules\Exam\Transformers\TopicMinResource;

class ExamResource extends JsonResource
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
            'deadline' => $this->deadline,
            'variant' => $this->variant,
            'minute' => $this->minute,
            'tests_count' => $this->tests_count,
            'chances' => $this->chances,
            'active' => $this->active,
            'description' => $this->description
        ];
    }
}
