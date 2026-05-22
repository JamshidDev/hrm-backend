<?php

namespace Modules\Turnstile\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\WorkerPosition\WorkerPositionMinResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class TurnstileWorkerApproveResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'organization' => new OrganizationListResource($this->organization),
            'receiver_organization' => new OrganizationListResource($this->receiver_organization),
            'worker_positions' => WorkerPositionMinResource::collection($this->worker_positions),
            'access_levels' => AccessLevelMinResource::collection($this->access_levels)
        ];
    }
}
