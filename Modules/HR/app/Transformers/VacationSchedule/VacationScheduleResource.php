<?php

namespace Modules\HR\Transformers\VacationSchedule;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class VacationScheduleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'organization'      => new OrganizationListResource($this->organization),
            'worker'            => new WorkerMinimalResource($this->worker),
            'month'             => $this->month,
        ];
    }
}
