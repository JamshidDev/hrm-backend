<?php

namespace App\Http\Resources\AI;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuestionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'question'   => $this->question,
            'answer'     => $this->answer,
            'like'       => $this->like,
            'created_at' => $this->created_at
        ];
    }
}
