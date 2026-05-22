<?php

namespace Modules\Confirmation\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Confirmation\Enums\ConfirmationTypeEnum;
use Modules\Structure\Transformers\Report\ReportIndexResource;

class ReportConfirmationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'report' => new ReportIndexResource($this->report),
            'status' => [
                'id' => $this->status,
                'name' => ConfirmationStatusEnum::tryFrom($this->status)?->label()
            ],
            'position' => $this->position,
            'confirmation_type' => [
                'id' => $this->confirmation_type,
                'name' => ConfirmationTypeEnum::tryFrom($this->confirmation_type)?->label()
            ],
            "main" => $this->main,
            'generate' => $this->report->generate
        ];
    }
}
