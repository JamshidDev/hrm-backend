<?php

namespace Modules\Confirmation\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Confirmation\Enums\ConfirmationTypeEnum;
use Modules\HR\Transformers\WorkerApplication\WorkerApplicationResource;

class ApplicationConfirmationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                 => $this->id,
            'worker_application' => new WorkerApplicationResource($this->worker_application),
            'status'             => [
                'id'   => $this->status,
                'name' => ConfirmationStatusEnum::get($this->status)
            ],
            'position'           => $this->position,
            'confirmation_type'  => [
                'id'   => $this->confirmation_type,
                'name' => ConfirmationTypeEnum::get($this->confirmation_type)
            ],
            "main"               => $this->main,
            'generate'           => $this->worker_application->generate
        ];
    }
}
