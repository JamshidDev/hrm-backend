<?php

namespace Modules\LMS\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;

class EduPlanAttachedWorkersResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        if ($this->certificate &&
            $this->certificate->confirmation === ConfirmationStatusEnum::SUCCESS->value){
            $certificate = new CertificateMinResource($this->certificate);
        } else {
            $certificate = null;
        }
        return [
            'id' => $this->id,
            'worker_position' => new WorkerPositionResource($this->worker_position),
            'learning_center' => new LearningCenterResource($this->learning_center),
            'edu_plan' => new EduPlanSpecializationResource($this->edu_plan),
            'certificate' => $certificate
        ];
    }
}
