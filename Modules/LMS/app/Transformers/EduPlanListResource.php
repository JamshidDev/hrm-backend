<?php

namespace Modules\LMS\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\LMS\Enums\EduPlanTypeEnum;

class EduPlanListResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'learning_center' => new LearningCenterResource($this->learning_center),
            'specialization' => new SpecializationResource($this->specialization),
            'subjects' => SubjectResource::collection($this->subjects),
            'type' => [
                'id' => $this->type,
                'name' => EduPlanTypeEnum::get($this->type)
            ],
            'start_date' => $this->start_date,
            'hours' => $this->hours,
            'count_groups' => $this->count_groups,
            'count_workers' => $this->count_workers,
            'workers_count' => $this->workers_count,
            'exams_count' => $this->exams_count
        ];
    }
}
