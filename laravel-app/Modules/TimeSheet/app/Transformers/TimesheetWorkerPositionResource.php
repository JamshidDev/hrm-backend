<?php

namespace Modules\TimeSheet\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;

class TimesheetWorkerPositionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'        => $this->id,
            'worker'    => new WorkerMinimalResource($this->worker),
            'post_name' => $this->post_name
        ];
    }
}
