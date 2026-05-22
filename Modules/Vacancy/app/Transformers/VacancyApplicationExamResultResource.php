<?php

namespace Modules\Vacancy\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Exam\Transformers\TopicOptionResource;

class VacancyApplicationExamResultResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'question' => $this->question,
            'answers' => TopicOptionResource::collection(
                json_decode($this->answers, false, 512, JSON_THROW_ON_ERROR)
            ),
            'result' => $this->result
        ];
    }
}
