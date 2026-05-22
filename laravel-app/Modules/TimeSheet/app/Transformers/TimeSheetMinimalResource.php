<?php

namespace Modules\TimeSheet\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\HR\Transformers\Department\DepartmentParentResource;

class TimeSheetMinimalResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'year'         => $this->year,
            'month'        => $this->month,
            'confirmation' => [
                'id'   => $this->confirmation,
                'name' => ConfirmationStatusEnum::tryFrom($this->confirmation)?->label()
            ]
        ];
    }
}
