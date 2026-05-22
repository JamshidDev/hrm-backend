<?php

namespace Modules\Exam\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExamWithTopicResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'topic' => new TopicMinResource($this->topic)
        ];
    }
}
