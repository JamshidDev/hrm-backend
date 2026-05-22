<?php

namespace Modules\Exam\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkerExamUserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'photo' => asset($this->photo),
            'last_name' => $this->last_name,
            'first_name' => $this->first_name,
            'middle_name' => $this->middle_name,
            'phone' => $this->phone
        ];
    }
}
