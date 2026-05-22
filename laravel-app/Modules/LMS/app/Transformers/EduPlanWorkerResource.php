<?php

namespace Modules\LMS\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\LMS\Enums\ListenerStatusEnum;

class EduPlanWorkerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'learning_center' => new LearningCenterResource($this->learning_center),
            'edu_plan' => new EduPlanSpecializationResource($this->edu_plan),
            'status' => [
                'id' => $this->status,
                'name' => ListenerStatusEnum::get($this->status)
            ],
            'group' => new GroupResource($this->group, $this->learning_center)
        ];
    }
}
