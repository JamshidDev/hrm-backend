<?php

namespace Modules\Confirmation\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Confirmation\Enums\ConfirmationTypeEnum;
use Modules\HR\Transformers\Worker\WorkerInfoResource;

class TimesheetConfirmationResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'status'            => [
                'id'   => $this->status,
                'name' => ConfirmationStatusEnum::get($this->status)
            ],
            'order'             => $this->order,
            'worker'            => new WorkerInfoResource($this->worker),
            'position'          => $this->position,
            'confirmation_type' => [
                'id'   => $this->confirmation_type,
                'name' => ConfirmationTypeEnum::get($this->confirmation_type)
            ],
            "main"              => $this->main
        ];
    }
}
