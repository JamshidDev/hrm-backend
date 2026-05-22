<?php

namespace Modules\LMS\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EduPlanMinResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'learning_center' => new LearningCenterResource($this->learning_center),
            'specialization' => new SpecializationResource($this->specialization),
            'start_date' => $this->start_date,
            'hours' => $this->hours,
            'count_groups' => $this->count_groups,
            'count_workers' => $this->count_workers
        ];
    }
}
