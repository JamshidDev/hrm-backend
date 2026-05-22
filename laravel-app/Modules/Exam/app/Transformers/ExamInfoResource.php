<?php

namespace Modules\Exam\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Exam\Enums\ExamWhomEnum;

class ExamInfoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'deadline' => $this->deadline,
            'variant' => $this->variant,
            'minute' => $this->minute,
            'tests_count' => $this->tests_count,
            'chances' => $this->chances,
            'active' => $this->active,
            'description' => $this->description,
            'camera' => $this->camera
        ];
    }
}
