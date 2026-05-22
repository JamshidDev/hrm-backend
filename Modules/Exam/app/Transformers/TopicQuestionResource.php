<?php

namespace Modules\Exam\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TopicQuestionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'  => $this->id,
            'ques' => $this->ques,
            'exam_category' => new ExamCategoryResource($this->exam_category),
            'options' => TopicOptionResource::collection($this->options)
        ];
    }
}
