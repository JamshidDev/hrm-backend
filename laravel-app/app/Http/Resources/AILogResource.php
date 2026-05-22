<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AILogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'date' => $this->date,
            'question' => $this->question,
            'created_at' => $this->created_at
        ];
    }
}
