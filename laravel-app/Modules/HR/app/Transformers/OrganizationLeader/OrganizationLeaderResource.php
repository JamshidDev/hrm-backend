<?php

namespace Modules\HR\Transformers\OrganizationLeader;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\WorkerPosition\WorkerPositionMinResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class OrganizationLeaderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'organization' => new OrganizationListResource($this->organization),
            'worker_position' => new WorkerPositionMinResource($this->worker_position),
            'phone' => $this->phones
        ];
    }
}
