<?php

namespace Modules\Exam\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkerExamQuestionsResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'question' => $this->question,
            'answers' => AnswersResource::collection(
                json_decode($this->answers, false, 512, JSON_THROW_ON_ERROR)
            ),
            'result' => $this->result
        ];
    }
}
