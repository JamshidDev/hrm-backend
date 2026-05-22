<?php

namespace Modules\HR\Transformers\DisciplinaryAction;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\WorkerPosition\WorkerPositionMinimalResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class DisciplinaryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'organization'    => new OrganizationListResource($this->organization),
            'worker_position' => new WorkerPositionMinimalResource($this->worker_position),
            'date'            => $this->date,
            'fine'            => $this->fine,
            'fine_type'       => $this->fine_type,
            'reason'          => $this->reason,
            'number'          => $this->number
        ];
    }
}
