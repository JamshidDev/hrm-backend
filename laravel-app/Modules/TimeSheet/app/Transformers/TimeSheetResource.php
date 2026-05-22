<?php

namespace Modules\TimeSheet\Transformers;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\HR\Transformers\Department\DepartmentParentResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class TimeSheetResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'department'        => new DepartmentParentResource($this->department),
            'work_place'        => new OrganizationListResource($this->work_place),
            'year'              => $this->year,
            'month'             => $this->month,
            'status'            => $this->status,
            'confirmation_file' => Helper::fileUrl($this->confirmation_file),
            'confirmation'      => [
                'id'   => $this->confirmation,
                'name' => ConfirmationStatusEnum::tryFrom($this->confirmation)?->label()
            ],
            'workers_count'     => $this->workers_count
        ];
    }
}
