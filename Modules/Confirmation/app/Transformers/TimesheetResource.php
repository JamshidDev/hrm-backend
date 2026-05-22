<?php

namespace Modules\Confirmation\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;

class TimesheetResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'        => $this->id,
            'timesheet' => new TimesheetDetailResource($this->timesheet),
            'status'    => [
                'id'   => $this->status,
                'name' => ConfirmationStatusEnum::get($this->status)
            ]
        ];
    }
}
