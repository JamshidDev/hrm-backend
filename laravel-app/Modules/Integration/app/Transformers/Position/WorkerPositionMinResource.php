<?php

namespace Modules\Integration\Transformers\Position;

use App\Helpers\PositionHelper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Department\DepartmentListResource;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;
use Modules\HR\Transformers\Worker\WorkerPhonesResource;

class WorkerPositionMinResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id'                  => $this->id,
            'department'          => new DepartmentListResource($this->department),
            'post_name' => PositionHelper::getFullPosition($this),
            'worker' => new WorkerMinimalResource($this->worker),
            'phones' => WorkerPhonesResource::collection($this->worker?->phones),
            'position_date' => $this->position_date
        ];
    }
}
