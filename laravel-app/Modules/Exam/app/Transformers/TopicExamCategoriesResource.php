<?php

namespace Modules\Exam\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TopicExamCategoriesResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id'       => $this->id,
            'category' => new ExamCategoryMinResource($this->category),
            'count'    => $this->count
        ];
    }
}
