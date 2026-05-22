<?php

namespace Modules\Exam\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TopicOptionResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id'  => $this->id,
            'text' => $this->text,
            'is_correct' => $this->is_correct
        ];
    }
}
