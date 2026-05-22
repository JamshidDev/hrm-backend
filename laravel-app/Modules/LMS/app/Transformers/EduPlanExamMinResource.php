<?php

namespace Modules\LMS\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EduPlanExamMinResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'exam' => [
                'id' => $this->exam?->id,
                'name' => $this->exam?->name
            ]
        ];
    }
}
