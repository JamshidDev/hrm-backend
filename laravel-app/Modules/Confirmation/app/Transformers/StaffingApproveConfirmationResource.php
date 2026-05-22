<?php

namespace Modules\Confirmation\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Confirmation\Enums\ConfirmationTypeEnum;
use Modules\Economist\Transformers\StaffingApprove\ApproveIndexResource;

class StaffingApproveConfirmationResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'staffing_approve' => new ApproveIndexResource($this->staffing_approve),
            'status'            => [
                'id'   => $this->status,
                'name' => ConfirmationStatusEnum::tryFrom($this->status)?->label()
            ],
            'position'          => $this->position,
            'confirmation_type' => [
                'id'   => $this->confirmation_type,
                'name' => ConfirmationTypeEnum::tryFrom($this->confirmation_type)?->label()
            ],
            "main"              => $this->main,
            'generate' => $this->staffing_approve?->generate
        ];
    }
}
